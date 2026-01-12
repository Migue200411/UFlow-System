import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  AppContextType, AppState, Theme, Language, Currency, ViewState, 
  Transaction, Account, Debt, Goal, UserProfile 
} from '../types';
import { DEMO_ACCOUNTS, DEMO_BUDGETS, DEMO_DEBTS, DEMO_GOALS, DEMO_TRANSACTIONS, TRANSLATIONS } from '../constants';
import { generateId } from '../utils';
import { auth, db, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  user: null,
  isLoading: true,
  theme: 'dark',
  language: 'en',
  currencyBase: 'COP',
  privacyMode: false,
  showCents: false,
  reduceMotion: false,
  accounts: DEMO_ACCOUNTS,
  transactions: DEMO_TRANSACTIONS,
  debts: DEMO_DEBTS,
  goals: DEMO_GOALS,
  budgets: DEMO_BUDGETS,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Toast Helper
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Auth & Profile Sync ---

  // Sync user profile settings to Firestore
  const syncProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) return;
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, updates);
    } catch (e) {
      console.error("Failed to sync profile", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch Profile from Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setState(prev => ({
              ...prev,
              user: profile,
              theme: profile.theme,
              language: profile.language,
              currencyBase: profile.currencyBase,
              privacyMode: profile.privacyMode,
              showCents: profile.showCents,
              reduceMotion: profile.reduceMotion,
              isLoading: false
            }));
          } else {
            // New User or First Google Login -> Create Profile in Firestore
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              theme: 'dark',
              language: 'en',
              currencyBase: 'COP',
              privacyMode: false,
              showCents: false,
              reduceMotion: false,
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
            setState(prev => ({ ...prev, user: newProfile, isLoading: false }));
          }
        } catch (e) {
          console.error("Profile load error", e);
          setState(prev => ({ ...prev, isLoading: false }));
          addToast("Error syncing profile. Using local mode.", "error");
        }
      } else {
        // Logged Out
        setState(prev => ({ ...prev, user: null, isLoading: false }));
      }
    });

    return () => unsubscribe();
  }, [addToast]);

  // Apply theme class to body whenever it changes in state
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // Auth Actions
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      addToast("Access Granted", "success");
    } catch (e: any) {
      console.error(e);
      let msg = "Authentication failed";
      if (e.code === 'auth/invalid-email') msg = "Invalid email format";
      if (e.code === 'auth/user-not-found') msg = "User ID not found";
      if (e.code === 'auth/wrong-password') msg = "Incorrect security credential";
      if (e.code === 'auth/invalid-credential') msg = "Invalid credentials";
      addToast(msg, "error");
      throw e;
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      // Note: onAuthStateChanged will handle the Firestore profile creation
      addToast("Identity Created. System Access Granted.", "success");
    } catch (e: any) {
      let msg = "Registration failed";
      if (e.code === 'auth/email-already-in-use') msg = "Email already associated with an identity";
      if (e.code === 'auth/weak-password') msg = "Password does not meet security standards";
      addToast(msg, "error");
      throw e;
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Biometric/External Identity Verified", "success");
    } catch (e) {
      addToast("External Authentication Failed", "error");
    }
  };

  const logout = async () => {
    await signOut(auth);
    addToast("Session Terminated", "info");
    setState(prev => ({ ...prev, user: null }));
  };

  // --- Data Actions (Local state updates + Profile Sync) ---

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
    
    // Check if the update contains profile settings that need syncing
    const profileKeys: (keyof UserProfile)[] = ['theme', 'language', 'currencyBase', 'privacyMode', 'showCents', 'reduceMotion'];
    const profileUpdates: Partial<UserProfile> = {};
    let hasProfileUpdate = false;
    
    Object.keys(updates).forEach(key => {
        if (profileKeys.includes(key as keyof UserProfile)) {
            (profileUpdates as any)[key] = (updates as any)[key];
            hasProfileUpdate = true;
        }
    });

    if (hasProfileUpdate && state.user) {
        syncProfile(profileUpdates);
    }
  };

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    addToast('Transaction recorded', 'success');
  }, [addToast]);

  const addAccount = useCallback((acc: Omit<Account, 'id'>) => {
    const newAcc = { ...acc, id: generateId() };
    setState(prev => ({ ...prev, accounts: [...prev.accounts, newAcc] }));
    addToast('Account created', 'success');
  }, [addToast]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'payments' | 'createdAt'>) => {
    const newDebt: Debt = {
      ...debt,
      id: generateId(),
      payments: [],
      createdAt: new Date().toISOString()
    };
    setState(prev => ({ ...prev, debts: [...prev.debts, newDebt] }));
    addToast('Debt record added', 'success');
  }, [addToast]);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = { ...goal, id: generateId() };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    addToast('Goal set', 'success');
  }, [addToast]);

  const updateGoal = useCallback((id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)
    }));
    addToast('Goal updated', 'success');
  }, [addToast]);

  const payDebt = useCallback((id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      debts: prev.debts.map(d => {
        if (d.id !== id) return d;
        const newPayments = [...d.payments, { id: generateId(), amount, date: new Date().toISOString() }];
        const totalPaid = newPayments.reduce((acc, p) => acc + p.amount, 0);
        const status = totalPaid >= d.totalAmount ? 'paid' : 'partial';
        return { ...d, payments: newPayments, status };
      })
    }));
    addToast('Payment recorded', 'success');
  }, [addToast]);

  const resetData = useCallback(() => {
    localStorage.removeItem('uflow_data_v1');
    setState(prev => ({ ...prev, accounts: DEMO_ACCOUNTS, transactions: DEMO_TRANSACTIONS, debts: DEMO_DEBTS, goals: DEMO_GOALS }));
    window.location.reload();
  }, []);

  const t = useCallback((key: string) => {
    const dict = TRANSLATIONS[state.language] || TRANSLATIONS.en;
    return (dict as any)[key] || key;
  }, [state.language]);

  const value = {
    ...state,
    login,
    register,
    loginWithGoogle,
    logout,
    setTheme: (theme: Theme) => updateState({ theme }),
    setLanguage: (language: Language) => updateState({ language }),
    setCurrencyBase: (currencyBase: Currency) => updateState({ currencyBase }),
    togglePrivacy: () => updateState({ privacyMode: !state.privacyMode }),
    toggleShowCents: () => updateState({ showCents: !state.showCents }),
    toggleReduceMotion: () => updateState({ reduceMotion: !state.reduceMotion }),
    setView: setCurrentView,
    currentView,
    addTransaction,
    addAccount,
    addDebt,
    addGoal,
    updateGoal,
    payDebt,
    resetData,
    t,
    addToast,
    removeToast,
    toasts
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
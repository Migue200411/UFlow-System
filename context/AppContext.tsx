import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  AppContextType, AppState, Theme, Language, Currency, ViewState, 
  Transaction, Account, Debt, Goal, UserProfile 
} from '../types';
import { DEMO_ACCOUNTS, DEMO_BUDGETS, DEMO_DEBTS, DEMO_GOALS, DEMO_TRANSACTIONS, TRANSLATIONS } from '../constants';
import { generateId } from '../utils';
import { auth, db, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  user: null,
  isLoading: true, // Gate closed by default
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
  const [currentView, setCurrentViewState] = useState<ViewState>('dashboard');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  
  // Ref to prevent double-initialization logic
  const isAuthCheckComplete = useRef(false);

  // --- View Navigation & Persistence ---
  const setCurrentView = useCallback((view: ViewState) => {
    setCurrentViewState(view);
    // Persist path for "ReturnTo" functionality
    try {
      localStorage.setItem('uflow_last_view', view);
    } catch (e) { /* ignore */ }
  }, []);

  // --- Toast System ---
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

  // --- Core Auth Logic (Non-blocking) ---

  // 1. Load Profile Background Task
  const loadFullUserProfile = async (uid: string, baseUser: User) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        // Merge profile settings into state without disrupting user flow
        setState(prev => ({
          ...prev,
          user: profile,
          theme: profile.theme,
          language: profile.language,
          currencyBase: profile.currencyBase,
          privacyMode: profile.privacyMode,
          showCents: profile.showCents,
          reduceMotion: profile.reduceMotion,
        }));
      } else {
        // First time setup - Create Profile in Background
        const newProfile: UserProfile = {
          uid: uid,
          email: baseUser.email,
          displayName: baseUser.displayName,
          photoURL: baseUser.photoURL,
          theme: 'dark',
          language: 'en',
          currencyBase: 'COP',
          privacyMode: false,
          showCents: false,
          reduceMotion: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setState(prev => ({ ...prev, user: newProfile }));
      }
    } catch (e) {
      console.warn("Background profile sync failed:", e);
      // We don't block the UI here, just log it. The user already has access via the basic object.
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // --- AUTH SUCCESS ---
        
        // 1. Optimistic UI Update: Allow access IMMEDIATELY using basic firebase data
        // We do NOT wait for Firestore here. This fixes the "stuck on loading" bug.
        const basicProfile: UserProfile = {
           uid: firebaseUser.uid,
           email: firebaseUser.email,
           displayName: firebaseUser.displayName,
           photoURL: firebaseUser.photoURL,
           theme: 'dark', // Defaults
           language: 'en',
           currencyBase: 'COP',
           privacyMode: false,
           showCents: false,
           reduceMotion: false,
        };

        setState(prev => ({ 
          ...prev, 
          user: prev.user?.uid === firebaseUser.uid ? prev.user : basicProfile, // Keep existing if same user to avoid flicker
          isLoading: false 
        }));

        // 2. Handle Redirection (ReturnTo Logic)
        if (!isAuthCheckComplete.current) {
           const lastView = localStorage.getItem('uflow_last_view') as ViewState;
           if (lastView && ['dashboard','history','analytics','accounts','debts','goals','settings'].includes(lastView)) {
             setCurrentViewState(lastView);
           } else {
             setCurrentViewState('dashboard');
           }
           isAuthCheckComplete.current = true;
        }

        // 3. Hydrate Full Profile (Background)
        loadFullUserProfile(firebaseUser.uid, firebaseUser);

      } else {
        // --- LOGGED OUT ---
        localStorage.removeItem('uflow_last_view');
        setState(prev => ({ ...prev, user: null, isLoading: false }));
        setCurrentViewState('dashboard'); // Reset internal router
        isAuthCheckComplete.current = true;
      }
    });

    return () => unsubscribe();
  }, []);

  // Apply theme side-effect
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // --- Actions ---

  const syncProfileSetting = async (updates: Partial<UserProfile>) => {
    if (!state.user) return;
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, updates);
    } catch (e) { /* silent fail */ }
  };

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
    
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
        syncProfileSetting(profileUpdates);
    }
  };

  const login = async (email: string, pass: string) => {
    // We let onAuthStateChanged handle the state update. We just trigger the action.
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      addToast("Credentials Accepted", "success");
    } catch (e: any) {
      throw e; // AuthView handles the error display
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      addToast("Identity Generated", "success");
    } catch (e: any) {
      throw e;
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Biometric Auth Verified", "success");
    } catch (e) {
      addToast("External Auth Failed", "error");
      throw e;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('uflow_last_view');
      // State reset handled by onAuthStateChanged
      addToast("Session Ended", "info");
    } catch (e) {
      console.error(e);
    }
  };

  // --- CRUD Data Logic (Local Demo Persistence) ---
  
  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...tx, id: generateId(), createdAt: Date.now() };
    setState(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    addToast('Record Saved', 'success');
  }, [addToast]);

  const addAccount = useCallback((acc: Omit<Account, 'id'>) => {
    const newAcc = { ...acc, id: generateId() };
    setState(prev => ({ ...prev, accounts: [...prev.accounts, newAcc] }));
    addToast('Account Added', 'success');
  }, [addToast]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'payments' | 'createdAt'>) => {
    const newDebt: Debt = { ...debt, id: generateId(), payments: [], createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, debts: [...prev.debts, newDebt] }));
    addToast('Debt Logged', 'success');
  }, [addToast]);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = { ...goal, id: generateId() };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    addToast('Target Set', 'success');
  }, [addToast]);

  const updateGoal = useCallback((id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)
    }));
    addToast('Target Updated', 'success');
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
    addToast('Payment Logged', 'success');
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
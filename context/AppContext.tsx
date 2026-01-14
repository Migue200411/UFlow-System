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

// Default state serves as the "Seed" if no local data exists
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

const STORAGE_KEY = 'uflow_db_v2'; // Bump version to force fresh read/write if schema changes

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentViewState] = useState<ViewState>('dashboard');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  
  const isAuthCheckComplete = useRef(false);
  const isDataInitialized = useRef(false);

  // --- 1. PERSISTENCE LAYER ---
  // Load data from LocalStorage on Mount
  useEffect(() => {
    const loadLocalData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge stored data with initial structure to ensure type safety
          setState(prev => ({
            ...prev,
            ...parsed,
            user: prev.user, // Don't overwrite auth user from local storage blindly
            isLoading: prev.isLoading // Keep loading state separate
          }));
        }
      } catch (e) {
        console.error("Failed to load local data", e);
      }
      isDataInitialized.current = true;
    };

    if (!isDataInitialized.current) {
      loadLocalData();
    }
  }, []);

  // Save data to LocalStorage whenever critical data changes
  useEffect(() => {
    if (!state.isLoading && isDataInitialized.current) {
      const dataToSave = {
        theme: state.theme,
        language: state.language,
        currencyBase: state.currencyBase,
        privacyMode: state.privacyMode,
        showCents: state.showCents,
        reduceMotion: state.reduceMotion,
        accounts: state.accounts,
        transactions: state.transactions,
        debts: state.debts,
        goals: state.goals,
        budgets: state.budgets
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [
    state.theme, state.language, state.currencyBase, state.privacyMode, 
    state.showCents, state.reduceMotion, state.accounts, state.transactions, 
    state.debts, state.goals, state.budgets, state.isLoading
  ]);

  // --- View Navigation & ReturnTo ---
  const setCurrentView = useCallback((view: ViewState) => {
    setCurrentViewState(view);
    localStorage.setItem('uflow_last_view', view);
  }, []);

  // --- Toast System ---
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Auth Logic ---
  const loadFullUserProfile = async (uid: string, baseUser: User) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setState(prev => ({
          ...prev,
          user: profile,
          theme: profile.theme, // Sync visual settings from cloud
          language: profile.language,
          currencyBase: profile.currencyBase,
        }));
      } else {
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
      console.warn("Profile sync error", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const basicProfile: UserProfile = {
           uid: firebaseUser.uid,
           email: firebaseUser.email,
           displayName: firebaseUser.displayName,
           photoURL: firebaseUser.photoURL,
           theme: state.theme,
           language: state.language,
           currencyBase: state.currencyBase,
           privacyMode: state.privacyMode,
           showCents: state.showCents,
           reduceMotion: state.reduceMotion,
        };

        setState(prev => ({ 
          ...prev, 
          user: prev.user?.uid === firebaseUser.uid ? prev.user : basicProfile,
          isLoading: false 
        }));

        if (!isAuthCheckComplete.current) {
           const lastView = localStorage.getItem('uflow_last_view') as ViewState;
           if (lastView && ['dashboard','history','analytics','accounts','debts','goals','settings', 'ai-assistant'].includes(lastView)) {
             setCurrentViewState(lastView);
           }
           isAuthCheckComplete.current = true;
        }

        loadFullUserProfile(firebaseUser.uid, firebaseUser);

      } else {
        localStorage.removeItem('uflow_last_view');
        setState(prev => ({ ...prev, user: null, isLoading: false }));
        setCurrentViewState('dashboard');
        isAuthCheckComplete.current = true;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [state.theme]);

  // --- State Modifiers (Actions) ---
  
  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
    // Sync critical profile settings to Firestore if logged in
    const profileKeys = ['theme', 'language', 'currencyBase', 'privacyMode', 'showCents', 'reduceMotion'];
    const shouldSync = Object.keys(updates).some(k => profileKeys.includes(k));
    
    if (shouldSync && state.user) {
        const profileUpdates = {};
        Object.keys(updates).forEach(k => {
            if (profileKeys.includes(k)) (profileUpdates as any)[k] = (updates as any)[k];
        });
        const userRef = doc(db, 'users', state.user.uid);
        updateDoc(userRef, profileUpdates).catch(() => {});
    }
  };

  const login = async (email: string, pass: string) => {
    try { await signInWithEmailAndPassword(auth, email, pass); addToast("Credentials Accepted", "success"); } 
    catch (e) { throw e; }
  };

  const register = async (email: string, pass: string, name: string) => {
    try { 
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      addToast("Identity Generated", "success");
    } catch (e) { throw e; }
  };

  const loginWithGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); addToast("Biometric Auth Verified", "success"); } 
    catch (e) { addToast("Auth Failed", "error"); throw e; }
  };

  const logout = async () => {
    await signOut(auth);
    addToast("Session Ended", "info");
  };

  // --- CRUD Actions (Immutable Updates) ---

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { 
      ...tx, 
      id: generateId(), 
      createdAt: Date.now() 
    };
    setState(prev => ({ 
      ...prev, 
      transactions: [newTx, ...prev.transactions] 
    }));
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
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({ ...prev, accounts: DEMO_ACCOUNTS, transactions: DEMO_TRANSACTIONS, debts: DEMO_DEBTS, goals: DEMO_GOALS }));
    addToast('Factory Reset Complete', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }, [addToast]);

  const t = useCallback((key: string) => {
    const dict = TRANSLATIONS[state.language] || TRANSLATIONS.en;
    return (dict as any)[key] || key;
  }, [state.language]);

  const value = {
    ...state,
    login, register, loginWithGoogle, logout,
    setTheme: (theme: Theme) => updateState({ theme }),
    setLanguage: (language: Language) => updateState({ language }),
    setCurrencyBase: (currencyBase: Currency) => updateState({ currencyBase }),
    togglePrivacy: () => updateState({ privacyMode: !state.privacyMode }),
    toggleShowCents: () => updateState({ showCents: !state.showCents }),
    toggleReduceMotion: () => updateState({ reduceMotion: !state.reduceMotion }),
    setView: setCurrentView,
    currentView,
    addTransaction, addAccount, addDebt, addGoal, updateGoal, payDebt, resetData, t,
    addToast, removeToast, toasts
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
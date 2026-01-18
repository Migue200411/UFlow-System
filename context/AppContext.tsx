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

// Default state with demo data for visitors (not logged in)
const INITIAL_STATE: AppState = {
  user: null,
  isLoading: true,
  theme: 'light',
  language: 'es',
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

  const isAuthCheckComplete = useRef(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // --- 1. PERSISTENCE LAYER (FIREBASE ONLY) ---
  // Save data to Firestore whenever critical data changes (debounced)
  // Skip saving while loading user data to prevent saving demo data
  useEffect(() => {
    if (!state.isLoading && state.user?.uid && !isLoadingUserData) {
      const dataToSave = {
        accounts: state.accounts,
        transactions: state.transactions,
        debts: state.debts,
        goals: state.goals,
        budgets: state.budgets
      };

      const dataString = JSON.stringify(dataToSave);

      // Skip if data hasn't changed
      if (dataString === lastSavedDataRef.current) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save to Firebase (1 second delay)
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const dataRef = doc(db, 'users', state.user!.uid, 'appData', 'main');
          await setDoc(dataRef, dataToSave, { merge: true });
          lastSavedDataRef.current = dataString;
        } catch (e) {
          console.error('Failed to save to Firebase:', e);
        }
      }, 1000);
    }
  }, [
    state.accounts, state.transactions, state.debts, state.goals, 
    state.budgets, state.isLoading, state.user?.uid, isLoadingUserData
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

  // Load user's app data from Firestore
  const loadUserData = async (uid: string) => {
    try {
      const dataRef = doc(db, 'users', uid, 'appData', 'main');
      const dataSnap = await getDoc(dataRef);

      if (dataSnap.exists()) {
        // User has existing data in Firestore
        const data = dataSnap.data();
        setState(prev => ({
          ...prev,
          accounts: data.accounts || [],
          transactions: data.transactions || [],
          debts: data.debts || [],
          goals: data.goals || [],
          budgets: data.budgets || [],
        }));
      } else {
        // New user - start with empty data
        const emptyData = {
          accounts: [],
          transactions: [],
          debts: [],
          goals: [],
          budgets: []
        };
        setState(prev => ({
          ...prev,
          ...emptyData
        }));
        // Save empty initial state to Firestore
        await setDoc(dataRef, emptyData);
      }
    } catch (e) {
      // On error, keep current state (might be from localStorage cache)
    }
  };

  // Save user's app data to Firestore (called by debounced effect)
  // No separate function needed - logic is in useEffect

  const loadFullUserProfile = async (uid: string, baseUser: User) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setState(prev => ({
          ...prev,
          user: profile,
          theme: profile.theme,
          language: profile.language,
          currencyBase: profile.currencyBase,
        }));
      } else {
        const newProfile: UserProfile = {
          uid: uid,
          email: baseUser.email,
          displayName: baseUser.displayName,
          photoURL: baseUser.photoURL,
          theme: 'light',
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

      // Load app data after profile
      await loadUserData(uid);

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

        // Clear demo data immediately when user logs in
        // Set empty data first, then load from Firebase
        setState(prev => ({
          ...prev,
          user: prev.user?.uid === firebaseUser.uid ? prev.user : basicProfile,
          isLoading: false,
          accounts: [],
          transactions: [],
          debts: [],
          goals: [],
          budgets: []
        }));

        if (!isAuthCheckComplete.current) {
          const lastView = localStorage.getItem('uflow_last_view') as ViewState;
          if (lastView && ['dashboard', 'history', 'analytics', 'accounts', 'debts', 'goals', 'settings', 'ai-assistant'].includes(lastView)) {
            setCurrentViewState(lastView);
          }
          isAuthCheckComplete.current = true;
        }

        // Block saving until user data is loaded from Firebase
        setIsLoadingUserData(true);
        loadFullUserProfile(firebaseUser.uid, firebaseUser).finally(() => {
          setIsLoadingUserData(false);
        });

      } else {
        // User logged out - reset to demo data (in memory only, not persisted)
        localStorage.removeItem('uflow_last_view');
        lastSavedDataRef.current = '';
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        setState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          accounts: DEMO_ACCOUNTS,
          transactions: DEMO_TRANSACTIONS,
          debts: DEMO_DEBTS,
          goals: DEMO_GOALS,
          budgets: DEMO_BUDGETS
        }));
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
      updateDoc(userRef, profileUpdates).catch(() => { });
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
    const newAcc = { ...acc, id: generateId(), ownerId: state.user?.uid };
    setState(prev => ({ ...prev, accounts: [...prev.accounts, newAcc] }));

    // If initial balance is set, create an adjustment transaction
    if (acc.initialBalance && acc.initialBalance > 0) {
      const initialTx: Transaction = {
        id: generateId(),
        type: 'income',
        amount: acc.initialBalance,
        currency: acc.currency,
        accountId: newAcc.id,
        category: 'Initial Balance',
        note: 'Saldo inicial de cuenta',
        date: new Date().toISOString(),
        createdAt: Date.now()
      };
      setState(prev => ({ ...prev, transactions: [initialTx, ...prev.transactions] }));
    }

    addToast('Account Added', 'success');
  }, [addToast, state.user?.uid]);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(acc => acc.id !== id)
    }));
    addToast('Account Deleted', 'info');
  }, [addToast]);

  const updateAccount = useCallback((id: string, data: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, ...data } : acc)
    }));
    addToast('Account Updated', 'success');
  }, [addToast]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'payments' | 'createdAt'>) => {
    const newDebt: Debt = { ...debt, id: generateId(), payments: [], createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, debts: [...prev.debts, newDebt] }));
    addToast('Debt Logged', 'success');
  }, [addToast]);

  const deleteDebt = useCallback((id: string) => {
    setState(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));
    addToast('Debt Deleted', 'info');
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

  const resetData = useCallback(async () => {
    // Reset data in Firebase to empty
    if (state.user?.uid) {
      const emptyData = { accounts: [], transactions: [], debts: [], goals: [], budgets: [] };
      const dataRef = doc(db, 'users', state.user.uid, 'appData', 'main');
      await setDoc(dataRef, emptyData);
      setState(prev => ({ ...prev, ...emptyData }));
    }
    addToast(state.language === 'es' ? 'Reinicio de fábrica completado' : 'Factory Reset Complete', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }, [addToast, state.language, state.user?.uid]);

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
    addTransaction, addAccount, deleteAccount, updateAccount, addDebt, deleteDebt, addGoal, updateGoal, payDebt, resetData, t,
    addToast, removeToast, toasts
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
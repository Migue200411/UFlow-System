import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  AppContextType, AppState, Theme, Language, Currency, ViewState,
  Transaction, Account, Debt, CreditCard, Goal, PlanItem, UserProfile
} from '../types';
import { DEMO_ACCOUNTS, DEMO_PLAN_ITEMS, DEMO_CREDIT_CARDS, DEMO_DEBTS, DEMO_GOALS, DEMO_TRANSACTIONS, TRANSLATIONS } from '../constants';
import { generateId, getTodayStr, dateToISO } from '../utils';
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
  timezone: 'auto',
  privacyMode: false,
  showCents: false,
  reduceMotion: false,
  accounts: DEMO_ACCOUNTS,
  transactions: DEMO_TRANSACTIONS,
  debts: DEMO_DEBTS,
  creditCards: DEMO_CREDIT_CARDS,
  goals: DEMO_GOALS,
  planItems: DEMO_PLAN_ITEMS,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentViewState] = useState<ViewState>('dashboard');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const isAuthCheckComplete = useRef(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const latestSaveDataRef = useRef<{ uid: string; data: any } | null>(null);

  // --- 1. PERSISTENCE LAYER (FIREBASE ONLY) ---
  // Keep a ref with latest data (sanitized) so beforeunload always has current state
  useEffect(() => {
    if (state.user?.uid && !state.isLoading && !isLoadingUserData) {
      latestSaveDataRef.current = {
        uid: state.user.uid,
        data: JSON.parse(JSON.stringify({
          accounts: state.accounts,
          transactions: state.transactions,
          debts: state.debts,
          creditCards: state.creditCards,
          goals: state.goals,
          planItems: state.planItems
        }))
      };
    }
  });

  // Debounced save: triggers on any data change (500ms)
  // JSON.parse(JSON.stringify()) strips undefined values that Firestore rejects
  useEffect(() => {
    if (!state.isLoading && state.user?.uid && !isLoadingUserData) {
      const dataToSave = JSON.parse(JSON.stringify({
        accounts: state.accounts,
        transactions: state.transactions,
        debts: state.debts,
        creditCards: state.creditCards,
        goals: state.goals,
        planItems: state.planItems
      }));

      const dataString = JSON.stringify(dataToSave);
      if (dataString === lastSavedDataRef.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const dataRef = doc(db, 'users', state.user!.uid, 'appData', 'main');
          await setDoc(dataRef, dataToSave, { merge: true });
          lastSavedDataRef.current = dataString;
        } catch (e) {
          console.error('Failed to save to Firebase:', e);
        }
      }, 500);
    }
  }, [
    state.accounts, state.transactions, state.debts, state.creditCards, state.goals,
    state.planItems, state.isLoading, state.user?.uid, isLoadingUserData
  ]);

  // Save on page close/reload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const pending = latestSaveDataRef.current;
      if (pending && JSON.stringify(pending.data) !== lastSavedDataRef.current) {
        const dataRef = doc(db, 'users', pending.uid, 'appData', 'main');
        setDoc(dataRef, pending.data, { merge: true });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        const txs = data.transactions || [];
        const cards = (data.creditCards || []).map((card: any) => {
          // Recalculate usedAmount from actual transactions
          const cardTxs = txs.filter((tx: any) => tx.creditCardId === card.id);
          let used = 0;
          for (const tx of cardTxs) {
            if (tx.category === 'Card Payment') used -= tx.amount;
            else used += tx.amount;
          }
          return { ...card, usedAmount: Math.max(0, Math.min(used, card.creditLimit)) };
        });
        setState(prev => ({
          ...prev,
          accounts: data.accounts || [],
          transactions: txs,
          debts: data.debts || [],
          creditCards: cards,
          goals: (data.goals || []).map((g: any) => ({ ...g, contributions: g.contributions || [] })),
          planItems: (data.planItems || data.budgets || []).map((p: any) => ({ ...p, real: p.real ?? 0 })),
        }));
      } else {
        // New user - start with empty data
        const emptyData = {
          accounts: [],
          transactions: [],
          debts: [],
          creditCards: [],
          goals: [],
          planItems: []
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
          timezone: profile.timezone || 'auto',
          privacyMode: profile.privacyMode ?? false,
          showCents: profile.showCents ?? false,
          reduceMotion: profile.reduceMotion ?? false,
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
          timezone: 'auto',
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
          timezone: state.timezone,
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
          creditCards: [],
          goals: [],
          planItems: []
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
          creditCards: DEMO_CREDIT_CARDS,
          goals: DEMO_GOALS,
          planItems: DEMO_PLAN_ITEMS
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
    const profileKeys = ['theme', 'language', 'currencyBase', 'timezone', 'privacyMode', 'showCents', 'reduceMotion'];
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

  const updateTransaction = useCallback((id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;
      const isEditable = (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
      if (!isEditable) return prev;

      let creditCards = prev.creditCards;
      // If this is a CC transaction and amount changed, adjust usedAmount
      if (tx.creditCardId && data.amount !== undefined && data.amount !== tx.amount) {
        const diff = data.amount - tx.amount;
        const isCharge = tx.category !== 'Card Payment';
        creditCards = creditCards.map(c => {
          if (c.id !== tx.creditCardId) return c;
          // Charge: more amount = more used; Payment: more amount = less used
          const adjustment = isCharge ? diff : -diff;
          return { ...c, usedAmount: Math.max(0, Math.min(c.usedAmount + adjustment, c.creditLimit)) };
        });
      }

      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? { ...t, ...data } : t),
        creditCards
      };
    });
    addToast('Record Updated', 'success');
  }, [addToast]);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;
      const isEditable = (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
      if (!isEditable) return prev;

      let creditCards = prev.creditCards;
      // If deleting a CC transaction, reverse its effect on usedAmount
      if (tx.creditCardId) {
        const isCharge = tx.category !== 'Card Payment';
        creditCards = creditCards.map(c => {
          if (c.id !== tx.creditCardId) return c;
          // Reverse: delete charge = reduce used; delete payment = increase used
          const adjustment = isCharge ? -tx.amount : tx.amount;
          return { ...c, usedAmount: Math.max(0, Math.min(c.usedAmount + adjustment, c.creditLimit)) };
        });
      }

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        creditCards
      };
    });
    addToast('Record Deleted', 'info');
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
        date: dateToISO(getTodayStr(state.timezone)),
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
    const newGoal: Goal = { ...goal, id: generateId(), contributions: goal.contributions || [] };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    addToast('Target Set', 'success');
  }, [addToast]);

  const contributeToGoal = useCallback((goalId: string, amount: number, accountId: string) => {
    setState(prev => {
      const goal = prev.goals.find(g => g.id === goalId);
      if (!goal || goal.status === 'completed') return prev;

      const contribution = { id: generateId(), amount, accountId, date: dateToISO(getTodayStr()) };
      const newAmount = goal.currentAmount + amount;
      const isComplete = newAmount >= goal.targetAmount;

      // Create expense transaction from the account
      const tx: Transaction = {
        id: generateId(),
        type: 'expense',
        amount,
        currency: goal.currency,
        accountId,
        category: 'Goal Savings',
        note: goal.name,
        date: dateToISO(getTodayStr()),
        createdAt: Date.now(),
      };

      return {
        ...prev,
        goals: prev.goals.map(g => g.id === goalId ? {
          ...g,
          currentAmount: newAmount,
          contributions: [...g.contributions, contribution],
          status: isComplete ? 'completed' as const : g.status,
        } : g),
        transactions: [tx, ...prev.transactions],
      };
    });
    addToast('Contribution Saved', 'success');
  }, [addToast]);

  const deleteGoal = useCallback((id: string) => {
    setState(prev => {
      const goal = prev.goals.find(g => g.id === id);
      if (!goal) return prev;
      // Remove the "Goal Savings" expense transactions created by contributions
      const contributionTxIds = new Set(
        goal.contributions.map(c => c.id)
      );
      // Match by category + note since contribution tx doesn't store its own id reference
      const filteredTx = prev.transactions.filter(tx =>
        !(tx.category === 'Goal Savings' && tx.note === goal.name)
      );
      return {
        ...prev,
        goals: prev.goals.filter(g => g.id !== id),
        transactions: filteredTx,
      };
    });
    addToast('Goal Deleted', 'info');
  }, [addToast]);

  // --- Plan Item Actions ---
  const addPlanItem = useCallback((item: Omit<PlanItem, 'id'>) => {
    const newItem: PlanItem = { ...item, id: generateId() };
    setState(prev => ({ ...prev, planItems: [...prev.planItems, newItem] }));
  }, []);

  const updatePlanItem = useCallback((id: string, data: Partial<PlanItem>) => {
    setState(prev => ({
      ...prev,
      planItems: prev.planItems.map(p => p.id === id ? { ...p, ...data } : p)
    }));
  }, []);

  const deletePlanItem = useCallback((id: string) => {
    setState(prev => ({ ...prev, planItems: prev.planItems.filter(p => p.id !== id) }));
  }, []);

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

  // --- Credit Card Actions ---

  const addCreditCard = useCallback((card: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const newCard: CreditCard = { ...card, id: generateId(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, creditCards: [...prev.creditCards, newCard] }));
    addToast('Credit Card Added', 'success');
  }, [addToast]);

  const updateCreditCard = useCallback((id: string, data: Partial<CreditCard>) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => c.id === id ? { ...c, ...data } : c)
    }));
    addToast('Credit Card Updated', 'success');
  }, [addToast]);

  const deleteCreditCard = useCallback((id: string) => {
    setState(prev => ({ ...prev, creditCards: prev.creditCards.filter(c => c.id !== id) }));
    addToast('Credit Card Deleted', 'info');
  }, [addToast]);

  const chargeCreditCard = useCallback((id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => {
        if (c.id !== id) return c;
        return { ...c, usedAmount: Math.min(c.usedAmount + amount, c.creditLimit) };
      })
    }));
    addToast('Charge Registered', 'success');
  }, [addToast]);

  const payCreditCard = useCallback((id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => {
        if (c.id !== id) return c;
        return { ...c, usedAmount: Math.max(c.usedAmount - amount, 0) };
      })
    }));
    addToast('Payment Applied', 'success');
  }, [addToast]);

  const recalcCCBalances = useCallback(() => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(card => {
        const cardTxs = prev.transactions.filter(tx => tx.creditCardId === card.id);
        let used = 0;
        for (const tx of cardTxs) {
          if (tx.category === 'Card Payment') {
            used -= tx.amount;
          } else {
            used += tx.amount;
          }
        }
        return { ...card, usedAmount: Math.max(0, Math.min(used, card.creditLimit)) };
      })
    }));
  }, []);

  const resetData = useCallback(async () => {
    // Reset data in Firebase to empty
    if (state.user?.uid) {
      const emptyData = { accounts: [], transactions: [], debts: [], creditCards: [], goals: [], planItems: [] };
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
    setTimezone: (timezone: string) => updateState({ timezone }),
    togglePrivacy: () => updateState({ privacyMode: !state.privacyMode }),
    toggleShowCents: () => updateState({ showCents: !state.showCents }),
    toggleReduceMotion: () => updateState({ reduceMotion: !state.reduceMotion }),
    setView: setCurrentView,
    currentView,
    addTransaction, updateTransaction, deleteTransaction, editingTransaction, setEditingTransaction,
    addAccount, deleteAccount, updateAccount, addDebt, deleteDebt,
    addCreditCard, updateCreditCard, deleteCreditCard, chargeCreditCard, payCreditCard, recalcCCBalances,
    addGoal, contributeToGoal, deleteGoal, addPlanItem, updatePlanItem, deletePlanItem, payDebt, resetData, t,
    addToast, removeToast, toasts
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
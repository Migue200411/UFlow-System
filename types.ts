
export type Theme = 'dark' | 'light';
export type Language = 'en' | 'es';
export type Currency = 'COP' | 'USD' | 'EUR';
export type TransactionType = 'income' | 'expense' | 'adjustment';
export type DebtType = 'owes_me' | 'i_owe';
export type DebtStatus = 'pending' | 'partial' | 'paid';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type ViewState = 'dashboard' | 'history' | 'analytics' | 'accounts' | 'debts' | 'goals' | 'settings' | 'ai-assistant';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  theme: Theme;
  language: Language;
  currencyBase: Currency;
  privacyMode: boolean;
  showCents: boolean;
  reduceMotion: boolean;
  createdAt?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'individual' | 'shared';
  currency: Currency;
  members?: string[]; // For demo
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  accountId: string;
  category: string;
  note: string;
  date: string; // ISO String
  createdAt: number; // Timestamp for 72h rule
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
}

export interface Debt {
  id: string;
  person: string;
  type: DebtType;
  totalAmount: number;
  currency: Currency;
  status: DebtStatus;
  payments: DebtPayment[];
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  status: GoalStatus;
  deadline?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number; // Calculated on the fly ideally, but kept simple here
  currency: Currency;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestion?: {
    type: 'transaction' | 'goal';
    data: any;
  };
}

export interface AppState {
  user: UserProfile | null;
  isLoading: boolean;
  theme: Theme;
  language: Language;
  currencyBase: Currency;
  privacyMode: boolean;
  showCents: boolean;
  reduceMotion: boolean;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  goals: Goal[];
  budgets: Budget[];
}

export interface AppContextType extends AppState {
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setCurrencyBase: (curr: Currency) => void;
  togglePrivacy: () => void;
  toggleShowCents: () => void;
  toggleReduceMotion: () => void;
  setView: (view: ViewState) => void;
  currentView: ViewState;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'payments' | 'createdAt'>) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, amount: number) => void;
  payDebt: (id: string, amount: number) => void;
  resetData: () => void;
  t: (key: string) => string;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
}
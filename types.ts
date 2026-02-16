
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
  timezone: string;
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
  initialBalance?: number;
  members?: string[]; // For demo
  ownerId?: string; // User who created the account
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
  creditCardId?: string; // Links transaction to a credit card
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

export interface CreditCard {
  id: string;
  name: string;
  creditLimit: number;
  usedAmount: number; // How much is currently owed
  currency: Currency;
  cutoffDay?: number; // Day of month (1-31) if fixed, or days relative if relative
  cutoffMode?: 'fixed' | 'relative'; // 'fixed' = day of month, 'relative' = days before payment
  paymentDay?: number; // Day of month (1-31) if fixed, or days relative if relative
  paymentMode?: 'fixed' | 'relative'; // 'fixed' = day of month, 'relative' = days after cutoff
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
  timezone: string;
  privacyMode: boolean;
  showCents: boolean;
  reduceMotion: boolean;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  creditCards: CreditCard[];
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
  setTimezone: (tz: string) => void;
  togglePrivacy: () => void;
  toggleShowCents: () => void;
  toggleReduceMotion: () => void;
  setView: (view: ViewState) => void;
  currentView: ViewState;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'payments' | 'createdAt'>) => void;
  deleteDebt: (id: string) => void;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  chargeCreditCard: (id: string, amount: number) => void;
  payCreditCard: (id: string, amount: number) => void;
  recalcCCBalances: () => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, amount: number) => void;
  payDebt: (id: string, amount: number) => void;
  resetData: () => void;
  t: (key: string) => string;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
}
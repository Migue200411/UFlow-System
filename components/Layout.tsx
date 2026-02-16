import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, History, PieChart, Wallet, ShieldAlert, Target, Settings,
  Menu, Plus, Eye, EyeOff, Moon, Sun, Sparkles, Loader2, Trash2, Pencil, ArrowRightLeft
} from 'lucide-react';
import { cn, processAICommand, getTodayStr, dateToISO } from '../utils';
import { Button, Modal, Input, Select, ToastContainer, Card, DatePicker } from './UIComponents';
import { TransactionType, Currency, Transaction } from '../types';

const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
      active 
        ? "text-brand-600 dark:text-brand-400 bg-brand-500/10 shadow-sm" 
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/5"
    )}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(124,92,255,0.6)]" />}
    <Icon className={cn("w-4 h-4 transition-colors relative z-10", active ? "text-brand-500" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
    <span className="truncate relative z-10">{label}</span>
  </button>
);

const QuickInputModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t, accounts, addTransaction, timezone } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    currency: 'COP' as Currency,
    accountId: accounts[0]?.id || '',
    category: 'Food',
    date: getTodayStr(timezone),
    note: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      type: formData.type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      accountId: formData.accountId,
      category: formData.category,
      date: dateToISO(formData.date),
      note: formData.note
    });
    setFormData({
      type: 'expense',
      amount: '',
      currency: 'COP',
      accountId: accounts[0]?.id || '',
      category: '',
      date: getTodayStr(timezone),
      note: ''
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('act.quick_input')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label={t('lbl.type')}
            value={formData.type}
            onChange={val => setFormData({...formData, type: val as any})}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'adjustment', label: 'Adjustment' },
            ]}
          />
          <DatePicker
            label={t('lbl.date')}
            value={formData.date}
            onChange={val => setFormData({...formData, date: val})}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label={t('lbl.amount')}
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00"
              className="font-mono text-lg tracking-wider font-bold"
            />
          </div>
          <Select 
            label="Currency"
            value={formData.currency}
            onChange={val => setFormData({...formData, currency: val as any})}
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' }
            ]}
          />
        </div>

        <Select 
          label={t('lbl.account')}
          value={formData.accountId}
          onChange={val => setFormData({...formData, accountId: val})}
          options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.currency})` }))}
        />

        <Input 
          label={t('lbl.category')}
          list="categories"
          value={formData.category}
          onChange={e => setFormData({...formData, category: e.target.value})}
          placeholder="e.g. Food, Rent"
        />
        <datalist id="categories">
          <option value="Food" /><option value="Rent" /><option value="Transport" />
          <option value="Salary" /><option value="Business" /><option value="Entertainment" />
        </datalist>

        <Input 
          label={t('lbl.desc')}
          value={formData.note}
          onChange={e => setFormData({...formData, note: e.target.value})}
          placeholder="Optional note..."
        />

        <div className="pt-4 flex gap-3 border-t border-zinc-100 dark:border-white/10 mt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>{t('act.cancel')}</Button>
          <Button type="submit" className="flex-1">{t('act.save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- CREATE WITH AI MODAL (Creation Only) ---
const CreateWithAIModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t, addTransaction, addGoal, accounts, creditCards, chargeCreditCard, payCreditCard, setView, addToast } = useApp();
  const context = useApp();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Staging state for the "Editable Preview"
  const [resultType, setResultType] = useState<'transaction' | 'goal' | null>(null);
  const [draftTx, setDraftTx] = useState<any>(null);
  const [draftGoal, setDraftGoal] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const response = await processAICommand(prompt, context, [], undefined, true);
      
      // Strict role enforcement
      if (response.intent === 'query') {
        const msg = response.lang === 'es' 
           ? "Este botón es solo para crear entradas. Para consejos, usa el Asistente IA." 
           : "This tool is for creating entries only. For advice, use the AI Assistant.";
        addToast(msg, 'info');
        return;
      }

      if (response.intent === 'create' && response.structured) {
        setResultType(response.structured.type);
        if (response.structured.type === 'transaction') {
           setDraftTx({
             ...response.structured.data,
             date: response.structured.data.date.split('T')[0] // normalize for input date
           });
        } else {
           setDraftGoal(response.structured.data);
        }
      } else {
        addToast(response.text, 'info');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (resultType === 'transaction' && draftTx) {
      const amount = parseFloat(draftTx.amount);
      addTransaction({
        ...draftTx,
        date: dateToISO(draftTx.date),
        amount,
        creditCardId: draftTx.creditCardId || undefined,
      });
      // Handle credit card action
      if (draftTx.creditCardId && draftTx.creditCardAction) {
        if (draftTx.creditCardAction === 'charge') {
          chargeCreditCard(draftTx.creditCardId, amount);
        } else if (draftTx.creditCardAction === 'pay') {
          payCreditCard(draftTx.creditCardId, amount);
        }
      }
      setView('history');
    } else if (resultType === 'goal' && draftGoal) {
      addGoal({
        ...draftGoal,
        targetAmount: parseFloat(draftGoal.targetAmount)
      });
      // Redirect to Goals
      setView('goals');
    }
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setResultType(null);
    setDraftTx(null);
    setDraftGoal(null);
    setPrompt('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('ai.modal_title')}>
      {!resultType ? (
        <div className="space-y-6">
          <div className="relative">
            <textarea
              className="w-full h-32 p-4 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
              placeholder={t('ai.modal_placeholder')}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              autoFocus
            />
            <div className="absolute bottom-3 right-3 text-xs text-zinc-400">Shift+Enter for new line</div>
          </div>
          
          <Button 
            className="w-full h-12" 
            onClick={handleGenerate} 
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? (
               <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('ai.thinking')}</>
            ) : (
               <><Sparkles className="w-4 h-4 mr-2" /> Generate Draft</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-brand-500 text-sm font-bold uppercase tracking-wider">
               <Sparkles className="w-4 h-4" /> Draft Generated
             </div>
             <Button variant="ghost" size="sm" onClick={() => setResultType(null)} className="h-8 text-xs">Back to prompt</Button>
          </div>
          
          {/* Editable Preview Card */}
          <Card className="bg-brand-500/5 border-brand-500/20 p-5 space-y-4">
            
            {resultType === 'transaction' && draftTx && (
              <>
                 <div className="grid grid-cols-2 gap-4">
                   <Select 
                      label="Type"
                      value={draftTx.type}
                      onChange={v => setDraftTx({...draftTx, type: v})}
                      options={[{value:'expense',label:'Expense'},{value:'income',label:'Income'},{value:'adjustment',label:'Adjustment'}]}
                   />
                   <DatePicker
                      label="Date"
                      value={draftTx.date}
                      onChange={v => setDraftTx({...draftTx, date: v})}
                   />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2">
                      <Input 
                        label="Amount"
                        type="number"
                        value={draftTx.amount}
                        onChange={e => setDraftTx({...draftTx, amount: e.target.value})}
                        className="font-mono font-bold"
                      />
                   </div>
                   <Select 
                      label="Currency"
                      value={draftTx.currency}
                      onChange={v => setDraftTx({...draftTx, currency: v})}
                      options={[{value:'COP',label:'COP'},{value:'USD',label:'USD'},{value:'EUR',label:'EUR'}]}
                   />
                 </div>
                 <Select 
                    label="Account"
                    value={draftTx.accountId}
                    onChange={v => setDraftTx({...draftTx, accountId: v})}
                    options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                 />
                 <Input
                    label="Category"
                    value={draftTx.category}
                    onChange={e => setDraftTx({...draftTx, category: e.target.value})}
                 />
                 {draftTx.creditCardId && (() => {
                   const card = creditCards.find((c: any) => c.id === draftTx.creditCardId);
                   return card ? (
                     <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${draftTx.creditCardAction === 'pay' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                       <span>{draftTx.creditCardAction === 'pay' ? '💳 Pago →' : '💳 Cargo →'} {card.name}</span>
                     </div>
                   ) : null;
                 })()}
              </>
            )}

            {resultType === 'goal' && draftGoal && (
               <>
                 <Input 
                    label="Goal Name"
                    value={draftGoal.name}
                    onChange={e => setDraftGoal({...draftGoal, name: e.target.value})}
                 />
                 <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2">
                     <Input 
                        label="Target Amount"
                        type="number"
                        value={draftGoal.targetAmount}
                        onChange={e => setDraftGoal({...draftGoal, targetAmount: e.target.value})}
                     />
                   </div>
                   <Select 
                      label="Currency"
                      value={draftGoal.currency}
                      onChange={v => setDraftGoal({...draftGoal, currency: v})}
                      options={[{value:'COP',label:'COP'},{value:'USD',label:'USD'},{value:'EUR',label:'EUR'}]}
                   />
                 </div>
               </>
            )}

          </Card>

          <div className="flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={handleClose}>{t('act.cancel')}</Button>
             <Button className="flex-[2]" onClick={handleConfirm}>{t('act.confirm_create')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// --- EDIT TRANSACTION MODAL (72h Window) ---
const EditTransactionModal = () => {
  const { t, accounts, editingTransaction, setEditingTransaction, updateTransaction, deleteTransaction } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    currency: 'COP' as Currency,
    accountId: '',
    category: '',
    date: '',
    note: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        type: editingTransaction.type,
        amount: String(editingTransaction.amount),
        currency: editingTransaction.currency,
        accountId: editingTransaction.accountId,
        category: editingTransaction.category,
        date: editingTransaction.date.split('T')[0],
        note: editingTransaction.note
      });
      setShowDeleteConfirm(false);
    }
  }, [editingTransaction]);

  const handleClose = () => {
    setEditingTransaction(null);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    updateTransaction(editingTransaction.id, {
      type: formData.type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      accountId: formData.accountId,
      category: formData.category,
      date: dateToISO(formData.date),
      note: formData.note
    });
    handleClose();
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    deleteTransaction(editingTransaction.id);
    handleClose();
  };

  const timeLeft = editingTransaction ? Math.max(0, (72 * 60 * 60 * 1000) - (Date.now() - editingTransaction.createdAt)) : 0;
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <Modal isOpen={!!editingTransaction} onClose={handleClose} title={t('act.edit')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Time remaining indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <Pencil className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs font-mono font-bold text-brand-500 tracking-wide">
            {hoursLeft}h {minutesLeft}m remaining
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('lbl.type')}
            value={formData.type}
            onChange={val => setFormData({...formData, type: val as TransactionType})}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'adjustment', label: 'Adjustment' },
            ]}
          />
          <DatePicker
            label={t('lbl.date')}
            value={formData.date}
            onChange={val => setFormData({...formData, date: val})}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label={t('lbl.amount')}
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00"
              className="font-mono text-lg tracking-wider font-bold"
            />
          </div>
          <Select
            label="Currency"
            value={formData.currency}
            onChange={val => setFormData({...formData, currency: val as Currency})}
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' }
            ]}
          />
        </div>

        <Select
          label={t('lbl.account')}
          value={formData.accountId}
          onChange={val => setFormData({...formData, accountId: val})}
          options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.currency})` }))}
        />

        <Input
          label={t('lbl.category')}
          list="edit-categories"
          value={formData.category}
          onChange={e => setFormData({...formData, category: e.target.value})}
          placeholder="e.g. Food, Rent"
        />
        <datalist id="edit-categories">
          <option value="Food" /><option value="Rent" /><option value="Transport" />
          <option value="Salary" /><option value="Business" /><option value="Entertainment" />
        </datalist>

        <Input
          label={t('lbl.desc')}
          value={formData.note}
          onChange={e => setFormData({...formData, note: e.target.value})}
          placeholder="Optional note..."
        />

        {/* Delete confirmation */}
        {showDeleteConfirm ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{t('act.confirm_delete')}</p>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>{t('act.cancel')}</Button>
              <Button type="button" variant="danger" size="sm" className="flex-1" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5" />
                {t('act.delete')}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="pt-4 flex gap-3 border-t border-zinc-100 dark:border-white/10 mt-2">
          {!showDeleteConfirm && (
            <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>{t('act.cancel')}</Button>
          <Button type="submit" className="flex-1">{t('act.update')}</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- TRANSFER BETWEEN ACCOUNTS MODAL ---
const TransferModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const context = useApp();
  const { t, accounts, addTransaction } = context;
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayStr(context.timezone));

  useEffect(() => {
    if (isOpen && accounts.length >= 2) {
      setFromId(accounts[0]?.id || '');
      setToId(accounts[1]?.id || '');
      setAmount('');
      setNote('');
      setDate(getTodayStr(context.timezone));
    }
  }, [isOpen, accounts]);

  const fromAccount = accounts.find(a => a.id === fromId);

  const handleTransfer = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || fromId === toId || !fromId || !toId) return;

    const currency = fromAccount?.currency || ('COP' as Currency);

    const transferDate = date ? dateToISO(date) : dateToISO(getTodayStr(context.timezone));

    // Expense from source
    addTransaction({
      type: 'expense',
      amount: amt,
      currency,
      accountId: fromId,
      category: 'Transfer',
      note: note || `→ ${accounts.find(a => a.id === toId)?.name || ''}`,
      date: transferDate,
    });

    // Income to destination
    addTransaction({
      type: 'income',
      amount: amt,
      currency,
      accountId: toId,
      category: 'Transfer',
      note: note || `← ${fromAccount?.name || ''}`,
      date: transferDate,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tf.title')}>
      <div className="space-y-5">
        <Select
          label={t('tf.from')}
          value={fromId}
          onChange={setFromId}
          options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
        />
        <Select
          label={t('tf.to')}
          value={toId}
          onChange={setToId}
          options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
        />
        {fromId === toId && fromId && (
          <p className="text-xs text-red-500 font-medium">{t('tf.same_error')}</p>
        )}
        <Input
          label={`${t('tf.amount')} (${fromAccount?.currency || 'COP'})`}
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="font-mono font-bold"
        />
        <Input
          label={t('lbl.desc')}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('lbl.desc')}
        />
        <DatePicker
          label={t('lbl.date')}
          value={date}
          onChange={setDate}
        />
        <Button
          className="w-full"
          onClick={handleTransfer}
          disabled={!amount || !fromId || !toId || fromId === toId}
        >
          <ArrowRightLeft className="w-4 h-4" />
          {t('tf.execute')}
        </Button>
      </div>
    </Modal>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setView, t, privacyMode, togglePrivacy, theme, setTheme, toasts, removeToast } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickInputOpen, setQuickInputOpen] = useState(false);
  const [isAiCreateOpen, setAiCreateOpen] = useState(false);
  const [isTransferOpen, setTransferOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { id: 'history', icon: History, label: t('nav.history') },
    { id: 'analytics', icon: PieChart, label: t('nav.analytics') },
    { id: 'accounts', icon: Wallet, label: t('nav.accounts') },
    { id: 'debts', icon: ShieldAlert, label: t('nav.debts') },
    { id: 'goals', icon: Target, label: t('nav.goals') },
    { id: 'ai-assistant', icon: Sparkles, label: t('nav.ai') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg overflow-hidden font-sans selection:bg-brand-500/30 selection:text-white">
      {/* Sidebar Desktop - Floating Glass with Shadow */}
      <aside className="hidden md:flex w-52 flex-col fixed left-4 top-4 bottom-4 rounded-3xl glass-panel z-40 shadow-premium dark:shadow-glass">
        <div className="p-5">
          <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white font-mono flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-brand-500 rounded-sm rotate-45 shadow-[0_0_10px_rgba(124,92,255,0.8)]" />
            UFLOW
          </h1>
          <div className="mt-1.5 flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <p className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase">System Online</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-1 custom-scrollbar">
          {NAV_ITEMS.map(item => (
            <NavItem 
              key={item.id} 
              icon={item.icon} 
              label={item.label} 
              active={currentView === item.id} 
              onClick={() => setView(item.id as any)} 
            />
          ))}
        </nav>
        <div className="p-3">
          <div className="bg-zinc-100 dark:bg-white/5 rounded-xl p-3 border border-zinc-200 dark:border-white/5 backdrop-blur-md">
             <div className="flex justify-between items-center mb-1.5">
               <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Storage</span>
               <span className="text-[9px] font-mono text-brand-500">12%</span>
             </div>
             <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
               <div className="h-full bg-brand-500 w-[12%] shadow-[0_0_10px_rgba(124,92,255,0.5)]" />
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Padded for floating sidebar */}
      <main className="flex-1 flex flex-col relative min-w-0 md:pl-60 transition-all duration-300">

        {/* Header - Floating Glass */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0 mt-3 mx-3 sm:mx-6 rounded-2xl glass-panel shadow-premium dark:shadow-glass-sm mb-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              {NAV_ITEMS.find(n => n.id === currentView)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Create with AI Button */}
            <Button
               variant="primary"
               className="hidden md:flex bg-gradient-to-r from-violet-600 to-fuchsia-600 border-none shadow-neon"
               onClick={() => setAiCreateOpen(true)}
            >
               <Sparkles className="w-3.5 h-3.5" />
               <span className="hidden lg:inline">{t('act.create_ai')}</span>
            </Button>

            <Button variant="icon" onClick={togglePrivacy} title="Toggle Privacy">
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="icon" onClick={toggleTheme} className="hidden sm:flex">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <div className="h-6 w-px bg-zinc-200 dark:bg-white/10 mx-1" />
            <Button variant="secondary" onClick={() => setTransferOpen(true)} className="rounded-xl">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('act.transfer')}</span>
            </Button>
            <Button onClick={() => setQuickInputOpen(true)} className="rounded-xl shadow-neon hover:shadow-neon-sm transition-shadow">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Entry</span>
            </Button>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
           <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md md:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)}>
             <div className="w-60 h-full glass-panel border-r border-white/10 p-5 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-6 px-2 flex items-center gap-2">
                   <div className="w-4 h-4 bg-brand-500 rounded-sm rotate-45 shadow-[0_0_15px_rgba(124,92,255,0.8)]" />
                   <h1 className="text-lg font-bold font-mono text-zinc-900 dark:text-white">UFLOW</h1>
                </div>
                <nav className="space-y-1">
                  {NAV_ITEMS.map(item => (
                    <NavItem 
                      key={item.id} 
                      icon={item.icon} 
                      label={item.label} 
                      active={currentView === item.id} 
                      onClick={() => { setView(item.id as any); setIsMobileMenuOpen(false); }} 
                    />
                  ))}
                </nav>
             </div>
           </div>
        )}

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-24 md:pb-6 relative scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-5">
             {children}
          </div>
        </div>
        
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>

      <QuickInputModal isOpen={isQuickInputOpen} onClose={() => setQuickInputOpen(false)} />
      <CreateWithAIModal isOpen={isAiCreateOpen} onClose={() => setAiCreateOpen(false)} />
      <EditTransactionModal />
      <TransferModal isOpen={isTransferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
};
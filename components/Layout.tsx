import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, History, PieChart, Wallet, ShieldAlert, Target, Settings, 
  Menu, Plus, Eye, EyeOff, Moon, Sun, ArrowRightLeft, Camera, FileText
} from 'lucide-react';
import { cn } from '../utils';
import { Button, Modal, Input, Select, ToastContainer } from './UIComponents';
import { TransactionType, Currency } from '../types';

const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
      active 
        ? "text-brand-600 dark:text-brand-400 bg-brand-500/10 shadow-sm" 
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/5"
    )}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(124,92,255,0.6)]" />}
    <Icon className={cn("w-5 h-5 transition-colors relative z-10", active ? "text-brand-500" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
    <span className="truncate relative z-10">{label}</span>
  </button>
);

const QuickInputModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t, accounts, addTransaction } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    currency: 'COP' as Currency,
    accountId: accounts[0]?.id || '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
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
      date: new Date(formData.date).toISOString(),
      note: formData.note
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
          <Input 
            label={t('lbl.date')}
            type="date"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setView, t, privacyMode, togglePrivacy, theme, setTheme, toasts, removeToast } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickInputOpen, setQuickInputOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { id: 'history', icon: History, label: t('nav.history') },
    { id: 'analytics', icon: PieChart, label: t('nav.analytics') },
    { id: 'accounts', icon: Wallet, label: t('nav.accounts') },
    { id: 'debts', icon: ShieldAlert, label: t('nav.debts') },
    { id: 'goals', icon: Target, label: t('nav.goals') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg overflow-hidden font-sans selection:bg-brand-500/30 selection:text-white">
      {/* Sidebar Desktop - Floating Glass with Shadow */}
      <aside className="hidden md:flex w-64 flex-col fixed left-4 top-4 bottom-4 rounded-3xl glass-panel z-40 shadow-premium dark:shadow-glass">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white font-mono flex items-center gap-2.5">
            <div className="w-4 h-4 bg-brand-500 rounded-sm rotate-45 shadow-[0_0_10px_rgba(124,92,255,0.8)]" />
            UFLOW
          </h1>
          <div className="mt-2 flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">System Online</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-2 custom-scrollbar">
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
        <div className="p-6">
          <div className="bg-zinc-100 dark:bg-white/5 rounded-2xl p-4 border border-zinc-200 dark:border-white/5 backdrop-blur-md">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Storage</span>
               <span className="text-[10px] font-mono text-brand-500">12%</span>
             </div>
             <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
               <div className="h-full bg-brand-500 w-[12%] shadow-[0_0_10px_rgba(124,92,255,0.5)]" />
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Padded for floating sidebar */}
      <main className="flex-1 flex flex-col relative min-w-0 md:pl-72 transition-all duration-300">
        
        {/* Header - Floating Glass */}
        <header className="h-20 flex items-center justify-between px-6 sm:px-8 z-30 sticky top-0 mt-4 mx-4 sm:mx-8 rounded-2xl glass-panel shadow-premium dark:shadow-glass-sm mb-6">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {NAV_ITEMS.find(n => n.id === currentView)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="icon" onClick={togglePrivacy} title="Toggle Privacy">
              {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>
            <Button variant="icon" onClick={toggleTheme} className="hidden sm:flex">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10 mx-2" />
            <Button onClick={() => setQuickInputOpen(true)} className="rounded-xl shadow-neon hover:shadow-neon-sm transition-shadow">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Entry</span>
            </Button>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
           <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md md:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)}>
             <div className="w-72 h-full glass-panel border-r border-white/10 p-6 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-8 px-2 flex items-center gap-3">
                   <div className="w-5 h-5 bg-brand-500 rounded-sm rotate-45 shadow-[0_0_15px_rgba(124,92,255,0.8)]" />
                   <h1 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">UFLOW</h1>
                </div>
                <nav className="space-y-2">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pb-24 md:pb-8 relative scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
             {children}
          </div>
        </div>
        
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>

      <QuickInputModal isOpen={isQuickInputOpen} onClose={() => setQuickInputOpen(false)} />
    </div>
  );
};
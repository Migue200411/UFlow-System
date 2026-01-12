import React from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Select, Badge, Money, Toggle, SegmentedControl } from '../components/UIComponents';
import { convertToBase, cn } from '../utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, CartesianGrid } from 'recharts';
import { Moon, Sun, Monitor, Globe, Shield, Sliders, Calendar, Tag, CreditCard, LogOut, User } from 'lucide-react';

// --- HISTORY VIEW ---
export const HistoryView = () => {
  const { transactions, t } = useApp();
  const [filter, setFilter] = React.useState('');

  const filtered = transactions.filter(tx => 
    tx.category.toLowerCase().includes(filter.toLowerCase()) || 
    tx.note.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex gap-4 items-center p-4 rounded-2xl glass-panel">
        <Input placeholder="Search records by category or note..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-md bg-transparent border-none focus:ring-0 px-0" />
      </div>
      <Card className="overflow-hidden p-0 border-0 shadow-glass-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-100/50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap">{t('lbl.date')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap">{t('lbl.category')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap max-w-[200px]">{t('lbl.desc')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap">{t('lbl.account')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap text-right">{t('lbl.amount')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-widest whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5 bg-white/50 dark:bg-dark-surface/50">
              {filtered.map(tx => {
                const isEditable = (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
                return (
                  <tr key={tx.id} className="hover:bg-brand-500/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 safe-text">{tx.category}</td>
                    <td className="px-6 py-4 text-zinc-500 max-w-[150px] safe-text" title={tx.note}>{tx.note}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500 safe-text">{tx.currency} Acc</td>
                    <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400 drop-shadow-sm' : 'text-zinc-900 dark:text-white'}`}>
                       {tx.type === 'expense' ? '-' : ''}<Money amount={tx.amount} currency={tx.currency} />
                    </td>
                    <td className="px-6 py-4 text-right">
                       {isEditable ? 
                          <Badge variant="brand">EDIT 72H</Badge> : 
                          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">LOCKED</span>
                       }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- ANALYTICS VIEW ---
export const AnalyticsView = () => {
  const { transactions, currencyBase, t, theme, reduceMotion } = useApp();

  const data = transactions.slice().reverse().map((tx, i) => ({
    name: i.toString(),
    amount: convertToBase(tx.amount, tx.currency, currencyBase),
    type: tx.type
  }));
  
  const byCat: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(tx => {
    const val = convertToBase(tx.amount, tx.currency, currencyBase);
    byCat[tx.category] = (byCat[tx.category] || 0) + val;
  });
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value }));
  const COLORS = ['#7C5CFF', '#9270FF', '#B099FF', '#22c55e', '#3b82f6', '#f43f5e'];

  const isDark = theme === 'dark';

  // Custom Tooltip for Premium Look
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#1A1A25]/95 border border-zinc-100 dark:border-white/10 p-4 rounded-2xl shadow-premium backdrop-blur-xl">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Transaction {label}</p>
          <p className="text-xl font-mono font-bold text-brand-600 dark:text-brand-400">
            <Money amount={payload[0].value} currency={currencyBase} />
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <Card className="min-h-[450px] flex flex-col col-span-1 md:col-span-2 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20">
           <Monitor className="w-40 h-40 text-brand-500" />
        </div>
        <div className="mb-8 relative z-10 px-2">
           <h3 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight">Financial Flow</h3>
           <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-2">
             BASE CURRENCY <span className="text-brand-600 dark:text-brand-400 font-bold bg-brand-500/10 px-1.5 py-0.5 rounded">{currencyBase}</span>
           </p>
        </div>
        
        <div className="flex-1 w-full h-[320px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} 
              />
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#7C5CFF', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#7C5CFF" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAmt)" 
                isAnimationActive={!reduceMotion}
                animationDuration={1500}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#7C5CFF', className: 'animate-pulse' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="min-h-[400px] flex flex-col items-center justify-center relative">
         <div className="absolute top-6 left-6 z-10">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Breakdown</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Expenses by Category</p>
         </div>
         <div className="w-full h-[300px] flex justify-center relative z-10 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={6}
                  dataKey="value"
                  isAnimationActive={!reduceMotion}
                  stroke="none"
                  cornerRadius={8}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="drop-shadow-sm hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? 'rgba(20, 20, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)', 
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: isDark ? '#fff' : '#09090b', fontWeight: 700, fontFamily: 'Inter' }}
                />
              </PieChart>
            </ResponsiveContainer>
         </div>
         {/* Center Label */}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-6">
            <div className="text-center bg-white/50 dark:bg-black/20 p-4 rounded-full backdrop-blur-sm">
               <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{pieData.length}</p>
               <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Cats</p>
            </div>
         </div>
      </Card>
    </div>
  );
};

// --- SETTINGS VIEW ---
export const SettingsView = () => {
  const { 
    user, logout,
    theme, setTheme, language, setLanguage, currencyBase, setCurrencyBase,
    privacyMode, togglePrivacy, showCents, toggleShowCents, reduceMotion, toggleReduceMotion,
    resetData, t 
  } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* User Profile Card - Premium Glass */}
      {user && (
        <Card className="flex items-center gap-6 border-brand-500/30 bg-gradient-to-r from-brand-900/20 to-transparent relative overflow-hidden">
           {/* Glow Effect */}
           <div className="absolute -left-10 top-0 w-32 h-32 bg-brand-500/20 blur-[50px] rounded-full" />
           
           <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-brand-400 to-brand-700 shadow-neon relative z-10">
              <div className="w-full h-full rounded-full overflow-hidden bg-black/50 flex items-center justify-center">
                 {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                 ) : (
                    <User className="w-8 h-8 text-white" />
                 )}
              </div>
           </div>
           
           <div className="flex-1 min-w-0 relative z-10">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{user.displayName || "Authorized User"}</h2>
              <p className="text-sm text-zinc-500 font-mono truncate">{user.email}</p>
              <div className="mt-2 flex gap-2">
                 <Badge variant="brand">UID: {user.uid.substring(0,8)}</Badge>
                 <Badge variant="success">SYSTEM ONLINE</Badge>
              </div>
           </div>
           
           <Button variant="danger" onClick={logout} className="shrink-0 relative z-10 hover:shadow-lg hover:shadow-red-500/20">
              <LogOut className="w-4 h-4 mr-2" />
              End Session
           </Button>
        </Card>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* General Settings */}
        <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-500 shadow-sm"><Globe className="w-5 h-5"/></div>
                <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">{t('set.general')}</h3>
             </div>
             
             <Card className="space-y-6">
               <Select 
                 label={t('set.lang')} 
                 value={language} 
                 onChange={(v) => setLanguage(v as any)}
                 options={[
                   { value: 'en', label: 'English (US)', icon: <span className="text-lg">🇺🇸</span> },
                   { value: 'es', label: 'Español (CO)', icon: <span className="text-lg">🇨🇴</span> }
                 ]}
               />
               <Select 
                 label={t('set.curr')} 
                 value={currencyBase} 
                 onChange={(v) => setCurrencyBase(v as any)}
                 options={[
                   { value: 'COP', label: 'COP - Peso Colombiano', icon: <span className="font-mono text-xs bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">COP</span> },
                   { value: 'USD', label: 'USD - US Dollar', icon: <span className="font-mono text-xs bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">USD</span> },
                   { value: 'EUR', label: 'EUR - Euro', icon: <span className="font-mono text-xs bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">EUR</span> }
                 ]}
               />
             </Card>
        </div>

        {/* Visual Settings */}
        <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-500 shadow-sm"><Monitor className="w-5 h-5"/></div>
                <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">{t('set.vis')}</h3>
             </div>

             <Card className="space-y-8">
                <SegmentedControl 
                  label={t('set.theme')}
                  value={theme}
                  onChange={(v) => setTheme(v as any)}
                  options={[
                    { value: 'dark', label: 'Void (Dark)', icon: <Moon className="w-4 h-4" /> },
                    { value: 'light', label: 'Air (Light)', icon: <Sun className="w-4 h-4" /> }
                  ]}
                />

                <div className="space-y-5">
                  <Toggle label={t('set.privacy')} checked={privacyMode} onChange={togglePrivacy} />
                  <Toggle label={t('set.cents')} checked={showCents} onChange={toggleShowCents} />
                  <Toggle label={t('set.motion')} checked={reduceMotion} onChange={toggleReduceMotion} />
                </div>
             </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card variant="alert" className="mt-8 border-red-500/20 bg-red-500/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 shadow-[0_0_15px_-5px_rgba(239,68,68,0.5)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">{t('set.zone')}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Local data cache reset. Does not affect cloud profile.</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => { if(confirm('Reset local demo data?')) resetData() }}>{t('act.reset')}</Button>
        </div>
      </Card>
    </div>
  );
};

// --- ACCOUNTS VIEW ---
export const AccountsView = () => {
  const { accounts, transactions, t } = useApp();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
      {accounts.map(acc => {
         const balance = transactions
          .filter(t => t.accountId === acc.id)
          .reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : t.amount), 0);
         
         return (
           <Card key={acc.id} className="flex flex-col justify-between h-44 hover:border-brand-500/30 cursor-pointer group hover:shadow-premium bg-gradient-to-br from-white/60 to-white/20 dark:from-white/5 dark:to-transparent">
             <div className="flex justify-between items-start">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-500 group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg group-hover:text-brand-600 dark:group-hover:text-brand-500 transition-colors text-zinc-900 dark:text-white">{acc.name}</h3>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{acc.type}</span>
                 </div>
               </div>
               <Badge variant="neutral">{acc.currency}</Badge>
             </div>
             <div className="space-y-1">
               <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Available Balance</div>
               <div className="text-3xl font-mono font-bold tracking-tighter text-zinc-900 dark:text-white drop-shadow-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                 <Money amount={balance} currency={acc.currency} />
               </div>
             </div>
           </Card>
         )
      })}
      <Card className="border-dashed border-2 border-zinc-300 dark:border-white/10 flex flex-col items-center justify-center h-44 opacity-60 hover:opacity-100 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer transition-all gap-3 group">
         <div className="p-3 rounded-full bg-zinc-100 dark:bg-white/5 group-hover:scale-110 transition-transform">
           <CreditCard className="w-6 h-6 text-zinc-400 group-hover:text-brand-500" />
         </div>
         <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-brand-500 transition-colors">+ Add Account</span>
      </Card>
    </div>
  );
};

// --- GOALS & DEBTS ---
export const GoalsView = () => {
  const { goals, t } = useApp();
  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {goals.map(g => {
        const p = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
        return (
          <Card key={g.id} className="relative overflow-hidden group">
             {/* Background Progress Visual */}
             <div className="absolute inset-0 bg-brand-500/5 origin-left transition-transform duration-1000 ease-out z-0" style={{ transform: `scaleX(${p/100})` }} />
             
             <div className="relative z-10 flex justify-between mb-4">
               <div>
                 <h4 className="font-bold text-xl text-zinc-900 dark:text-white">{g.name}</h4>
                 <div className="mt-1"><Badge variant="success">Active</Badge></div>
               </div>
               <div className="text-right">
                 <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white"><Money amount={g.currentAmount} currency={g.currency}/></div>
                 <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">Target: <Money amount={g.targetAmount} currency={g.currency}/></div>
               </div>
             </div>
             
             <div className="relative z-10 h-3 w-full bg-zinc-100 dark:bg-black/40 rounded-full overflow-hidden shadow-inner border border-zinc-200 dark:border-white/5">
                <div className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(124,92,255,0.5)]" style={{ width: `${p}%` }}/>
             </div>
             <div className="relative z-10 mt-3 flex justify-between items-center">
                 <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Progress</span>
                 <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">{p.toFixed(1)}%</span>
             </div>
          </Card>
        )
      })}
    </div>
  )
};

export const DebtsView = () => {
  const { debts, t } = useApp();
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {debts.map(d => (
        <Card key={d.id} className="flex items-center justify-between group hover:border-zinc-300 dark:hover:border-white/20">
           <div className="flex items-center gap-5">
             <div className={`p-4 rounded-2xl ${d.type === 'owes_me' ? 'bg-green-500/10 text-green-600 dark:text-green-500 shadow-[0_0_15px_-5px_rgba(34,197,94,0.4)]' : 'bg-red-500/10 text-red-600 dark:text-red-500 shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)]'}`}>
               <Shield className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-zinc-900 dark:text-white">{d.person}</h4>
               <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">{d.type === 'owes_me' ? 'Owes Me' : 'I Owe'}</p>
             </div>
           </div>
           <div className="text-right">
             <div className="font-mono font-bold text-xl text-zinc-900 dark:text-white"><Money amount={d.totalAmount} currency={d.currency} /></div>
             <div className="mt-1"><Badge variant={d.status === 'paid' ? 'success' : d.status === 'partial' ? 'warning' : 'danger'}>{d.status}</Badge></div>
           </div>
        </Card>
      ))}
    </div>
  )
}
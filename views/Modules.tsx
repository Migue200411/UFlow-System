import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Select, Badge, Money, Toggle, SegmentedControl, Modal } from '../components/UIComponents';
import { convertToBase, cn, processAICommand, generateId } from '../utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Moon, Sun, Monitor, Globe, Shield, CreditCard, LogOut, User, Activity, TrendingUp, BarChart3, PieChart as PieIcon, Send, Sparkles, Bot, Wallet } from 'lucide-react';
import { AIMessage } from '../types';

// --- HISTORY VIEW ---
export const HistoryView = () => {
  const { transactions, t } = useApp();
  const [filter, setFilter] = React.useState('');

  const sortedTx = useMemo(() => {
     return [...transactions].sort((a,b) => b.createdAt - a.createdAt);
  }, [transactions]);

  const filtered = sortedTx.filter(tx => 
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

  // 1. Prepare Mountain Chart Data (Cumulative Running Balance of LAST 15 MOVEMENTS)
  const mountainData = useMemo(() => {
    // Take all transactions, sort by creation time (absolute chronology)
    const allSorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Take the last 15 movements for the "Live Feed" feel
    const lastSlice = allSorted.slice(-15); 
    
    // Calculate cumulative relative flow starting from 0 (or from first point)
    // To make it look like a mountain, we just accumulate the deltas of this slice
    let running = 0;
    const points = lastSlice.map(tx => {
       const val = convertToBase(tx.amount, tx.currency, currencyBase);
       const delta = tx.type === 'income' ? val : -val;
       running += delta;
       
       return {
         date: new Date(tx.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
         fullDate: new Date(tx.date).toLocaleDateString(),
         balance: running,
         delta: delta,
         category: tx.category
       };
    });

    // Add a start point if needed for visuals, or just return points
    if (points.length < 2) return [{date: 'Start', balance: 0}, ...points];
    
    return points;
  }, [transactions, currencyBase]);


  // 2. Prepare Pie Chart Data (Expenses by Category)
  const pieData = useMemo(() => {
    const byCat: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(tx => {
      const val = convertToBase(tx.amount, tx.currency, currencyBase);
      byCat[tx.category] = (byCat[tx.category] || 0) + val;
    });
    
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currencyBase]);

  const COLORS = ['#7C5CFF', '#522EC9', '#A18FFF', '#361E85', '#C0B5FF', '#1E0E4F'];
  const isDark = theme === 'dark';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/80 dark:bg-[#0B0B12]/80 border border-white/20 dark:border-white/10 p-3 rounded-xl shadow-glass backdrop-blur-xl animate-in zoom-in-95 duration-200 min-w-[150px]">
          <p className="text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider mb-1">{data.fullDate}</p>
          
          <div className="flex items-center justify-between gap-4 mb-2">
             <span className="text-xs font-medium text-zinc-400">Net Flow</span>
             <span className="font-mono font-bold text-brand-500 text-lg">
                <Money amount={data.balance} currency={currencyBase} />
             </span>
          </div>
          
          <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-white/10 flex items-center justify-between">
             <div className="flex items-center gap-1.5">
               <div className={`w-1.5 h-1.5 rounded-full ${data.delta >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
               <span className="text-[10px] text-zinc-500 safe-text max-w-[80px]">{data.category}</span>
             </div>
             <span className={`text-[10px] font-mono font-bold ${data.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
               {data.delta > 0 ? '+' : ''}<Money amount={data.delta} currency={currencyBase} />
             </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Mountain Chart */}
      <Card className="lg:col-span-2 min-h-[450px] flex flex-col relative overflow-hidden group border-brand-500/10 hover:border-brand-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20"><Activity className="w-40 h-40 text-brand-500" /></div>
        <div className="mb-8 relative z-10 px-2 flex justify-between items-end">
           <div>
             <h3 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-500" /> Net Asset Flow</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">Relative growth • Last 15 Movements</p>
           </div>
           <Badge variant="brand">REALTIME</Badge>
        </div>
        <div className="flex-1 w-full h-[320px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mountainData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }} dy={10} padding={{ left: 10, right: 10 }}/>
              <YAxis hide domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#7C5CFF', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#7C5CFF" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorBal)" 
                isAnimationActive={!reduceMotion} 
                animationDuration={1500} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', className: 'animate-pulse shadow-[0_0_15px_#7C5CFF]' }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Donut Chart */}
      <Card className="min-h-[450px] flex flex-col relative group">
         <div className="absolute top-6 left-6 z-10">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2"><PieIcon className="w-4 h-4 text-zinc-400" /> Expense Distribution</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">By Category</p>
         </div>
         <div className="w-full flex-1 flex flex-col justify-center items-center relative z-10 mt-6">
            <div className="w-full h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value" isAnimationActive={!reduceMotion} stroke="none" cornerRadius={6}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-lg hover:opacity-80 transition-all duration-300 hover:scale-105 origin-center cursor-pointer outline-none" stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 top-0 flex items-center justify-center pointer-events-none">
                <div className="text-center animate-in zoom-in duration-500 delay-300">
                   <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{pieData.length}</p>
                   <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Segments</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center px-4 mt-6 max-h-[100px] overflow-y-auto custom-scrollbar">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/5 hover:border-brand-500/30 transition-colors">
                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide max-w-[80px] truncate">{entry.name}</span>
                </div>
              ))}
            </div>
         </div>
      </Card>
    </div>
  );
};

// --- ACCOUNTS VIEW ---
export const AccountsView = () => {
  const { accounts, addAccount, t } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'individual', currency: 'COP' });

  const handleSave = () => {
    if(!newAcc.name) return;
    addAccount(newAcc as any);
    setIsModalOpen(false);
    setNewAcc({ name: '', type: 'individual', currency: 'COP' });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.accounts')}</h2>
          <Button onClick={() => setIsModalOpen(true)}><CreditCard className="w-4 h-4" /> Add Account</Button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <Card key={acc.id} className="relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Wallet className="w-24 h-24" />
               </div>
               <div className="relative z-10">
                 <Badge variant={acc.type === 'shared' ? 'brand' : 'neutral'} className="mb-4">{acc.type}</Badge>
                 <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{acc.name}</h3>
                 <p className="text-sm text-zinc-500 font-mono">{acc.currency}</p>
                 
                 {acc.members && (
                   <div className="flex items-center -space-x-2 mt-6">
                     {acc.members.map((m, i) => (
                       <div key={i} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold">
                         {m[0]}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </Card>
          ))}
       </div>

       {/* Add Modal */}
       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Account">
          <div className="space-y-4">
             <Input label="Account Name" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} placeholder="e.g. Savings" />
             <Select 
                label="Type"
                value={newAcc.type}
                onChange={v => setNewAcc({...newAcc, type: v})}
                options={[{value:'individual', label:'Individual'}, {value:'shared', label:'Shared'}]}
             />
             <Select 
                label="Currency"
                value={newAcc.currency}
                onChange={v => setNewAcc({...newAcc, currency: v})}
                options={[{value:'COP', label:'COP'}, {value:'USD', label:'USD'}, {value:'EUR', label:'EUR'}]}
             />
             <Button className="w-full mt-4" onClick={handleSave}>Create Account</Button>
          </div>
       </Modal>
    </div>
  );
};

// --- GOALS VIEW ---
export const GoalsView = () => {
  const { goals, addGoal, updateGoal, t, currencyBase } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', currency: 'COP' });

  const handleSave = () => {
    if(!newGoal.name || !newGoal.targetAmount) return;
    addGoal({
       name: newGoal.name,
       targetAmount: parseFloat(newGoal.targetAmount),
       currentAmount: 0,
       currency: newGoal.currency as any,
       status: 'active'
    });
    setIsModalOpen(false);
    setNewGoal({ name: '', targetAmount: '', currency: 'COP' });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.goals')}</h2>
          <Button onClick={() => setIsModalOpen(true)}><Sparkles className="w-4 h-4" /> New Goal</Button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {goals.map(goal => {
           const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
           return (
             <Card key={goal.id}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{goal.name}</h3>
                     <p className="text-xs text-zinc-500 font-mono mt-1">Target: <Money amount={goal.targetAmount} currency={goal.currency} /></p>
                   </div>
                   <div className="text-right">
                      <span className="text-2xl font-black text-brand-500"><Money amount={goal.currentAmount} currency={goal.currency} /></span>
                   </div>
                </div>
                
                <div className="relative h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                   <div 
                      className="absolute h-full bg-brand-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                   >
                     <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{backgroundImage: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', transform: 'skewX(-20deg)'}} />
                   </div>
                </div>
                
                <div className="flex gap-2">
                   <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateGoal(goal.id, goal.targetAmount * 0.1)}>+ 10%</Button>
                   <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateGoal(goal.id, 1000)}>+ 1k</Button>
                </div>
             </Card>
           )
         })}
       </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set New Goal">
          <div className="space-y-4">
             <Input label="Goal Name" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} placeholder="e.g. New Car" />
             <div className="grid grid-cols-2 gap-4">
               <Input label="Target Amount" type="number" value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})} />
               <Select 
                  label="Currency"
                  value={newGoal.currency}
                  onChange={v => setNewGoal({...newGoal, currency: v})}
                  options={[{value:'COP', label:'COP'}, {value:'USD', label:'USD'}, {value:'EUR', label:'EUR'}]}
               />
             </div>
             <Button className="w-full mt-4" onClick={handleSave}>Create Goal</Button>
          </div>
       </Modal>
    </div>
  );
};

// --- DEBTS VIEW ---
export const DebtsView = () => {
  const { debts, addDebt, payDebt, t } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({ person: '', amount: '', type: 'i_owe', currency: 'COP' });

  const handleSave = () => {
    if(!newDebt.person || !newDebt.amount) return;
    addDebt({
       person: newDebt.person,
       totalAmount: parseFloat(newDebt.amount),
       type: newDebt.type as any,
       currency: newDebt.currency as any,
       status: 'pending'
    });
    setIsModalOpen(false);
    setNewDebt({ person: '', amount: '', type: 'i_owe', currency: 'COP' });
  };

  return (
     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.debts')}</h2>
          <Button onClick={() => setIsModalOpen(true)} variant="danger" className="bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"><Shield className="w-4 h-4" /> Log Risk/Debt</Button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {debts.map(debt => {
             const paid = debt.payments.reduce((acc, p) => acc + p.amount, 0);
             const progress = Math.min((paid / debt.totalAmount) * 100, 100);
             const isOwedToMe = debt.type === 'owes_me';

             return (
               <Card key={debt.id} variant={isOwedToMe ? 'default' : 'alert'}>
                  <div className="flex justify-between items-start mb-4">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isOwedToMe ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                             {isOwedToMe ? 'Receivable' : 'Liability'}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">{new Date(debt.createdAt).toLocaleDateString()}</span>
                       </div>
                       <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{debt.person}</h3>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase">Total</p>
                        <span className="font-mono font-bold text-lg"><Money amount={debt.totalAmount} currency={debt.currency} /></span>
                     </div>
                  </div>

                  <div className="space-y-2 mb-4">
                     <div className="flex justify-between text-xs">
                        <span>Paid: <Money amount={paid} currency={debt.currency} /></span>
                        <span>{progress.toFixed(0)}%</span>
                     </div>
                     <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isOwedToMe ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${progress}%`}} />
                     </div>
                  </div>

                  {debt.status !== 'paid' && (
                     <Button size="sm" variant="secondary" className="w-full" onClick={() => payDebt(debt.id, debt.totalAmount - paid)}>
                        Mark as Paid
                     </Button>
                  )}
               </Card>
             );
          })}
       </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Debt / Risk">
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <Select 
                   label="Type"
                   value={newDebt.type}
                   onChange={v => setNewDebt({...newDebt, type: v})}
                   options={[{value:'i_owe', label:'I Owe (Liability)'}, {value:'owes_me', label:'Owes Me (Asset)'}]}
                />
                <Input label="Person / Entity" value={newDebt.person} onChange={e => setNewDebt({...newDebt, person: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Input label="Amount" type="number" value={newDebt.amount} onChange={e => setNewDebt({...newDebt, amount: e.target.value})} />
                <Select 
                   label="Currency"
                   value={newDebt.currency}
                   onChange={v => setNewDebt({...newDebt, currency: v})}
                   options={[{value:'COP', label:'COP'}, {value:'USD', label:'USD'}, {value:'EUR', label:'EUR'}]}
                />
             </div>
             <Button className="w-full mt-4" onClick={handleSave} variant="danger">Log Record</Button>
          </div>
       </Modal>
     </div>
  );
};

// --- SETTINGS VIEW ---
export const SettingsView = () => {
  const { 
    theme, setTheme, language, setLanguage, currencyBase, setCurrencyBase, 
    privacyMode, togglePrivacy, showCents, toggleShowCents, reduceMotion, toggleReduceMotion,
    resetData, logout, user, t 
  } = useApp();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Section */}
      <Card className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-600 dark:text-brand-400">
          {user?.displayName?.[0] || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{user?.displayName || 'User'}</h2>
          <p className="text-sm text-zinc-500">{user?.email}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant="brand">PRO MEMBER</Badge>
            <Badge variant="neutral">ID: {user?.uid.substring(0,6)}</Badge>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h3 className="font-bold text-lg mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
           <Monitor className="w-5 h-5 text-brand-500" /> {t('set.general')}
        </h3>
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label={t('set.lang')}
                value={language}
                onChange={(v) => setLanguage(v as any)}
                options={[{value:'en', label:'English', icon: <Globe className="w-4 h-4"/>}, {value:'es', label:'Español', icon: <Globe className="w-4 h-4"/>}]}
              />
              <Select 
                label={t('set.curr')}
                value={currencyBase}
                onChange={(v) => setCurrencyBase(v as any)}
                options={[{value:'COP', label:'COP (Colombian Peso)'}, {value:'USD', label:'USD (US Dollar)'}, {value:'EUR', label:'EUR (Euro)'}]}
              />
           </div>
           
           <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
              <Toggle label={t('set.theme') + " (Dark Mode)"} checked={theme === 'dark'} onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
              <Toggle label={t('set.privacy')} checked={privacyMode} onChange={togglePrivacy} />
              <Toggle label={t('set.cents')} checked={showCents} onChange={toggleShowCents} />
              <Toggle label={t('set.motion')} checked={reduceMotion} onChange={toggleReduceMotion} />
           </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card variant="alert">
         <h3 className="font-bold text-lg mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
           <Shield className="w-5 h-5" /> {t('set.zone')}
         </h3>
         <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
           Perform advanced actions. Be careful, some actions like factory reset cannot be undone.
         </p>
         <div className="flex flex-wrap gap-4">
            <Button variant="secondary" onClick={logout} className="border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">
              <LogOut className="w-4 h-4" /> Log Out
            </Button>
            <Button variant="danger" onClick={() => { if(window.confirm('Are you sure? This will wipe all local data.')) resetData() }}>
               Factory Reset Data
            </Button>
         </div>
      </Card>
    </div>
  );
};

// --- AI ASSISTANT VIEW ---
export const AIAssistantView = () => {
  const { t, user, addTransaction, addGoal, setView } = useApp();
  const context = useApp(); // Full context for AI
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<AIMessage[]>([
    { id: 'welcome', role: 'assistant', content: t('ai.welcome'), timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg: AIMessage = { 
      id: generateId(), 
      role: 'user', 
      content: inputValue, 
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await processAICommand(userMsg.content, context);
      
      const aiMsg: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        suggestion: response.structured
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.type === 'transaction') {
      addTransaction(suggestion.data);
      const feedback = context.language === 'es' 
        ? '✅ Transacción creada exitosamente. Redirigiendo...' 
        : '✅ Transaction created successfully. Redirecting...';
        
      setMessages(prev => [...prev, {
         id: generateId(),
         role: 'assistant',
         content: feedback,
         timestamp: Date.now()
      }]);
      
      setTimeout(() => setView('history'), 1500);

    } else if (suggestion.type === 'goal') {
      addGoal(suggestion.data);
      const feedback = context.language === 'es' 
        ? '✅ Meta de ahorro establecida. Redirigiendo...' 
        : '✅ Savings goal set. Redirecting...';

      setMessages(prev => [...prev, {
         id: generateId(),
         role: 'assistant',
         content: feedback,
         timestamp: Date.now()
      }]);
      setTimeout(() => setView('goals'), 1500);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Area */}
      <div className="mb-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500 rounded-xl shadow-[0_0_20px_rgba(124,92,255,0.4)]">
               <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
               <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">AI Assistant <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded ml-2 uppercase tracking-widest border border-brand-500/20">Beta</span></h1>
               <p className="text-xs text-zinc-500 dark:text-zinc-400">Financial Coach & Analyst</p>
            </div>
         </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0 border-brand-500/10 relative">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
         
         {/* Messages Area */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
            {messages.map((msg) => (
               <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  {msg.role === 'assistant' && (
                     <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-brand-500/20">
                        <Bot className="w-4 h-4 text-white" />
                     </div>
                  )}
                  
                  <div className={cn(
                     "max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                     msg.role === 'user' 
                        ? "bg-zinc-800 text-white rounded-br-none" 
                        : "bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-800 dark:text-zinc-200 rounded-tl-none backdrop-blur-sm"
                  )}>
                     <p className="whitespace-pre-line">{msg.content}</p>
                     
                     {/* Suggestion Card inside Chat */}
                     {msg.suggestion && (
                        <div className="mt-4 p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                           <div className="flex items-center gap-2 mb-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                              <Sparkles className="w-3 h-3" /> Suggested Action
                           </div>
                           <div className="text-xs font-mono mb-3 text-zinc-600 dark:text-zinc-400 bg-white/50 dark:bg-black/20 p-2 rounded border border-black/5 dark:border-white/5">
                              {JSON.stringify(msg.suggestion.data, null, 2).substring(0, 150)}...
                           </div>
                           <Button size="sm" className="w-full" onClick={() => handleApplySuggestion(msg.suggestion)}>
                              Confirm & Create
                           </Button>
                        </div>
                     )}
                  </div>
               </div>
            ))}
            
            {isTyping && (
               <div className="flex gap-4 justify-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
                     <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 h-12">
                     <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}} />
                     <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}} />
                     <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}} />
                  </div>
               </div>
            )}
         </div>

         {/* Input Area */}
         <div className="p-4 border-t border-zinc-100 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-md">
            <div className="relative flex items-center gap-2">
               <textarea 
                  className="w-full h-12 py-3 pl-4 pr-12 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 resize-none custom-scrollbar text-sm"
                  placeholder={t('ai.placeholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                     }
                  }}
               />
               <Button 
                  size="icon" 
                  className="absolute right-2 bottom-2 h-8 w-8 bg-brand-600 hover:bg-brand-500 border-none text-white shadow-neon"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
               >
                  <Send className="w-4 h-4" />
               </Button>
            </div>
         </div>
      </Card>
    </div>
  );
};

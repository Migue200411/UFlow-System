import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { convertToBase } from '../utils';
import { Card, Money, Badge, Button } from '../components/UIComponents';
import { ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, Activity, Box, ArrowRightLeft, Receipt, Download, TrendingUp, Zap } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { accounts, transactions, debts, creditCards, goals, currencyBase, timezone, t, reduceMotion, setEditingTransaction } = useApp();

  // --- Optimized Calculations (Memoized) ---
  const { assets, liabilities, receivables, available, relative, burnRate } = useMemo(() => {
    
    // 1. Calculate TOTAL ASSETS (Sum of all transactions converted to Base)
    // Formula: Sum(convertToBase(tx.amount * sign))
    let totalAssets = 0;
    let monthlyExpense = 0;
    const tz = timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
    const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    const currentMonth = parseInt(nowParts.find(p => p.type === 'month')!.value) - 1;

    transactions.forEach(tx => {
       // Skip CC charge transactions: these are tracked via CC usedAmount (liabilities),
       // not as cash outflows. Including them here would double-count.
       const isCCCharge = tx.creditCardId && !tx.accountId;

       // Convert amount to Base Currency
       const amountInBase = convertToBase(tx.amount, tx.currency, currencyBase);

       // Apply Sign
       if (tx.type === 'income') {
         totalAssets += amountInBase;
       } else if (tx.type === 'expense') {
         if (!isCCCharge) {
           totalAssets -= amountInBase;
         }
         if (new Date(tx.date).getMonth() === currentMonth) {
            monthlyExpense += amountInBase;
         }
       } else {
         totalAssets += amountInBase;
       }
    });

    // 2. Calculate Liabilities (Debts I owe + Credit Card balances)
    const debtLiabilities = debts
      .filter(d => d.type === 'i_owe' && d.status !== 'paid')
      .reduce((acc, d) => {
          const paid = d.payments.reduce((s, p) => s + p.amount, 0);
          const remaining = d.totalAmount - paid;
          return acc + convertToBase(remaining, d.currency, currencyBase);
      }, 0);

    const ccLiabilities = creditCards.reduce((acc, c) => {
      return acc + convertToBase(c.usedAmount, c.currency, currencyBase);
    }, 0);

    const totalLiabilities = debtLiabilities + ccLiabilities;

    // 3. Calculate Receivables (Money owed to me)
    const totalReceivables = debts
      .filter(d => d.type === 'owes_me' && d.status !== 'paid')
      .reduce((acc, d) => {
          const paid = d.payments.reduce((s, p) => s + p.amount, 0);
          const remaining = d.totalAmount - paid;
          return acc + convertToBase(remaining, d.currency, currencyBase);
      }, 0);

    // Simple burn rate calc (mock logic or real)
    // Assume budget limit 2M COP for demo or 80% utilization
    const burnRateVal = Math.min((monthlyExpense / 2000000) * 100, 100);

    return {
        assets: totalAssets,
        liabilities: totalLiabilities,
        receivables: totalReceivables,
        available: totalAssets - totalLiabilities, // Conservative liquidity
        relative: totalAssets + totalReceivables,  // Optimistic balance
        burnRate: burnRateVal
    };
  }, [accounts, transactions, debts, creditCards, currencyBase]);

  const recentTx = useMemo(() => {
      return [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [transactions]);

  // Enhanced Sparkline
  const Sparkline = ({ color = "#7C5CFF" }) => (
    <div className="relative h-8 w-24">
       <svg width="100%" height="100%" viewBox="0 0 100 30" fill="none" className="overflow-visible">
         <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
         </defs>
         <path d="M0 25 L15 20 L30 26 L45 12 L60 18 L75 5 L100 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow)"/>
         <path d="M0 25 L15 20 L30 26 L45 12 L60 18 L75 5 L100 15 V 30 H 0 Z" fill={`url(#grad-${color})`} stroke="none"/>
       </svg>
    </div>
  );

  const StatCard = ({ title, amount, icon: Icon, colorClass, sub, delay }: any) => {
    // Extract hex color rough approx for sparkline
    const hexColor = colorClass.includes('brand') ? '#7C5CFF' : colorClass.includes('green') ? '#22c55e' : '#3b82f6';
    
    return (
    <Card className={`flex flex-col gap-2.5 overflow-hidden relative ${!reduceMotion ? `animate-in fade-in slide-in-from-bottom-8 duration-700 delay-[${delay}ms]` : ''}`}>
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${colorClass.split('-')[1]}-500/10 blur-[50px] rounded-full pointer-events-none`} />

      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 dark:bg-opacity-20 backdrop-blur-md shadow-inner`}>
                <Icon className={`w-3.5 h-3.5 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{title}</span>
        </div>
        <Badge variant={colorClass.includes('brand') ? 'brand' : colorClass.includes('green') ? 'success' : 'neutral'}>LIVE</Badge>
      </div>

      <div className="flex items-end justify-between z-10">
         <div>
            <h3 className="text-2xl font-mono font-bold tracking-tighter text-zinc-900 dark:text-white drop-shadow-sm">
                <Money amount={amount} currency={currencyBase} />
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{sub}</p>
         </div>
         <Sparkline color={hexColor} />
      </div>
    </Card>
  )};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative">

      {/* Column 1: Financial Status */}
      <div className="space-y-4 lg:col-span-1 min-w-0">
        <StatCard 
          title={t('dash.total')} 
          amount={assets} 
          icon={Wallet} 
          colorClass="bg-brand-500 text-brand-500" 
          sub="Global Assets (Base)"
          delay={0}
        />
        <StatCard 
          title={t('dash.available')} 
          amount={available} 
          icon={CreditCard} 
          colorClass="bg-green-500 text-green-500"
          sub="Liquidity (Net Liabilities)"
          delay={100}
        />
        <StatCard 
          title={t('dash.relative')} 
          amount={relative} 
          icon={Activity} 
          colorClass="bg-blue-500 text-blue-500"
          sub="Projected (Incl. Receivables)"
          delay={200}
        />

        <Card className={`bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20 ${!reduceMotion ? 'animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300' : ''}`}>
          <div className="flex items-center justify-between mb-2.5">
             <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 tracking-widest">{t('dash.burn')}</span>
             </div>
             <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-500">{burnRate.toFixed(0)}%</span>
          </div>
          <div className="relative h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
             <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse-slow" style={{ width: `${burnRate}%` }} />
             {/* Striped pattern overlay */}
             <div className="absolute inset-0 w-full h-full opacity-20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}} />
          </div>
        </Card>
      </div>

      {/* Column 2: Data Stream */}
      <div className="lg:col-span-1 space-y-4 min-w-0">
        {/* Quick Commands */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1 py-1">
          {[
            { icon: ArrowRightLeft, label: t('act.transfer') },
            { icon: Receipt, label: t('act.scan') },
            { icon: Box, label: 'Goal' },
            { icon: Download, label: 'CSV' }
          ].map((cmd, i) => (
            <Button key={i} variant="secondary" size="sm" className="whitespace-nowrap rounded-full border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-glass-sm hover:border-brand-500/50 hover:shadow-neon-sm hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-300">
              <cmd.icon className="w-3.5 h-3.5" />
              {cmd.label}
            </Button>
          ))}
        </div>

        <Card className={`min-h-[380px] flex flex-col ${!reduceMotion ? 'animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500' : ''}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-white/5">
            <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t('dash.recent')}</h3>
            <div className="flex items-center gap-2 px-2 py-1 bg-brand-500/10 rounded-full border border-brand-500/20">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
               <span className="text-[10px] font-mono font-bold text-brand-500 tracking-wide">LIVE FEED</span>
            </div>
          </div>
          
          <div className="space-y-1.5 overflow-y-auto pr-2 flex-1 max-h-[380px] custom-scrollbar">
             {recentTx.length === 0 ? (
               <div className="py-20 text-center text-zinc-400 text-sm italic">{t('empty.generic')}</div>
             ) : recentTx.map((tx, idx) => {
               const isEditable = (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
               return (
                 <div key={tx.id} className="relative py-2 px-3 flex items-center justify-between bg-zinc-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all duration-300 group border border-transparent hover:border-zinc-200 dark:hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5">
                   {/* Timeline line connector */}
                   {idx !== recentTx.length - 1 && <div className="absolute left-6 top-9 bottom-0 w-px bg-zinc-200 dark:bg-white/10 -z-10 group-hover:bg-brand-500/30 transition-colors" />}

                   <div className="flex items-center gap-3 min-w-0">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${tx.type === 'income' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400'}`}>
                       {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 safe-text group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{tx.category}</p>
                       <p className="text-[10px] text-zinc-500 safe-text font-mono flex items-center gap-2 flex-wrap">
                         <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold tracking-wide">{accounts.find(a => a.id === tx.accountId)?.name || '—'}</span>
                         <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                         {new Date(tx.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                         {tx.note && <>
                           <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                           <span className="opacity-70">{tx.note}</span>
                         </>}
                       </p>
                     </div>
                   </div>
                   <div className="text-right pl-3 shrink-0">
                     <p className={`text-sm font-mono font-bold tracking-tight ${tx.type === 'income' ? 'text-green-600 dark:text-green-400 drop-shadow-sm' : 'text-zinc-900 dark:text-white'}`}>
                       {tx.type === 'expense' ? '-' : '+'}<Money amount={tx.amount} currency={tx.currency} />
                     </p>
                     {isEditable && <button onClick={() => setEditingTransaction(tx)} className="text-[9px] font-bold text-brand-500 uppercase tracking-wide block opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 duration-300 hover:text-brand-400 cursor-pointer">EDIT 72H</button>}
                   </div>
                 </div>
               )
             })}
          </div>
        </Card>
      </div>

      {/* Column 3: Risk & Targets */}
      <div className="lg:col-span-1 space-y-4 min-w-0">
        <Card variant="alert" className={!reduceMotion ? 'animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700' : ''}>
          <div className="flex justify-between items-center mb-3">
             <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">{t('dash.risk')}</span>
             <div className="animate-pulse">
                <Badge variant="danger">{t('st.critical')}</Badge>
             </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-gradient-to-br from-red-500/20 to-transparent rounded-xl text-red-600 dark:text-red-400 border border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)]">
               <TrendingUp className="w-5 h-5" />
             </div>
             <div>
               <h4 className="font-bold text-xs text-zinc-900 dark:text-white">Credit Utilization</h4>
               <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Exceeds 80% threshold</p>
             </div>
          </div>
          <Button size="sm" variant="danger" className="w-full mt-2">View Analysis</Button>
        </Card>

        <Card className={!reduceMotion ? 'animate-in fade-in slide-in-from-bottom-8 duration-700 delay-1000' : ''}>
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t('dash.targets')}</h3>
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-white/5"><Box className="w-3 h-3" /></Button>
          </div>
          <div className="space-y-4">
            {goals.slice(0, 3).map((g, idx) => {
               const progress = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
               return (
                 <div key={g.id} className="group">
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-semibold safe-text max-w-[70%] group-hover:text-brand-500 transition-colors">{g.name}</span>
                     <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{progress.toFixed(0)}%</span>
                   </div>
                   <div className="h-2 w-full bg-zinc-100 dark:bg-black/40 rounded-full overflow-hidden shadow-inner border border-zinc-200 dark:border-white/5">
                     <div 
                       className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(124,92,255,0.5)] relative" 
                       style={{ width: `${progress}%`, transitionDelay: `${idx * 200}ms` }} 
                     >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{backgroundImage: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', transform: 'skewX(-20deg)'}} />
                     </div>
                   </div>
                 </div>
               )
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Select, Badge, Money, Toggle, SegmentedControl, Modal, DatePicker } from '../components/UIComponents';
import { convertToBase, cn, processAICommand, generateId, getTodayStr, dateToISO } from '../utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, BarChart, Bar } from 'recharts';
import { Moon, Sun, Monitor, Globe, Shield, CreditCard as CreditCardIcon, LogOut, User, Activity, TrendingUp, PieChart as PieIcon, Send, Sparkles, Bot, Wallet, Settings, Trash2, Plus, Pencil, ChevronDown, Check, Target, Copy, RefreshCw, Users, ArrowLeft, UserPlus, Crown, Eye, EyeOff } from 'lucide-react';
import { AIMessage, CreditCard as CreditCardType, SharedAccount, SharedAccountMember, SharedTransaction, Currency } from '../types';

// --- HISTORY VIEW ---
export const HistoryView = () => {
  const { transactions, accounts, sharedAccounts, t, language, setEditingTransaction } = useApp();
  const [filter, setFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;

  // Merge personal + shared transactions
  type UnifiedTx = (typeof transactions[0] & { _shared?: false; _accountName?: string }) | (SharedTransaction & { _shared: true; _accountName: string });

  const allTx = useMemo(() => {
    const personal: UnifiedTx[] = transactions.map(tx => ({ ...tx, _shared: false as const }));
    const shared: UnifiedTx[] = sharedAccounts.flatMap(sa =>
      (sa.transactions || []).map(tx => ({ ...tx, _shared: true as const, _accountName: sa.name }))
    );
    return [...personal, ...shared];
  }, [transactions, sharedAccounts]);

  const sortedTx = useMemo(() => {
    return [...allTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTx]);

  const filtered = useMemo(() => {
    return sortedTx.filter(tx => {
      const matchesText = filter === '' ||
        tx.category.toLowerCase().includes(filter.toLowerCase()) ||
        tx.note.toLowerCase().includes(filter.toLowerCase()) ||
        (tx._shared && tx._accountName.toLowerCase().includes(filter.toLowerCase()));

      const txDate = new Date(tx.date);
      const matchesFrom = !dateFrom || txDate >= new Date(dateFrom);
      const matchesTo = !dateTo || txDate <= new Date(dateTo + 'T23:59:59');

      return matchesText && matchesFrom && matchesTo;
    });
  }, [sortedTx, filter, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedTx = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, dateFrom, dateTo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end p-4 rounded-2xl glass-panel">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">
            {language === 'es' ? 'Buscar' : 'Search'}
          </label>
          <input
            type="text"
            placeholder={language === 'es' ? 'Buscar por categoría o nota...' : 'Search by category or note...'}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="w-44">
          <DatePicker
            label={language === 'es' ? 'Desde' : 'From'}
            value={dateFrom}
            onChange={setDateFrom}
          />
        </div>
        <div className="w-44">
          <DatePicker
            label={language === 'es' ? 'Hasta' : 'To'}
            value={dateTo}
            onChange={setDateTo}
          />
        </div>
        {(filter || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilter(''); setDateFrom(''); setDateTo(''); }}>
            {language === 'es' ? 'Limpiar' : 'Clear'}
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center text-sm text-zinc-500">
        <span>{filtered.length} {language === 'es' ? 'registros' : 'records'}</span>
        {totalPages > 1 && (
          <span>{language === 'es' ? 'Página' : 'Page'} {currentPage} / {totalPages}</span>
        )}
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
              {paginatedTx.map(tx => {
                const isShared = tx._shared;
                const isEditable = !isShared && (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
                return (
                  <tr key={tx.id + (isShared ? '-s' : '')} className="hover:bg-brand-500/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500 whitespace-nowrap">{new Date(tx.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 safe-text">
                      <span>{tx.category}</span>
                      {isShared && 'isShared' in tx && tx.isShared && <Badge variant="brand" className="ml-2 text-[9px] !py-0 !px-1">{language === 'es' ? 'compartido' : 'shared'}</Badge>}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 max-w-[150px] safe-text" title={tx.note}>
                      {isShared && 'createdByName' in tx ? <span className="text-brand-500">{tx.createdByName}</span> : null}
                      {isShared && tx.note ? ' · ' : ''}{tx.note}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 safe-text">
                      {isShared ? (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tx._accountName}</span>
                      ) : (
                        accounts.find(a => a.id === (tx as any).accountId)?.name || tx.currency
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400 drop-shadow-sm' : 'text-zinc-900 dark:text-white'}`}>
                      {tx.type === 'expense' ? '-' : ''}<Money amount={tx.amount} currency={tx.currency} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditable ?
                        <button onClick={() => setEditingTransaction(tx as any)} className="cursor-pointer"><Badge variant="brand">EDIT 72H</Badge></button> :
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">{t('st.locked')}</span>
                      }
                    </td>
                  </tr>
                )
              })}
              {paginatedTx.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                    {language === 'es' ? 'No hay registros' : 'No records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ←
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
};

// --- ANALYTICS VIEW ---
export const AnalyticsView = () => {
  const { transactions, creditCards, debts, currencyBase, timezone, t, theme, reduceMotion, language } = useApp();
  const tz = timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;

  // Month/Year selector state (timezone-aware)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    return { month: parseInt(parts.find(p => p.type === 'month')!.value) - 1, year: parseInt(parts.find(p => p.type === 'year')!.value) };
  });

  // Determine range from earliest transaction to current month
  const { yearOptions, getMonthOptionsForYear } = useMemo(() => {
    const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    const nowMonth = parseInt(nowParts.find(p => p.type === 'month')!.value) - 1;
    const nowYear = parseInt(nowParts.find(p => p.type === 'year')!.value);

    // Find earliest transaction date
    let minYear = nowYear, minMonth = nowMonth;
    if (transactions.length > 0) {
      const earliest = transactions.reduce((min, tx) => tx.date < min ? tx.date : min, transactions[0].date);
      const d = new Date(earliest);
      minYear = d.getFullYear();
      minMonth = d.getMonth();
    }

    // Year options from earliest to current
    const years: { value: string; label: string }[] = [];
    for (let y = nowYear; y >= minYear; y--) {
      years.push({ value: String(y), label: String(y) });
    }

    // Month names
    const monthNames = language === 'es'
      ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // For a given year, return valid months (capped by earliest and current)
    const getMonthOptionsForYear = (year: number) => {
      const startM = year === minYear ? minMonth : 0;
      const endM = year === nowYear ? nowMonth : 11;
      const opts: { value: string; label: string }[] = [];
      for (let m = startM; m <= endM; m++) {
        opts.push({ value: String(m), label: monthNames[m] });
      }
      return opts;
    };

    return { yearOptions: years, getMonthOptionsForYear };
  }, [transactions, language, tz]);

  // Get days in selected month
  const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();

  // Helper: parse YYYY-MM-DD directly from ISO string (avoids timezone shift bugs)
  const parseDateParts = (dateStr: string) => {
    const d = dateStr.split('T')[0]; // "YYYY-MM-DD"
    const [y, m, day] = d.split('-').map(Number);
    return { year: y, month: m - 1, day }; // month 0-indexed
  };

  // 1. Prepare Line Chart Data (Daily flow for selected month)
  // Only account movements: transactions with an accountId (excludes CC charges without account)
  const lineChartData = useMemo(() => {
    const monthTxs = transactions.filter(tx => {
      if (!tx.accountId) return false;
      if (tx.category === 'Transfer') return false; // exclude inter-account transfers
      const p = parseDateParts(tx.date);
      return p.month === selectedMonth.month && p.year === selectedMonth.year;
    });

    // Group by day
    const byDay: Record<number, { income: number; expense: number }> = {};
    monthTxs.forEach(tx => {
      const day = parseDateParts(tx.date).day;
      if (!byDay[day]) byDay[day] = { income: 0, expense: 0 };
      const val = convertToBase(tx.amount, tx.currency, currencyBase);
      if (tx.type === 'income') byDay[day].income += val;
      else if (tx.type === 'expense') byDay[day].expense += val;
    });

    // Create data points for all days of the month (sorted left to right)
    let cumulative = 0;
    const points = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = byDay[day] || { income: 0, expense: 0 };
      const delta = dayData.income - dayData.expense;
      cumulative += delta;
      points.push({
        day,
        label: `${day}`,
        balance: cumulative,
        income: dayData.income,
        expense: dayData.expense,
        delta
      });
    }
    return points;
  }, [transactions, currencyBase, selectedMonth, daysInMonth]);

  // 2. Prepare Pie Chart Data (Expenses by Category for selected month)
  // Only account movements (same filter as line chart)
  const pieData = useMemo(() => {
    const byCat: Record<string, number> = {};
    transactions
      .filter(tx => {
        if (tx.type !== 'expense') return false;
        if (!tx.accountId) return false;
        const p = parseDateParts(tx.date);
        return p.month === selectedMonth.month && p.year === selectedMonth.year;
      })
      .forEach(tx => {
        const val = convertToBase(tx.amount, tx.currency, currencyBase);
        byCat[tx.category] = (byCat[tx.category] || 0) + val;
      });

    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currencyBase, selectedMonth]);

  // Total expenses for percentage calculation
  const totalExpenses = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);

  const COLORS = ['#6C4CF1', '#5336D6', '#4C6EF5', '#3B82F6', '#5B8DEF', '#3FA7A3', '#60C2C0', '#9A8FBF', '#D16BA5', '#7C8DB5', '#7E6CD6', '#4A9BE8', '#52B5A8', '#B07DC9', '#6898C4'];
  const isDark = theme === 'dark';

  // --- Credit Card / Debt Chart ---
  const [ccFilter, setCcFilter] = useState<string>('all');

  // CC chart options: "all" + each card + "debts"
  const ccFilterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: language === 'es' ? 'Todas las tarjetas' : 'All Cards' },
    ];
    creditCards.forEach(c => opts.push({ value: c.id, label: c.name }));
    opts.push({ value: 'debts', label: language === 'es' ? 'Deudas' : 'Debts' });
    return opts;
  }, [creditCards, language]);

  // CC bar chart data: daily charges vs payments for selected month
  const ccChartData = useMemo(() => {
    if (ccFilter === 'debts') {
      // Group debt payments by day
      const byDay: Record<number, { newDebt: number; payments: number }> = {};
      debts.forEach(debt => {
        // New debts created this month
        const cp = parseDateParts(debt.createdAt);
        if (cp.month === selectedMonth.month && cp.year === selectedMonth.year) {
          const day = cp.day;
          if (!byDay[day]) byDay[day] = { newDebt: 0, payments: 0 };
          byDay[day].newDebt += convertToBase(debt.totalAmount, debt.currency, currencyBase);
        }
        // Debt payments this month
        debt.payments.forEach(p => {
          const pp = parseDateParts(p.date);
          if (pp.month === selectedMonth.month && pp.year === selectedMonth.year) {
            const day = pp.day;
            if (!byDay[day]) byDay[day] = { newDebt: 0, payments: 0 };
            byDay[day].payments += convertToBase(p.amount, debt.currency, currencyBase);
          }
        });
      });

      const points = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = byDay[day] || { newDebt: 0, payments: 0 };
        points.push({ day, label: `${day}`, charges: Math.round(d.newDebt), payments: Math.round(d.payments) });
      }
      return points;
    }

    // Credit card mode: filter transactions by card
    const cardTxs = transactions.filter(tx => {
      if (!tx.creditCardId) return false;
      if (ccFilter !== 'all' && tx.creditCardId !== ccFilter) return false;
      const p = parseDateParts(tx.date);
      return p.month === selectedMonth.month && p.year === selectedMonth.year;
    });

    const byDay: Record<number, { charges: number; payments: number }> = {};
    cardTxs.forEach(tx => {
      const day = parseDateParts(tx.date).day;
      if (!byDay[day]) byDay[day] = { charges: 0, payments: 0 };
      const val = convertToBase(tx.amount, tx.currency, currencyBase);
      if (tx.category === 'Card Payment') {
        byDay[day].payments += val;
      } else {
        byDay[day].charges += val;
      }
    });

    const points = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = byDay[day] || { charges: 0, payments: 0 };
      points.push({ day, label: `${day}`, charges: Math.round(d.charges), payments: Math.round(d.payments) });
    }
    return points;
  }, [transactions, debts, creditCards, ccFilter, selectedMonth, daysInMonth, currencyBase]);

  // Totals for the CC/debt chart
  const ccTotals = useMemo(() => {
    return ccChartData.reduce((acc, d) => ({
      charges: acc.charges + d.charges,
      payments: acc.payments + d.payments,
    }), { charges: 0, payments: 0 });
  }, [ccChartData]);

  // Custom tooltip for CC chart
  const CCTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isDebt = ccFilter === 'debts';
      return (
        <div className="bg-white dark:bg-[#0B0B12] border border-zinc-200 dark:border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2">
            {language === 'es' ? 'Día' : 'Day'} {data.day}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-red-500">{isDebt ? (language === 'es' ? 'Nuevas deudas' : 'New debts') : (language === 'es' ? 'Cargos' : 'Charges')}</span>
              <span className="font-mono text-xs font-bold text-red-600">
                <Money amount={data.charges} currency={currencyBase} />
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-green-500">{language === 'es' ? 'Pagos' : 'Payments'}</span>
              <span className="font-mono text-xs font-bold text-green-600">
                <Money amount={data.payments} currency={currencyBase} />
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Line Chart
  const LineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0B0B12] border border-zinc-200 dark:border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2">
            {language === 'es' ? 'Día' : 'Day'} {data.day}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-green-500">{language === 'es' ? 'Ingresos' : 'Income'}</span>
              <span className="font-mono text-xs font-bold text-green-600">
                +<Money amount={data.income} currency={currencyBase} />
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-red-500">{language === 'es' ? 'Gastos' : 'Expenses'}</span>
              <span className="font-mono text-xs font-bold text-red-600">
                -<Money amount={data.expense} currency={currencyBase} />
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex justify-between gap-4">
              <span className="text-xs text-brand-500">{language === 'es' ? 'Balance' : 'Balance'}</span>
              <span className="font-mono text-xs font-bold text-brand-600">
                <Money amount={data.balance} currency={currencyBase} />
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Pie Chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-[#0B0B12] border border-zinc-200 dark:border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{data.name}</p>
          <p className="font-mono text-lg font-bold text-brand-600">
            <Money amount={data.value} currency={currencyBase} />
          </p>
          <p className="text-xs text-zinc-400">{percentage}% {language === 'es' ? 'del total' : 'of total'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* Month/Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {language === 'es' ? 'Análisis Financiero' : 'Financial Analytics'}
        </h2>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedMonth.month)}
            onChange={(val) => {
              const m = parseInt(val);
              setSelectedMonth(prev => ({ ...prev, month: m }));
            }}
            options={getMonthOptionsForYear(selectedMonth.year)}
            className="!w-auto min-w-[130px]"
          />
          <Select
            value={String(selectedMonth.year)}
            onChange={(val) => {
              const y = parseInt(val);
              // Clamp month if new year doesn't have that month available
              const months = getMonthOptionsForYear(y);
              const validMonths = months.map(m => parseInt(m.value));
              const clampedMonth = validMonths.includes(selectedMonth.month)
                ? selectedMonth.month
                : validMonths[validMonths.length - 1];
              setSelectedMonth({ year: y, month: clampedMonth });
            }}
            options={yearOptions}
            className="!w-auto min-w-[100px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Line Chart */}
        <Card className="lg:col-span-2 min-h-[450px] flex flex-col relative overflow-hidden group border-brand-500/10 hover:border-brand-500/20">
          <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
            <Activity className="w-40 h-40 text-brand-500" />
          </div>
          <div className="mb-6 relative z-10 px-2 flex justify-between items-end">
            <div>
              <h3 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                {language === 'es' ? 'Flujo de Activos' : 'Asset Flow'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                {language === 'es' ? 'Balance acumulado diario' : 'Daily cumulative balance'}
              </p>
            </div>
            <Badge variant="brand">{language === 'es' ? 'MENSUAL' : 'MONTHLY'}</Badge>
          </div>
          <div className="flex-1 w-full h-[320px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                  interval={Math.floor(daysInMonth / 10)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                  width={50}
                />
                <Tooltip content={<LineTooltip />} cursor={{ stroke: '#7C5CFF', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#7C5CFF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBal)"
                  isAnimationActive={!reduceMotion}
                  animationDuration={1500}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#7C5CFF', className: 'shadow-lg' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card className="flex flex-col relative group">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-zinc-400" />
              {language === 'es' ? 'Distribución de Gastos' : 'Expense Distribution'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              {language === 'es' ? 'Por categoría' : 'By Category'}
            </p>
          </div>

          <div className="w-full flex-1 flex flex-col justify-center items-center relative z-10">
            <div className="w-full h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={pieData.length > 1 ? 4 : 0}
                    dataKey="value"
                    isAnimationActive={!reduceMotion}
                    stroke="none"
                    cornerRadius={4}
                  >
                    {(pieData.length > 0 ? pieData : [{ name: 'No data', value: 1 }]).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={pieData.length > 0 ? COLORS[index % COLORS.length] : '#71717a'}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-none"
                      />
                    ))}
                  </Pie>
                  {pieData.length > 0 && <Tooltip content={<PieTooltip />} />}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center text - moved below the chart */}
            <div className="text-center mt-2 mb-4">
              <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                <Money amount={totalExpenses} currency={currencyBase} />
              </p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                {language === 'es' ? 'Total Gastos' : 'Total Expenses'}
              </p>
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-1.5 justify-center px-2">
              {pieData.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/5 hover:border-brand-500/30 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Credit Card / Debt Chart */}
      <Card className="relative group border-brand-500/10 hover:border-brand-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none overflow-hidden">
          <CreditCardIcon className="w-40 h-40 text-brand-500" />
        </div>
        <div className="mb-4 relative z-30 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-brand-500" />
              {language === 'es' ? 'Tarjetas y Deudas' : 'Cards & Debts'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              {ccFilter === 'debts'
                ? (language === 'es' ? 'Deudas adquiridas vs pagos' : 'New debts vs payments')
                : (language === 'es' ? 'Cargos vs pagos del mes' : 'Charges vs payments this month')}
            </p>
          </div>
          <Select
            value={ccFilter}
            onChange={setCcFilter}
            options={ccFilterOptions}
            className="!w-auto min-w-[160px] relative z-30"
          />
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-700 dark:text-red-400">
              {ccFilter === 'debts' ? (language === 'es' ? 'Nuevas deudas' : 'New debts') : (language === 'es' ? 'Cargos' : 'Charges')}:
            </span>
            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-300">
              <Money amount={ccTotals.charges} currency={currencyBase} />
            </span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-700 dark:text-green-400">
              {language === 'es' ? 'Pagos' : 'Payments'}:
            </span>
            <span className="text-xs font-mono font-bold text-green-600 dark:text-green-300">
              <Money amount={ccTotals.payments} currency={currencyBase} />
            </span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              {language === 'es' ? 'Neto' : 'Net'}:
            </span>
            <span className={cn(
              "text-xs font-mono font-bold",
              ccTotals.charges - ccTotals.payments > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {ccTotals.charges - ccTotals.payments > 0 ? '+' : ''}
              <Money amount={ccTotals.charges - ccTotals.payments} currency={currencyBase} />
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="w-full h-[280px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ccChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                dy={10}
                interval={Math.floor(daysInMonth / 10)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                width={50}
              />
              <Tooltip content={<CCTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              <Bar
                dataKey="charges"
                fill="#EF4444"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduceMotion}
                animationDuration={1000}
              />
              <Bar
                dataKey="payments"
                fill="#22C55E"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduceMotion}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// --- PLANNER VIEW ---
export const PlannerView = () => {
  const { planItems, addPlanItem, updatePlanItem, deletePlanItem, currencyBase, timezone, language } = useApp();
  const tz = timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    return { month: parseInt(parts.find(p => p.type === 'month')!.value) - 1, year: parseInt(parts.find(p => p.type === 'year')!.value) };
  });
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState({ type: 'expense' as 'income' | 'expense' | 'savings', concept: '', planned: '' });

  const monthKey = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}`;

  const monthNames = language === 'es'
    ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthOptions = monthNames.map((name, i) => ({ value: String(i), label: name }));
  const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).formatToParts(new Date());
  const nowYear = parseInt(nowParts.find(p => p.type === 'year')!.value);
  const yearOptions = Array.from({ length: 3 }, (_, i) => ({ value: String(nowYear - 1 + i), label: String(nowYear - 1 + i) }));

  const monthItems = useMemo(() => planItems.filter(p => p.month === monthKey), [planItems, monthKey]);

  // Totals
  const totals = useMemo(() => {
    let planned = 0, real = 0;
    monthItems.forEach(item => {
      const p = convertToBase(item.planned, item.currency, currencyBase);
      const r = convertToBase(item.real || 0, item.currency, currencyBase);
      if (item.type === 'income') { planned += p; real += r; }
      else { planned -= p; real -= r; }
    });
    return { planned, real, diff: real - planned };
  }, [monthItems, currencyBase]);

  const startEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === 'planned' || field === 'real') {
      const num = parseFloat(editValue);
      if (!isNaN(num) && num >= 0) updatePlanItem(id, { [field]: num });
    } else {
      updatePlanItem(id, { [field]: editValue });
    }
    setEditingCell(null);
  };

  const handleAddRow = () => {
    if (!newRow.concept || !newRow.planned) return;
    addPlanItem({
      type: newRow.type,
      concept: newRow.concept,
      planned: parseFloat(newRow.planned),
      real: 0,
      month: monthKey,
      currency: currencyBase,
    });
    setNewRow({ type: 'expense', concept: '', planned: '' });
    setAddingRow(false);
  };

  const typeLabel = (t: string) => {
    if (t === 'income') return language === 'es' ? 'Ingreso' : 'Income';
    if (t === 'savings') return language === 'es' ? 'Ahorro' : 'Savings';
    return language === 'es' ? 'Gasto' : 'Expense';
  };
  const typeColor = (t: string) => {
    if (t === 'income') return 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400';
    if (t === 'savings') return 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400';
    return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400';
  };

  const EditableCell = ({ id, field, value, isMoney }: { id: string; field: string; value: string; isMoney?: boolean }) => {
    const isEditing = editingCell?.id === id && editingCell?.field === field;
    if (isEditing) {
      return (
        <input
          type={isMoney ? 'number' : 'text'}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-full h-7 text-xs font-mono px-2 rounded-md bg-brand-500/10 border border-brand-500/50 outline-none text-zinc-900 dark:text-white"
          autoFocus
        />
      );
    }
    return (
      <button
        onClick={() => startEdit(id, field, value)}
        className={cn("w-full text-xs truncate px-1 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-text", isMoney ? "text-right" : "text-left")}
      >
        {isMoney ? <span className="font-mono"><Money amount={parseFloat(value) || 0} currency={currencyBase} /></span> : (value || <span className="text-zinc-300 dark:text-zinc-600">—</span>)}
      </button>
    );
  };

  const cols = "grid-cols-[90px_1fr_1fr_1fr_1fr_50px_36px]";
  const div = "border-r border-zinc-100 dark:border-white/[0.06]";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {language === 'es' ? 'Planificación Mensual' : 'Monthly Planner'}
        </h2>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth.month)} onChange={val => setSelectedMonth(prev => ({ ...prev, month: parseInt(val) }))} options={monthOptions} className="!w-auto min-w-[130px]" />
          <Select value={String(selectedMonth.year)} onChange={val => setSelectedMonth(prev => ({ ...prev, year: parseInt(val) }))} options={yearOptions} className="!w-auto min-w-[100px]" />
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        {/* Header */}
        <div className={cn("grid gap-0 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-400", cols)}>
          <div className={cn("px-3 py-2.5", div)}>{language === 'es' ? 'Tipo' : 'Type'}</div>
          <div className={cn("px-3 py-2.5", div)}>{language === 'es' ? 'Concepto' : 'Concept'}</div>
          <div className={cn("px-3 py-2.5 text-right", div)}>{language === 'es' ? 'Planificado' : 'Planned'}</div>
          <div className={cn("px-3 py-2.5 text-right", div)}>Real</div>
          <div className={cn("px-3 py-2.5 text-right", div)}>{language === 'es' ? 'Diferencia' : 'Diff'}</div>
          <div className={cn("px-3 py-2.5 text-center", div)}></div>
          <div className="px-1 py-2.5"></div>
        </div>

        {/* Rows */}
        {monthItems.map((item, idx) => {
          const planned = convertToBase(item.planned, item.currency, currencyBase);
          const real = convertToBase(item.real || 0, item.currency, currencyBase);
          const diff = item.type === 'income' ? real - planned : planned - real;
          const pct = planned > 0 ? (real / planned) * 100 : 0;
          const isOver = item.type === 'expense' && real > planned;
          const statusColor = item.type === 'income'
            ? (pct >= 100 ? 'bg-green-500' : pct > 60 ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600')
            : (isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500');

          return (
            <div key={item.id} className={cn(
              "grid gap-0 items-center border-b border-zinc-100 dark:border-white/5 group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors",
              cols,
              idx % 2 === 1 && "bg-zinc-50/30 dark:bg-white/[0.01]"
            )}>
              <div className={cn("px-2 py-2 flex items-center justify-center", div)}>
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", typeColor(item.type))}>
                  {typeLabel(item.type)}
                </span>
              </div>
              <div className={cn("px-2 py-1", div)}><EditableCell id={item.id} field="concept" value={item.concept} /></div>
              <div className={cn("px-2 py-1", div)}><EditableCell id={item.id} field="planned" value={String(item.planned)} isMoney /></div>
              <div className={cn("px-2 py-1", div)}><EditableCell id={item.id} field="real" value={String(item.real || 0)} isMoney /></div>
              <div className={cn("px-2 py-1 text-right", div)}>
                <span className={cn("text-xs font-mono font-bold", diff >= 0 ? "text-green-500" : "text-red-500")}>
                  {diff >= 0 ? '+' : ''}<Money amount={diff} currency={currencyBase} />
                </span>
              </div>
              <div className={cn("px-2 py-1 flex items-center justify-center", div)}>
                <div className="w-8 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", statusColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
              <div className="px-1 py-1 flex justify-center">
                <button onClick={() => deletePlanItem(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add row */}
        {addingRow ? (
          <div className={cn("grid gap-0 items-center border-b border-zinc-100 dark:border-white/5 bg-brand-500/5", cols)}>
            <div className={cn("px-1.5 py-1.5 flex items-center justify-center", div)}>
              <div className="flex flex-col gap-0.5 w-full px-0.5">
                {(['expense', 'income', 'savings'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewRow({ ...newRow, type: t })}
                    className={cn(
                      "text-[9px] font-bold uppercase px-1.5 py-1 rounded-md transition-colors text-center",
                      newRow.type === t
                        ? t === 'income' ? 'bg-green-500 text-white' : t === 'savings' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                        : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'
                    )}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </div>
            <div className={cn("px-2 py-1", div)}>
              <input
                value={newRow.concept}
                onChange={e => setNewRow({ ...newRow, concept: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); if (e.key === 'Escape') setAddingRow(false); }}
                placeholder={language === 'es' ? 'Concepto...' : 'Concept...'}
                className="w-full h-7 text-xs px-2 rounded-md bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 outline-none"
                autoFocus
              />
            </div>
            <div className={cn("px-2 py-1", div)}>
              <input
                type="number"
                value={newRow.planned}
                onChange={e => setNewRow({ ...newRow, planned: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); }}
                placeholder="0"
                className="w-full h-7 text-xs font-mono px-2 rounded-md bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 outline-none text-right"
              />
            </div>
            <div className={cn("px-2 py-1 text-right text-xs text-zinc-300", div)}>—</div>
            <div className={cn("px-2 py-1 text-right text-xs text-zinc-300", div)}>—</div>
            <div className={cn("px-2 py-1 text-center text-xs text-zinc-300", div)}>—</div>
            <div className="px-1 py-1 flex justify-center">
              <button onClick={handleAddRow} className="text-brand-500 hover:text-brand-400 p-0.5">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Summary */}
        {monthItems.length > 0 && (
          <div className={cn("grid gap-0 items-center bg-zinc-50 dark:bg-white/5 border-t border-zinc-200 dark:border-white/10", cols)}>
            <div className={cn("px-3 py-2.5 col-span-2", div)}>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{language === 'es' ? 'Balance neto' : 'Net balance'}</span>
            </div>
            <div className={cn("px-2 py-2.5 text-right", div)}>
              <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300"><Money amount={Math.abs(totals.planned)} currency={currencyBase} /></span>
            </div>
            <div className={cn("px-2 py-2.5 text-right", div)}>
              <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300"><Money amount={Math.abs(totals.real)} currency={currencyBase} /></span>
            </div>
            <div className={cn("px-2 py-2.5 text-right", div)}>
              <span className={cn("text-xs font-mono font-bold", totals.diff >= 0 ? "text-green-500" : "text-red-500")}>
                {totals.diff >= 0 ? '+' : ''}<Money amount={totals.diff} currency={currencyBase} />
              </span>
            </div>
            <div className="col-span-2"></div>
          </div>
        )}

        {/* Add row button */}
        <button
          onClick={() => setAddingRow(true)}
          className="w-full py-2.5 text-xs font-medium text-zinc-400 hover:text-brand-500 hover:bg-brand-500/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> {language === 'es' ? 'Agregar fila' : 'Add row'}
        </button>
      </Card>
    </div>
  );
};

// --- ACCOUNTS VIEW ---
export const AccountsView = () => {
  const {
    accounts, addAccount, deleteAccount, updateAccount, addTransaction, transactions, timezone, t, user, language,
    sharedAccounts, createSharedAccount, joinSharedAccount, leaveSharedAccount, addSharedTransaction, deleteSharedTransaction, regenerateInviteCode
  } = useApp();

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsAccount, setSettingsAccount] = useState<typeof accounts[0] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'transfer' | 'expense' | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [newAcc, setNewAcc] = useState({ name: '', type: 'individual' as 'individual' | 'shared', currency: 'COP' as Currency, initialBalance: '' });

  // Shared account state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [activeSharedAccount, setActiveSharedAccount] = useState<SharedAccount | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSharedTxForm, setShowSharedTxForm] = useState(false);
  const [sharedTx, setSharedTx] = useState({ type: 'expense' as 'income' | 'expense', amount: '', category: '', note: '', isShared: true });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [leaveAction, setLeaveAction] = useState<'transfer' | 'forfeit' | null>(null);
  const [leaveTransferTo, setLeaveTransferTo] = useState('');
  const [leaveRecipient, setLeaveRecipient] = useState('');

  // Calculate account balance from transactions
  const getAccountBalance = (accountId: string) => {
    return transactions
      .filter(tx => tx.accountId === accountId)
      .reduce((sum, tx) => {
        if (tx.type === 'income') return sum + tx.amount;
        if (tx.type === 'expense') return sum - tx.amount;
        return sum + tx.amount;
      }, 0);
  };

  // Get other accounts for transfer (same currency)
  const getTransferableAccounts = () => {
    if (!settingsAccount) return [];
    return accounts.filter(acc => acc.id !== settingsAccount.id && acc.currency === settingsAccount.currency);
  };

  // Per-member balance for shared accounts
  const getMemberBalances = (sa: SharedAccount) => {
    const members = Object.keys(sa.members);
    const balances: Record<string, { contributed: number; spent: number; sharedExpense: number; net: number }> = {};
    members.forEach(uid => { balances[uid] = { contributed: 0, spent: 0, sharedExpense: 0, net: 0 }; });

    const totalSharedExpense = (sa.transactions || []).reduce((sum, tx) => {
      if (tx.type === 'income') {
        balances[tx.createdBy] && (balances[tx.createdBy].contributed += tx.amount);
      } else if (tx.type === 'expense') {
        if (tx.isShared) {
          sum += tx.amount;
        } else {
          balances[tx.createdBy] && (balances[tx.createdBy].spent += tx.amount);
        }
      }
      return sum;
    }, 0);

    const sharePerMember = totalSharedExpense / (members.length || 1);
    members.forEach(uid => {
      balances[uid].sharedExpense = sharePerMember;
      balances[uid].net = balances[uid].contributed - balances[uid].spent - sharePerMember;
    });

    return balances;
  };

  // Shared account total balance
  const getSharedBalance = (sa: SharedAccount) => {
    return (sa.transactions || []).reduce((sum, tx) => {
      if (tx.type === 'income') return sum + tx.amount;
      if (tx.type === 'expense') return sum - tx.amount;
      return sum + tx.amount;
    }, 0);
  };

  const handleSave = async () => {
    if (!newAcc.name) return;
    if (newAcc.type === 'shared') {
      await createSharedAccount(newAcc.name, newAcc.currency);
    } else {
      addAccount({
        name: newAcc.name,
        type: 'individual',
        currency: newAcc.currency,
        initialBalance: newAcc.initialBalance ? parseFloat(newAcc.initialBalance) : undefined
      });
    }
    setIsModalOpen(false);
    setNewAcc({ name: '', type: 'individual', currency: 'COP', initialBalance: '' });
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    await joinSharedAccount(joinCode);
    setJoining(false);
    setJoinCode('');
    setShowJoinInput(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddSharedTx = async () => {
    if (!activeSharedAccount || !sharedTx.amount || !sharedTx.category) return;
    await addSharedTransaction(activeSharedAccount.id, {
      type: sharedTx.type,
      amount: parseFloat(sharedTx.amount),
      currency: activeSharedAccount.currency,
      category: sharedTx.category,
      note: sharedTx.note,
      date: dateToISO(getTodayStr(timezone)),
      isShared: sharedTx.type === 'expense' ? sharedTx.isShared : false,
    });
    setSharedTx({ type: 'expense', amount: '', category: '', note: '', isShared: true });
    setShowSharedTxForm(false);
  };

  const handleDelete = () => {
    if (!settingsAccount) return;
    const balance = getAccountBalance(settingsAccount.id);
    if (balance > 0) {
      if (deleteAction === 'transfer' && transferToAccountId) {
        addTransaction({ type: 'adjustment', amount: balance, currency: settingsAccount.currency, accountId: transferToAccountId, category: 'Transfer', note: `Transferred from ${settingsAccount.name}`, date: dateToISO(getTodayStr(timezone)) });
      } else if (deleteAction === 'expense') {
        addTransaction({ type: 'expense', amount: balance, currency: settingsAccount.currency, accountId: settingsAccount.id, category: 'Account Closure', note: language === 'es' ? 'Cierre de cuenta' : 'Account closure', date: dateToISO(getTodayStr(timezone)) });
      }
    }
    deleteAccount(settingsAccount.id);
    resetDeleteState();
  };

  const resetDeleteState = () => {
    setSettingsAccount(null);
    setShowDeleteConfirm(false);
    setDeleteAction(null);
    setTransferToAccountId('');
  };

  const accountBalance = settingsAccount ? getAccountBalance(settingsAccount.id) : 0;
  const transferableAccounts = getTransferableAccounts();
  const hasBalance = accountBalance > 0;

  // --- Shared Account Detail View ---
  if (activeSharedAccount) {
    const sa = sharedAccounts.find(s => s.id === activeSharedAccount.id) || activeSharedAccount;
    const members = Object.entries(sa.members) as [string, SharedAccountMember][];
    const balances = getMemberBalances(sa);
    const totalBalance = getSharedBalance(sa);
    const isOwner = sa.ownerId === user?.uid;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveSharedAccount(null); setShowLeaveConfirm(false); }} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{sa.name}</h2>
            <p className="text-sm text-zinc-500">{sa.currency} · {members.length} {t('shared.members').toLowerCase()}</p>
          </div>
          <Button onClick={() => setShowSharedTxForm(true)}>
            <Plus className="w-4 h-4" />
            {t('shared.add_tx')}
          </Button>
        </div>

        {/* Balance + Invite Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{t('shared.balance')}</p>
            <p className={`text-3xl font-mono font-bold ${totalBalance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
              <Money amount={totalBalance} currency={sa.currency} />
            </p>
          </Card>
          <Card>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{t('shared.invite_code')}</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-2xl font-mono font-bold text-zinc-900 dark:text-white tracking-[0.2em]">
                {showInviteCode ? sa.inviteCode : '••••••••'}
              </code>
              <button onClick={() => setShowInviteCode(!showInviteCode)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                {showInviteCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => handleCopyCode(sa.inviteCode)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                {copiedCode ? <Check className="w-4 h-4 text-brand-500" /> : <Copy className="w-4 h-4" />}
              </button>
              {isOwner && (
                <button onClick={() => regenerateInviteCode(sa.id)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-white" title={t('shared.regenerate')}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Members + Balances */}
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> {t('shared.members')}
          </h3>
          <div className="space-y-3">
            {members.map(([uid, member]) => {
              const b = balances[uid] || { contributed: 0, spent: 0, sharedExpense: 0, net: 0 };
              return (
                <div key={uid} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-600">
                    {member.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">{member.displayName}</span>
                      {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-mono font-bold ${b.net >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                      <Money amount={b.net} currency={sa.currency} />
                    </p>
                    <p className="text-[10px] text-zinc-400">{t('shared.net')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t('shared.transactions')}</h3>
            <span className="text-[10px] text-zinc-400">{language === 'es' ? 'Editable solo 24h' : 'Editable 24h only'}</span>
          </div>
          {(!sa.transactions || sa.transactions.length === 0) ? (
            <p className="text-sm text-zinc-500 text-center py-8">{t('shared.no_transactions')}</p>
          ) : (
            <div className="space-y-2">
              {sa.transactions.map(tx => {
                const isDeletable = (Date.now() - tx.createdAt) < (24 * 60 * 60 * 1000);
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-brand-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{tx.category}</span>
                        {tx.isShared && <Badge variant="brand" className="text-[10px] !py-0 !px-1.5">{language === 'es' ? 'compartido' : 'shared'}</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500">{tx.createdByName} · {new Date(tx.date).toLocaleDateString()}{tx.note ? ` · ${tx.note}` : ''}</p>
                    </div>
                    <span className={`text-sm font-mono font-bold shrink-0 ${tx.type === 'income' ? 'text-brand-500' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}<Money amount={tx.amount} currency={sa.currency} />
                    </span>
                    {isDeletable ? (
                      <button
                        onClick={() => { if (confirm(t('shared.delete_confirm'))) deleteSharedTransaction(sa.id, tx.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('st.locked')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Leave Account */}
        <div className="flex justify-end">
          {!showLeaveConfirm ? (
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => { setShowLeaveConfirm(true); setLeaveAction(null); setLeaveTransferTo(''); setLeaveRecipient(''); }}>
              <LogOut className="w-4 h-4" />
              {t('shared.leave')}
            </Button>
          ) : (() => {
            const myBalance = balances[user?.uid || '']?.net || 0;
            const hasMyBalance = myBalance > 0;
            const otherMembers = members.filter(([uid]) => uid !== user?.uid);
            const autoRecipient = otherMembers.length === 1 ? otherMembers[0][0] : '';

            const handleLeave = async () => {
              if (hasMyBalance) {
                if (leaveAction === 'transfer' && leaveTransferTo) {
                  // Withdrawal from shared account
                  await addSharedTransaction(sa.id, {
                    type: 'expense', amount: myBalance, currency: sa.currency,
                    category: language === 'es' ? 'Retiro por salida' : 'Exit withdrawal',
                    note: user?.displayName || '', date: dateToISO(getTodayStr(timezone)), isShared: false,
                  });
                  // Credit to personal account
                  addTransaction({ type: 'adjustment', amount: myBalance, currency: sa.currency, accountId: leaveTransferTo, category: 'Transfer', note: language === 'es' ? `Mi parte de ${sa.name}` : `My share from ${sa.name}`, date: dateToISO(getTodayStr(timezone)) });
                } else if (leaveAction === 'forfeit') {
                  const recipientUid = leaveRecipient || autoRecipient;
                  const recipientMember = sa.members[recipientUid];
                  // Record: expense from leaving member + income to recipient (net zero for shared balance)
                  await addSharedTransaction(sa.id, {
                    type: 'expense', amount: myBalance, currency: sa.currency,
                    category: language === 'es' ? 'Cesión por salida' : 'Exit forfeit',
                    note: user?.displayName || '', date: dateToISO(getTodayStr(timezone)), isShared: false,
                  });
                  await addSharedTransaction(sa.id, {
                    type: 'income', amount: myBalance, currency: sa.currency,
                    category: language === 'es' ? 'Saldo recibido' : 'Balance received',
                    note: language === 'es' ? `Cedido por ${user?.displayName || ''}` : `Forfeited by ${user?.displayName || ''}`,
                    date: dateToISO(getTodayStr(timezone)), isShared: false,
                  }, { createdBy: recipientUid, createdByName: recipientMember?.displayName || 'Member' });
                }
              }
              await leaveSharedAccount(sa.id);
              setActiveSharedAccount(null);
            };

            return (
              <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                {hasMyBalance ? (
                  <>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center">
                      {language === 'es'
                        ? `Tu balance neto es de ${myBalance.toLocaleString()} ${sa.currency}. ¿Qué deseas hacer?`
                        : `Your net balance is ${myBalance.toLocaleString()} ${sa.currency}. What do you want to do?`}
                    </p>
                    <div className="space-y-2">
                      {/* Transfer to personal account */}
                      {accounts.filter(a => a.currency === sa.currency).length > 0 && (
                        <button
                          className={cn('w-full p-3 rounded-lg border text-left text-sm flex items-center gap-3 transition-all', leaveAction === 'transfer' ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-zinc-200 dark:border-white/10 hover:border-brand-500/50')}
                          onClick={() => { setLeaveAction('transfer'); setLeaveTransferTo(accounts.filter(a => a.currency === sa.currency)[0]?.id || ''); }}
                        >
                          <CreditCardIcon className="w-4 h-4" />
                          {language === 'es' ? 'Retirar a cuenta personal' : 'Withdraw to personal account'}
                        </button>
                      )}
                      {leaveAction === 'transfer' && (
                        <Select
                          value={leaveTransferTo}
                          onChange={setLeaveTransferTo}
                          options={accounts.filter(a => a.currency === sa.currency).map(a => ({ value: a.id, label: a.name }))}
                          className="mt-2"
                        />
                      )}
                      {/* Forfeit to another member */}
                      <button
                        className={cn('w-full p-3 rounded-lg border text-left text-sm flex items-center gap-3 transition-all', leaveAction === 'forfeit' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-zinc-200 dark:border-white/10 hover:border-amber-500/50')}
                        onClick={() => { setLeaveAction('forfeit'); setLeaveRecipient(autoRecipient); }}
                      >
                        <UserPlus className="w-4 h-4" />
                        {language === 'es' ? 'Ceder saldo a un miembro' : 'Forfeit balance to a member'}
                      </button>
                      {leaveAction === 'forfeit' && otherMembers.length > 1 && (
                        <Select
                          value={leaveRecipient}
                          onChange={setLeaveRecipient}
                          options={otherMembers.map(([uid, m]) => ({ value: uid, label: m.displayName }))}
                          className="mt-2"
                        />
                      )}
                      {leaveAction === 'forfeit' && otherMembers.length === 1 && (
                        <p className="text-xs text-zinc-500 ml-1">
                          → {otherMembers[0][1].displayName}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">{t('shared.leave_confirm')}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowLeaveConfirm(false)}>{t('act.cancel')}</Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={hasMyBalance && (!leaveAction || (leaveAction === 'forfeit' && otherMembers.length > 1 && !leaveRecipient))}
                    onClick={handleLeave}
                  >
                    {t('shared.leave')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Add Shared Transaction Modal */}
        <Modal isOpen={showSharedTxForm} onClose={() => setShowSharedTxForm(false)} title={t('shared.add_tx')}>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(typ => (
                <button
                  key={typ}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border',
                    sharedTx.type === typ
                      ? typ === 'income' ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-red-500 bg-red-500/10 text-red-600'
                      : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-300'
                  )}
                  onClick={() => setSharedTx({ ...sharedTx, type: typ })}
                >
                  {typ === 'income' ? (language === 'es' ? 'Ingreso' : 'Income') : (language === 'es' ? 'Gasto' : 'Expense')}
                </button>
              ))}
            </div>
            <Input label={t('lbl.amount')} type="number" value={sharedTx.amount} onChange={e => setSharedTx({ ...sharedTx, amount: e.target.value })} placeholder="0" />
            <Input label={t('lbl.category')} value={sharedTx.category} onChange={e => setSharedTx({ ...sharedTx, category: e.target.value })} placeholder={language === 'es' ? 'ej. Comida' : 'e.g. Food'} />
            <Input label={t('lbl.desc')} value={sharedTx.note} onChange={e => setSharedTx({ ...sharedTx, note: e.target.value })} placeholder={language === 'es' ? 'Opcional' : 'Optional'} />
            {sharedTx.type === 'expense' && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-xl">
                <button
                  className={cn('flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all', sharedTx.isShared ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-zinc-200 dark:border-white/10 text-zinc-500')}
                  onClick={() => setSharedTx({ ...sharedTx, isShared: true })}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1.5" />{t('shared.shared_expense')}
                </button>
                <button
                  className={cn('flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all', !sharedTx.isShared ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-zinc-200 dark:border-white/10 text-zinc-500')}
                  onClick={() => setSharedTx({ ...sharedTx, isShared: false })}
                >
                  <User className="w-3.5 h-3.5 inline mr-1.5" />{t('shared.personal_expense')}
                </button>
              </div>
            )}
            <Button className="w-full mt-2" onClick={handleAddSharedTx}>{t('act.save')}</Button>
          </div>
        </Modal>
      </div>
    );
  }

  // --- Main Accounts List View ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.accounts')}</h2>
        <div className="flex gap-2">
          {!showJoinInput ? (
            <Button variant="secondary" onClick={() => setShowJoinInput(true)}>
              <UserPlus className="w-4 h-4" />
              {t('shared.join')}
            </Button>
          ) : (
            <div className="flex gap-2 items-center">
              <Input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('shared.join_placeholder')}
                className="!w-44 font-mono tracking-wider uppercase"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
                {joining ? '...' : <Check className="w-4 h-4" />}
              </Button>
              <button onClick={() => { setShowJoinInput(false); setJoinCode(''); }} className="text-zinc-400 hover:text-zinc-600 p-1">✕</button>
            </div>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {language === 'es' ? 'Nueva Cuenta' : 'Add Account'}
          </Button>
        </div>
      </div>

      {/* Individual Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => {
          const balance = getAccountBalance(acc.id);
          return (
            <Card
              key={acc.id}
              className="relative group overflow-hidden cursor-pointer hover:border-brand-500/30 transition-all"
              onClick={() => setSettingsAccount(acc)}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <Badge variant="neutral" className="mb-4">individual</Badge>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{acc.name}</h3>
                <p className={`text-2xl font-mono font-bold mb-2 ${balance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                  <Money amount={balance} currency={acc.currency} />
                </p>
                <p className="text-xs text-zinc-500 font-mono">{acc.currency}</p>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
            </Card>
          );
        })}

        {/* Shared Accounts */}
        {sharedAccounts.map(sa => {
          const balance = getSharedBalance(sa);
          const memberList = Object.values(sa.members) as SharedAccountMember[];
          return (
            <Card
              key={sa.id}
              className="relative group overflow-hidden cursor-pointer hover:border-brand-500/30 transition-all"
              onClick={() => setActiveSharedAccount(sa)}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Users className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <Badge variant="brand" className="mb-4">{language === 'es' ? 'compartida' : 'shared'}</Badge>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{sa.name}</h3>
                <p className={`text-2xl font-mono font-bold mb-2 ${balance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                  <Money amount={balance} currency={sa.currency} />
                </p>
                <p className="text-xs text-zinc-500 font-mono">{sa.currency}</p>
                <div className="flex items-center -space-x-2 mt-4">
                  {memberList.slice(0, 5).map((m, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-brand-500/10 border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold text-brand-600" title={m.displayName}>
                      {m.displayName[0]?.toUpperCase()}
                    </div>
                  ))}
                  {memberList.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold">
                      +{memberList.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {accounts.length === 0 && sharedAccounts.length === 0 && (
        <Card className="text-center py-12">
          <Wallet className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">{t('empty.generic')}</p>
        </Card>
      )}

      {/* Add Account Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setNewAcc({ name: '', type: 'individual', currency: 'COP', initialBalance: '' }); }} title={language === 'es' ? 'Nueva Cuenta' : 'Add New Account'}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['individual', 'shared'] as const).map(typ => (
              <button
                key={typ}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2',
                  newAcc.type === typ ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-300'
                )}
                onClick={() => setNewAcc({ ...newAcc, type: typ })}
              >
                {typ === 'individual' ? <Wallet className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {typ === 'individual' ? 'Individual' : (language === 'es' ? 'Compartida' : 'Shared')}
              </button>
            ))}
          </div>
          <Input label={t('shared.name')} value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} placeholder={language === 'es' ? 'ej. Ahorros' : 'e.g. Savings'} />
          {newAcc.type === 'individual' && (
            <Input label={language === 'es' ? 'Saldo Inicial' : 'Initial Balance'} type="number" value={newAcc.initialBalance} onChange={e => setNewAcc({ ...newAcc, initialBalance: e.target.value })} placeholder="0" />
          )}
          <Select label={language === 'es' ? 'Moneda' : 'Currency'} value={newAcc.currency} onChange={v => setNewAcc({ ...newAcc, currency: v as Currency })} options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
          <Button className="w-full mt-4" onClick={handleSave}>
            {newAcc.type === 'shared' ? t('shared.create') : (language === 'es' ? 'Crear Cuenta' : 'Create Account')}
          </Button>
        </div>
      </Modal>

      {/* Individual Account Settings Modal */}
      <Modal isOpen={!!settingsAccount} onClose={resetDeleteState} title={settingsAccount?.name || ''}>
        {settingsAccount && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-xl">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Balance</p>
              <p className={`text-3xl font-mono font-bold ${accountBalance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                <Money amount={accountBalance} currency={settingsAccount.currency} />
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">{language === 'es' ? 'Tipo' : 'Type'}</span><span className="font-medium capitalize">{settingsAccount.type}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">{language === 'es' ? 'Moneda' : 'Currency'}</span><span className="font-medium">{settingsAccount.currency}</span></div>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-white/10">
              {!showDeleteConfirm ? (
                <Button variant="danger" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />
                  {language === 'es' ? 'Eliminar Cuenta' : 'Delete Account'}
                </Button>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                  {hasBalance && (
                    <>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center">
                        {language === 'es'
                          ? `Esta cuenta tiene un saldo de ${accountBalance.toLocaleString()} ${settingsAccount.currency}. ¿Qué deseas hacer con el saldo?`
                          : `This account has a balance of ${accountBalance.toLocaleString()} ${settingsAccount.currency}. What do you want to do with it?`}
                      </p>
                      <div className="space-y-2">
                        {transferableAccounts.length > 0 && (
                          <button
                            className={`w-full p-3 rounded-lg border text-left text-sm flex items-center gap-3 transition-all ${deleteAction === 'transfer' ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-zinc-200 dark:border-white/10 hover:border-brand-500/50'}`}
                            onClick={() => { setDeleteAction('transfer'); setTransferToAccountId(transferableAccounts[0]?.id || ''); }}
                          >
                            <CreditCardIcon className="w-4 h-4" />
                            {language === 'es' ? 'Transferir a otra cuenta' : 'Transfer to another account'}
                          </button>
                        )}
                        {deleteAction === 'transfer' && (
                          <Select value={transferToAccountId} onChange={setTransferToAccountId} options={transferableAccounts.map(acc => ({ value: acc.id, label: acc.name }))} className="mt-2" />
                        )}
                        <button
                          className={`w-full p-3 rounded-lg border text-left text-sm flex items-center gap-3 transition-all ${deleteAction === 'expense' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-zinc-200 dark:border-white/10 hover:border-red-500/50'}`}
                          onClick={() => setDeleteAction('expense')}
                        >
                          <Trash2 className="w-4 h-4" />
                          {language === 'es' ? 'Marcar como retiro/gasto' : 'Mark as withdrawal/expense'}
                        </button>
                      </div>
                    </>
                  )}
                  {!hasBalance && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      {language === 'es' ? '¿Estás seguro? Esta acción no se puede deshacer.' : 'Are you sure? This cannot be undone.'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={resetDeleteState}>{t('act.cancel')}</Button>
                    <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={hasBalance && !deleteAction}>{t('act.delete')}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// --- GOALS VIEW ---
export const GoalsView = () => {
  const { goals, accounts, addGoal, contributeToGoal, deleteGoal, t, language, timezone } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', currency: 'COP', deadline: '' });
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  // Per-goal contribution state
  const [contribAmounts, setContribAmounts] = useState<Record<string, string>>({});
  const [contribAccounts, setContribAccounts] = useState<Record<string, string>>({});

  const handleSave = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;
    addGoal({
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: 0,
      currency: newGoal.currency as any,
      status: 'active',
      contributions: [],
      ...(newGoal.deadline ? { deadline: newGoal.deadline } : {}),
    });
    setIsModalOpen(false);
    setNewGoal({ name: '', targetAmount: '', currency: 'COP', deadline: '' });
  };

  const handleContribute = (goalId: string) => {
    const amount = parseFloat(contribAmounts[goalId] || '');
    const accountId = contribAccounts[goalId];
    if (!amount || amount <= 0 || !accountId) return;
    contributeToGoal(goalId, amount, accountId);
    setContribAmounts(prev => ({ ...prev, [goalId]: '' }));
  };

  const getDaysRemaining = (deadline: string) => {
    const tz = timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const today = new Date(todayStr);
    const target = new Date(deadline.split('T')[0]);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.goals')}</h2>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> {language === 'es' ? 'Nueva Meta' : 'New Goal'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isComplete = goal.status === 'completed';
          const isExpanded = expandedGoal === goal.id;
          const contributions = goal.contributions || [];

          return (
            <Card key={goal.id} className={cn(isComplete && 'border-green-500/30 bg-green-500/5')}>
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white truncate">{goal.name}</h3>
                    {isComplete && (
                      <Badge variant="brand" className="!bg-green-500/20 !text-green-600 dark:!text-green-400 shrink-0">
                        <Check className="w-3 h-3 mr-1" /> {language === 'es' ? 'Cumplida' : 'Complete'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-zinc-500 font-mono">
                      {language === 'es' ? 'Meta' : 'Target'}: <Money amount={goal.targetAmount} currency={goal.currency} />
                    </p>
                    {goal.deadline && !isComplete && (() => {
                      const days = getDaysRemaining(goal.deadline);
                      return (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          days < 0 ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                          days <= 30 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                          "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                        )}>
                          {days < 0
                            ? (language === 'es' ? `${Math.abs(days)}d vencida` : `${Math.abs(days)}d overdue`)
                            : (language === 'es' ? `${days}d restantes` : `${days}d left`)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)} className="h-7 w-7 text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Amount + Progress */}
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-black text-brand-500"><Money amount={goal.currentAmount} currency={goal.currency} /></span>
                <span className="text-xs font-mono font-bold text-zinc-400">{progress.toFixed(0)}%</span>
              </div>
              <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div
                  className={cn("absolute h-full rounded-full transition-all duration-1000", isComplete ? "bg-green-500" : "bg-brand-500")}
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', transform: 'skewX(-20deg)' }} />
                </div>
              </div>

              {/* Contribution input (only if not complete) */}
              {!isComplete && (
                <div className="space-y-2">
                  <Select
                    label={language === 'es' ? 'Cuenta' : 'Account'}
                    value={contribAccounts[goal.id] || ''}
                    onChange={v => setContribAccounts(prev => ({ ...prev, [goal.id]: v }))}
                    options={accounts.map(a => ({ value: a.id, label: a.name }))}
                  />
                  <div className="flex gap-2 items-end">
                    <Input
                      label={language === 'es' ? 'Monto' : 'Amount'}
                      type="number"
                      value={contribAmounts[goal.id] || ''}
                      onChange={e => setContribAmounts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="0"
                      className="flex-1"
                    />
                    <Button onClick={() => handleContribute(goal.id)} className="h-9 px-4 shrink-0">
                      <Plus className="w-4 h-4 mr-1" /> {language === 'es' ? 'Abonar' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contributions history toggle */}
              {contributions.length > 0 && (
                <div className="mt-3 border-t border-zinc-200 dark:border-white/10 pt-3">
                  <button
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                    className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-brand-500 transition-colors w-full"
                  >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                    {language === 'es' ? `${contributions.length} abonos` : `${contributions.length} contributions`}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {[...contributions].reverse().map(c => {
                        const acc = accounts.find(a => a.id === c.accountId);
                        return (
                          <div key={c.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-50 dark:bg-white/5">
                            <span className="text-zinc-500 font-mono">{c.date.split('T')[0]}</span>
                            <span className="text-zinc-400">{acc?.name || '—'}</span>
                            <span className="font-bold font-mono text-brand-500">+<Money amount={c.amount} currency={goal.currency} /></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {goals.length === 0 && (
        <Card className="text-center py-12">
          <Target className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {language === 'es' ? 'No tienes metas aún. ¡Crea una para empezar a ahorrar!' : 'No goals yet. Create one to start saving!'}
          </p>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={language === 'es' ? 'Nueva Meta' : 'New Goal'}>
        <div className="space-y-4">
          <Input label={language === 'es' ? 'Nombre' : 'Goal Name'} value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder={language === 'es' ? 'ej. Carro nuevo' : 'e.g. New Car'} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={language === 'es' ? 'Monto objetivo' : 'Target Amount'} type="number" value={newGoal.targetAmount} onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })} />
            <Select
              label={language === 'es' ? 'Moneda' : 'Currency'}
              value={newGoal.currency}
              onChange={v => setNewGoal({ ...newGoal, currency: v })}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
            />
          </div>
          <DatePicker
            label={language === 'es' ? 'Fecha límite (opcional)' : 'Deadline (optional)'}
            value={newGoal.deadline}
            onChange={v => setNewGoal({ ...newGoal, deadline: v })}
          />
          <Button className="w-full mt-4" onClick={handleSave}>{language === 'es' ? 'Crear Meta' : 'Create Goal'}</Button>
        </div>
      </Modal>
    </div>
  );
};

// --- DEBTS VIEW ---
export const DebtsView = () => {
  const { debts, creditCards, transactions, accounts, timezone, addDebt, deleteDebt, payDebt, addCreditCard, updateCreditCard, deleteCreditCard, chargeCreditCard, payCreditCard, recalcCCBalances, addTransaction, t, language } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<typeof debts[0] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newDebt, setNewDebt] = useState({ person: '', amount: '', type: 'i_owe', currency: 'COP' });

  // Credit card state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editCard, setEditCard] = useState<CreditCardType | null>(null);
  const [cardPayAmount, setCardPayAmount] = useState('');
  const [cardPayAccountId, setCardPayAccountId] = useState('');
  const [cardChargeAmount, setCardChargeAmount] = useState('');
  const [cardChargeDate, setCardChargeDate] = useState(getTodayStr(timezone));
  const [cardPayDate, setCardPayDate] = useState(getTodayStr(timezone));
  const [isEditingCardInfo, setIsEditingCardInfo] = useState(false);
  const [editCardForm, setEditCardForm] = useState({ name: '', creditLimit: '', currency: 'COP', cutoffDay: '', cutoffMode: 'fixed' as 'fixed' | 'relative', paymentDay: '', paymentMode: 'fixed' as 'fixed' | 'relative' });
  const [newCard, setNewCard] = useState({ name: '', creditLimit: '', currency: 'COP', cutoffDay: '', cutoffMode: 'fixed' as 'fixed' | 'relative', paymentDay: '', paymentMode: 'fixed' as 'fixed' | 'relative' });
  const [showCardDeleteConfirm, setShowCardDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (!newDebt.person || !newDebt.amount) return;
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

  const handlePayment = () => {
    if (!editDebt || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;
    payDebt(editDebt.id, amount);
    setPaymentAmount('');
    // Update local state to reflect payment
    setEditDebt({
      ...editDebt,
      payments: [...editDebt.payments, { id: Date.now().toString(), amount, date: dateToISO(getTodayStr(timezone)) }]
    });
  };

  const getPaidAmount = (debt: typeof debts[0]) => debt.payments.reduce((acc, p) => acc + p.amount, 0);
  const getRemaining = (debt: typeof debts[0]) => debt.totalAmount - getPaidAmount(debt);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.debts')}</h2>
        <Button onClick={() => setIsModalOpen(true)} variant="danger" className="bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20">
          <Shield className="w-4 h-4" />
          {language === 'es' ? 'Registrar Deuda' : 'Log Debt'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {debts.map(debt => {
          const paid = getPaidAmount(debt);
          const progress = Math.min((paid / debt.totalAmount) * 100, 100);
          const isOwedToMe = debt.type === 'owes_me';

          return (
            <Card
              key={debt.id}
              variant={isOwedToMe ? 'default' : 'alert'}
              className="cursor-pointer hover:border-brand-500/30 transition-all"
              onClick={() => setEditDebt(debt)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isOwedToMe ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {isOwedToMe
                        ? (language === 'es' ? 'Por Cobrar' : 'Receivable')
                        : (language === 'es' ? 'Por Pagar' : 'Liability')}
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
                  <span>{language === 'es' ? 'Abonado' : 'Paid'}: <Money amount={paid} currency={debt.currency} /></span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isOwedToMe ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {debt.status === 'paid' && (
                <Badge variant="success">{language === 'es' ? 'PAGADO' : 'PAID'}</Badge>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Debt Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={language === 'es' ? 'Registrar Deuda' : 'Log Debt'}>
        <div className="space-y-4">
          <Select
            label={language === 'es' ? 'Tipo' : 'Type'}
            value={newDebt.type}
            onChange={v => setNewDebt({ ...newDebt, type: v })}
            options={[
              { value: 'i_owe', label: language === 'es' ? 'Yo Debo (Pasivo)' : 'I Owe (Liability)' },
              { value: 'owes_me', label: language === 'es' ? 'Me Deben (Activo)' : 'Owes Me (Asset)' }
            ]}
          />
          <Input
            label={language === 'es' ? 'Persona / Entidad' : 'Person / Entity'}
            value={newDebt.person}
            onChange={e => setNewDebt({ ...newDebt, person: e.target.value })}
            placeholder={language === 'es' ? 'ej. Juan' : 'e.g. John'}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={language === 'es' ? 'Monto' : 'Amount'}
              type="number"
              value={newDebt.amount}
              onChange={e => setNewDebt({ ...newDebt, amount: e.target.value })}
            />
            <Select
              label={language === 'es' ? 'Moneda' : 'Currency'}
              value={newDebt.currency}
              onChange={v => setNewDebt({ ...newDebt, currency: v })}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
            />
          </div>
          <Button className="w-full mt-4" onClick={handleSave} variant="danger">
            {language === 'es' ? 'Registrar' : 'Log Record'}
          </Button>
        </div>
      </Modal>

      {/* Edit/View Debt Modal */}
      <Modal
        isOpen={!!editDebt}
        onClose={() => { setEditDebt(null); setPaymentAmount(''); }}
        title={editDebt?.person || ''}
      >
        {editDebt && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-xl text-center">
                <p className="text-xs text-zinc-500 uppercase mb-1">Total</p>
                <p className="text-xl font-mono font-bold"><Money amount={editDebt.totalAmount} currency={editDebt.currency} /></p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-xl text-center">
                <p className="text-xs text-zinc-500 uppercase mb-1">{language === 'es' ? 'Pendiente' : 'Remaining'}</p>
                <p className={`text-xl font-mono font-bold ${getRemaining(editDebt) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  <Money amount={getRemaining(editDebt)} currency={editDebt.currency} />
                </p>
              </div>
            </div>

            {/* Payment Input */}
            {getRemaining(editDebt) > 0 && (
              <div className="p-4 border border-dashed border-zinc-300 dark:border-white/10 rounded-xl space-y-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {language === 'es' ? 'Registrar Abono' : 'Record Payment'}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder={language === 'es' ? 'Monto del abono' : 'Payment amount'}
                    className="flex-1"
                  />
                  <Button onClick={handlePayment} disabled={!paymentAmount}>
                    {language === 'es' ? 'Abonar' : 'Pay'}
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setPaymentAmount(getRemaining(editDebt).toString())}
                >
                  {language === 'es' ? 'Pagar todo' : 'Pay full amount'} (<Money amount={getRemaining(editDebt)} currency={editDebt.currency} />)
                </Button>
              </div>
            )}

            {/* Payment History */}
            {editDebt.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase font-bold">
                  {language === 'es' ? 'Historial de Abonos' : 'Payment History'}
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {editDebt.payments.map((payment, idx) => (
                    <div key={payment.id || idx} className="flex justify-between text-sm p-2 bg-zinc-50 dark:bg-white/5 rounded-lg">
                      <span className="text-zinc-500">{new Date(payment.date).toLocaleDateString()}</span>
                      <span className="font-mono font-medium text-green-600">+<Money amount={payment.amount} currency={editDebt.currency} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status - Paid debts show delete option */}
            {getRemaining(editDebt) <= 0 && (
              <div className="space-y-3">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                  <p className="text-green-600 font-bold">
                    {language === 'es' ? '✓ Deuda Pagada Completamente' : '✓ Debt Fully Paid'}
                  </p>
                </div>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => { deleteDebt(editDebt.id); setEditDebt(null); }}
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'es' ? 'Eliminar Registro' : 'Delete Record'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========== CREDIT CARDS SECTION ========== */}
      <div className="flex justify-between items-center mt-12">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
          <CreditCardIcon className="w-6 h-6 text-brand-500" />
          {t('cc.title')}
        </h2>
        <Button onClick={() => setIsCardModalOpen(true)} className="bg-brand-500/10 text-brand-600 border border-brand-500/20 hover:bg-brand-500/20">
          <Plus className="w-4 h-4" />
          {t('cc.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {creditCards.map(card => {
          const available = card.creditLimit - card.usedAmount;
          const utilization = (card.usedAmount / card.creditLimit) * 100;
          const utilizationColor = utilization > 80 ? 'text-red-500' : utilization > 50 ? 'text-amber-500' : 'text-green-500';
          const barColor = utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-brand-500';

          return (
            <Card
              key={card.id}
              className="cursor-pointer hover:border-brand-500/30 transition-all relative overflow-hidden"
              onClick={() => {
                // Calculate real usedAmount from transactions
                const cardTxs = transactions.filter(tx => tx.creditCardId === card.id);
                let realUsed = 0;
                for (const tx of cardTxs) {
                  if (tx.category === 'Card Payment') realUsed -= tx.amount;
                  else realUsed += tx.amount;
                }
                realUsed = Math.max(0, Math.min(realUsed, card.creditLimit));
                const fresh = { ...card, usedAmount: realUsed };
                // Also sync the stored value
                if (card.usedAmount !== realUsed) updateCreditCard(card.id, { usedAmount: realUsed });
                setEditCard(fresh);
                setCardPayAmount('');
                setCardChargeAmount('');
                setCardChargeDate(getTodayStr(timezone));
                setCardPayDate(getTodayStr(timezone));
                setCardPayAccountId('');
                setIsEditingCardInfo(false);
                setShowCardDeleteConfirm(false);
                setEditCardForm({ name: fresh.name, creditLimit: String(fresh.creditLimit), currency: fresh.currency, cutoffDay: fresh.cutoffDay ? String(fresh.cutoffDay) : '', cutoffMode: fresh.cutoffMode || 'fixed', paymentDay: fresh.paymentDay ? String(fresh.paymentDay) : '', paymentMode: fresh.paymentMode || 'fixed' });
              }}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] pointer-events-none ${utilization > 80 ? 'bg-red-500/10' : 'bg-brand-500/10'}`} />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCardIcon className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-mono text-zinc-400">{card.currency}</span>
                    {card.cutoffDay && <span className="text-[10px] text-zinc-400">Corte: {card.cutoffDay}</span>}
                  </div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{card.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">{t('cc.available')}</p>
                  <span className="font-mono font-bold text-lg text-green-600 dark:text-green-400"><Money amount={available} currency={card.currency} /></span>
                </div>
              </div>

              <div className="space-y-2 mb-2 relative z-10">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">{t('cc.used')}: <Money amount={card.usedAmount} currency={card.currency} /></span>
                  <span className={`font-bold ${utilizationColor}`}>{utilization.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${utilization}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>{t('cc.limit')}: <Money amount={card.creditLimit} currency={card.currency} /></span>
                </div>
              </div>
            </Card>
          );
        })}
        {creditCards.length === 0 && (
          <div className="lg:col-span-2 py-12 text-center text-zinc-400 text-sm">{t('empty.generic')}</div>
        )}
      </div>

      {/* Add Credit Card Modal */}
      <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} title={t('cc.add')}>
        <div className="space-y-4">
          <Input
            label={t('cc.name')}
            value={newCard.name}
            onChange={e => setNewCard({ ...newCard, name: e.target.value })}
            placeholder={language === 'es' ? 'ej. Visa Gold' : 'e.g. Visa Gold'}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('cc.limit')}
              type="number"
              value={newCard.creditLimit}
              onChange={e => setNewCard({ ...newCard, creditLimit: e.target.value })}
            />
            <Select
              label={language === 'es' ? 'Moneda' : 'Currency'}
              value={newCard.currency}
              onChange={v => setNewCard({ ...newCard, currency: v })}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
            />
          </div>
          {/* Cutoff */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('cc.cutoff')}</label>
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-black/20 rounded-lg">
              <button type="button" onClick={() => setNewCard({ ...newCard, cutoffMode: 'fixed' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", newCard.cutoffMode === 'fixed' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_fixed')}</button>
              <button type="button" onClick={() => setNewCard({ ...newCard, cutoffMode: 'relative' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", newCard.cutoffMode === 'relative' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_relative')}</button>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" value={newCard.cutoffDay} onChange={e => setNewCard({ ...newCard, cutoffDay: e.target.value })} placeholder={newCard.cutoffMode === 'fixed' ? '1-31' : 'ej. 20'} className="font-mono" />
              <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">{newCard.cutoffMode === 'fixed' ? t('cc.day_of_month') : t('cc.days_before_payment')}</span>
            </div>
          </div>
          {/* Payment */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('cc.payment_day')}</label>
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-black/20 rounded-lg">
              <button type="button" onClick={() => setNewCard({ ...newCard, paymentMode: 'fixed' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", newCard.paymentMode === 'fixed' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_fixed')}</button>
              <button type="button" onClick={() => setNewCard({ ...newCard, paymentMode: 'relative' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", newCard.paymentMode === 'relative' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_relative')}</button>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" value={newCard.paymentDay} onChange={e => setNewCard({ ...newCard, paymentDay: e.target.value })} placeholder={newCard.paymentMode === 'fixed' ? '1-31' : 'ej. 20'} className="font-mono" />
              <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">{newCard.paymentMode === 'fixed' ? t('cc.day_of_month') : t('cc.days_after_cutoff')}</span>
            </div>
          </div>
          <Button className="w-full mt-4" onClick={() => {
            if (!newCard.name || !newCard.creditLimit) return;
            addCreditCard({
              name: newCard.name,
              creditLimit: parseFloat(newCard.creditLimit),
              usedAmount: 0,
              currency: newCard.currency as any,
              cutoffDay: newCard.cutoffDay ? parseInt(newCard.cutoffDay) : undefined,
              cutoffMode: newCard.cutoffMode,
              paymentDay: newCard.paymentDay ? parseInt(newCard.paymentDay) : undefined,
              paymentMode: newCard.paymentMode,
            });
            setIsCardModalOpen(false);
            setNewCard({ name: '', creditLimit: '', currency: 'COP', cutoffDay: '', cutoffMode: 'fixed', paymentDay: '', paymentMode: 'fixed' });
          }}>
            {t('cc.add')}
          </Button>
        </div>
      </Modal>

      {/* Edit/Manage Credit Card Modal */}
      <Modal
        isOpen={!!editCard}
        onClose={() => { setEditCard(null); setIsEditingCardInfo(false); setShowCardDeleteConfirm(false); }}
        title={editCard?.name || ''}
      >
        {editCard && (
          <div className="space-y-6">
            {!isEditingCardInfo ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">{t('cc.limit')}</p>
                    <p className="text-sm font-mono font-bold"><Money amount={editCard.creditLimit} currency={editCard.currency} /></p>
                  </div>
                  <div className="p-3 bg-red-500/5 rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">{t('cc.used')}</p>
                    <p className="text-sm font-mono font-bold text-red-500"><Money amount={editCard.usedAmount} currency={editCard.currency} /></p>
                  </div>
                  <div className="p-3 bg-green-500/5 rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">{t('cc.available')}</p>
                    <p className="text-sm font-mono font-bold text-green-500"><Money amount={editCard.creditLimit - editCard.usedAmount} currency={editCard.currency} /></p>
                  </div>
                </div>

                {/* Utilization Bar */}
                {(() => {
                  const util = (editCard.usedAmount / editCard.creditLimit) * 100;
                  const barCol = util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-500' : 'bg-brand-500';
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{t('cc.utilization')}</span>
                        <span className="font-bold">{util.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barCol} transition-all`} style={{ width: `${util}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Register Charge */}
                {editCard.usedAmount < editCard.creditLimit && (
                  <div className="p-4 border border-dashed border-zinc-300 dark:border-white/10 rounded-xl space-y-3">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('cc.charge')}</p>
                    <Input
                      type="number"
                      value={cardChargeAmount}
                      onChange={e => setCardChargeAmount(e.target.value)}
                      placeholder={language === 'es' ? 'Monto del cargo' : 'Charge amount'}
                    />
                    <DatePicker
                      value={cardChargeDate}
                      onChange={setCardChargeDate}
                      label={language === 'es' ? 'Fecha' : 'Date'}
                    />
                    <Button className="w-full" onClick={() => {
                      const amt = parseFloat(cardChargeAmount);
                      if (!amt || amt <= 0) return;
                      chargeCreditCard(editCard.id, amt);
                      addTransaction({
                        type: 'expense',
                        amount: amt,
                        currency: editCard.currency,
                        accountId: '',
                        category: 'Credit Card',
                        note: `${editCard.name}`,
                        date: dateToISO(cardChargeDate || getTodayStr(timezone)),
                        creditCardId: editCard.id,
                      });
                      setEditCard({ ...editCard, usedAmount: Math.min(editCard.usedAmount + amt, editCard.creditLimit) });
                      setCardChargeAmount('');
                      setCardChargeDate(getTodayStr(timezone));
                    }} disabled={!cardChargeAmount}>
                      {language === 'es' ? 'Registrar cargo' : 'Register Charge'}
                    </Button>
                  </div>
                )}

                {/* Make Payment */}
                {editCard.usedAmount > 0 ? (
                  <div className="p-4 border border-dashed border-green-500/30 dark:border-green-500/20 rounded-xl space-y-3 bg-green-500/5">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('cc.pay')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map(acc => (
                        <button
                          key={acc.id}
                          onClick={() => setCardPayAccountId(acc.id)}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                            cardPayAccountId === acc.id
                              ? 'bg-green-500 text-white border-green-500 shadow-sm'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-green-400'
                          }`}
                        >
                          {acc.name}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={cardPayAmount}
                      onChange={e => setCardPayAmount(e.target.value)}
                      placeholder={language === 'es' ? 'Monto del pago' : 'Payment amount'}
                    />
                    <DatePicker
                      value={cardPayDate}
                      onChange={setCardPayDate}
                      label={language === 'es' ? 'Fecha' : 'Date'}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setCardPayAmount(editCard.usedAmount.toString())}
                    >
                      {t('cc.pay_full')} (<Money amount={editCard.usedAmount} currency={editCard.currency} />)
                    </Button>
                    <Button className="w-full" onClick={() => {
                      const amt = parseFloat(cardPayAmount);
                      if (!amt || amt <= 0 || !cardPayAccountId) return;
                      payCreditCard(editCard.id, amt);
                      addTransaction({
                        type: 'expense',
                        amount: amt,
                        currency: editCard.currency,
                        accountId: cardPayAccountId,
                        category: 'Card Payment',
                        note: `${editCard.name}`,
                        date: dateToISO(cardPayDate || getTodayStr(timezone)),
                        creditCardId: editCard.id,
                      });
                      setEditCard({ ...editCard, usedAmount: Math.max(editCard.usedAmount - amt, 0) });
                      setCardPayAmount('');
                      setCardPayAccountId('');
                      setCardPayDate(getTodayStr(timezone));
                    }} disabled={!cardPayAmount || !cardPayAccountId} variant="secondary">
                      {language === 'es' ? 'Realizar pago' : 'Make Payment'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <p className="text-green-600 font-bold">{t('cc.no_balance')}</p>
                  </div>
                )}

                {/* Card Movement History */}
                {(() => {
                  const cardTxs = transactions.filter(tx => tx.creditCardId === editCard.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('cc.history')}</p>
                      {cardTxs.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-2">{t('cc.no_history')}</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                          {cardTxs.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 dark:bg-white/5 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.category === 'Card Payment' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-zinc-600 dark:text-zinc-300 truncate">{tx.category === 'Card Payment' ? (language === 'es' ? 'Pago' : 'Payment') : tx.note || tx.category}</span>
                                <span className="text-zinc-400 shrink-0">{new Date(tx.date).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}</span>
                              </div>
                              <span className={`font-mono font-bold shrink-0 ml-2 ${tx.category === 'Card Payment' ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-white'}`}>
                                {tx.category === 'Card Payment' ? '-' : '+'}<Money amount={tx.amount} currency={tx.currency} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Card info & actions */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-100 dark:border-white/5">
                  <div className="flex gap-4 flex-wrap">
                    {editCard.cutoffDay != null && <span>{t('cc.cutoff')}: {editCard.cutoffDay} {editCard.cutoffMode === 'relative' ? t('cc.days_before_payment') : t('cc.day_of_month')}</span>}
                    {editCard.paymentDay != null && <span>{t('cc.payment_day')}: {editCard.paymentDay} {editCard.paymentMode === 'relative' ? t('cc.days_after_cutoff') : t('cc.day_of_month')}</span>}
                  </div>
                </div>

                {showCardDeleteConfirm ? (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{t('cc.confirm_delete')}</p>
                    <div className="flex gap-3">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowCardDeleteConfirm(false)}>{t('act.cancel')}</Button>
                      <Button variant="danger" size="sm" className="flex-1" onClick={() => { deleteCreditCard(editCard.id); setEditCard(null); }}>
                        <Trash2 className="w-3.5 h-3.5" /> {t('act.delete')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setShowCardDeleteConfirm(true)} className="text-red-500 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => setIsEditingCardInfo(true)}>
                      <Pencil className="w-3.5 h-3.5" /> {language === 'es' ? 'Editar Tarjeta' : 'Edit Card'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Edit Card Info Form */
              <div className="space-y-4">
                <Input
                  label={t('cc.name')}
                  value={editCardForm.name}
                  onChange={e => setEditCardForm({ ...editCardForm, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('cc.limit')}
                    type="number"
                    value={editCardForm.creditLimit}
                    onChange={e => setEditCardForm({ ...editCardForm, creditLimit: e.target.value })}
                  />
                  <Select
                    label={language === 'es' ? 'Moneda' : 'Currency'}
                    value={editCardForm.currency}
                    onChange={v => setEditCardForm({ ...editCardForm, currency: v })}
                    options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                  />
                </div>
                {/* Cutoff */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('cc.cutoff')}</label>
                  <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-black/20 rounded-lg">
                    <button type="button" onClick={() => setEditCardForm({ ...editCardForm, cutoffMode: 'fixed' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", editCardForm.cutoffMode === 'fixed' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_fixed')}</button>
                    <button type="button" onClick={() => setEditCardForm({ ...editCardForm, cutoffMode: 'relative' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", editCardForm.cutoffMode === 'relative' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_relative')}</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={editCardForm.cutoffDay} onChange={e => setEditCardForm({ ...editCardForm, cutoffDay: e.target.value })} placeholder={editCardForm.cutoffMode === 'fixed' ? '1-31' : 'ej. 20'} className="font-mono" />
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">{editCardForm.cutoffMode === 'fixed' ? t('cc.day_of_month') : t('cc.days_before_payment')}</span>
                  </div>
                </div>
                {/* Payment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('cc.payment_day')}</label>
                  <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-black/20 rounded-lg">
                    <button type="button" onClick={() => setEditCardForm({ ...editCardForm, paymentMode: 'fixed' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", editCardForm.paymentMode === 'fixed' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_fixed')}</button>
                    <button type="button" onClick={() => setEditCardForm({ ...editCardForm, paymentMode: 'relative' })} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all", editCardForm.paymentMode === 'relative' ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm' : 'text-zinc-500')}>{t('cc.mode_relative')}</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={editCardForm.paymentDay} onChange={e => setEditCardForm({ ...editCardForm, paymentDay: e.target.value })} placeholder={editCardForm.paymentMode === 'fixed' ? '1-31' : 'ej. 20'} className="font-mono" />
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">{editCardForm.paymentMode === 'fixed' ? t('cc.day_of_month') : t('cc.days_after_cutoff')}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setIsEditingCardInfo(false)}>{t('act.cancel')}</Button>
                  <Button className="flex-1" onClick={() => {
                    updateCreditCard(editCard.id, {
                      name: editCardForm.name,
                      creditLimit: parseFloat(editCardForm.creditLimit),
                      currency: editCardForm.currency as any,
                      cutoffDay: editCardForm.cutoffDay ? parseInt(editCardForm.cutoffDay) : undefined,
                      cutoffMode: editCardForm.cutoffMode,
                      paymentDay: editCardForm.paymentDay ? parseInt(editCardForm.paymentDay) : undefined,
                      paymentMode: editCardForm.paymentMode,
                    });
                    setEditCard({ ...editCard, name: editCardForm.name, creditLimit: parseFloat(editCardForm.creditLimit), currency: editCardForm.currency as any, cutoffDay: editCardForm.cutoffDay ? parseInt(editCardForm.cutoffDay) : undefined, cutoffMode: editCardForm.cutoffMode, paymentDay: editCardForm.paymentDay ? parseInt(editCardForm.paymentDay) : undefined, paymentMode: editCardForm.paymentMode });
                    setIsEditingCardInfo(false);
                  }}>
                    {t('act.update')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// --- SETTINGS VIEW ---
export const SettingsView = () => {
  const {
    theme, setTheme, language, setLanguage, currencyBase, setCurrencyBase,
    timezone, setTimezone,
    privacyMode, togglePrivacy, showCents, toggleShowCents, reduceMotion, toggleReduceMotion,
    resetData, logout, user, t
  } = useApp();

  const resolvedTz = timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  const TIMEZONE_OPTIONS = [
    { value: 'auto', label: `Auto (${Intl.DateTimeFormat().resolvedOptions().timeZone})` },
    { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
    { value: 'America/New_York', label: 'US Eastern (UTC-5/-4)' },
    { value: 'America/Chicago', label: 'US Central (UTC-6/-5)' },
    { value: 'America/Denver', label: 'US Mountain (UTC-7/-6)' },
    { value: 'America/Los_Angeles', label: 'US Pacific (UTC-8/-7)' },
    { value: 'America/Mexico_City', label: 'Mexico (UTC-6)' },
    { value: 'America/Lima', label: 'Peru (UTC-5)' },
    { value: 'America/Santiago', label: 'Chile (UTC-3/-4)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
    { value: 'America/Sao_Paulo', label: 'Brazil (UTC-3)' },
    { value: 'Europe/Madrid', label: 'Spain (UTC+1/+2)' },
    { value: 'Europe/London', label: 'UK (UTC+0/+1)' },
  ];

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
            <Badge variant="neutral">ID: {user?.uid.substring(0, 6)}</Badge>
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
              options={[{ value: 'en', label: 'English', icon: <Globe className="w-4 h-4" /> }, { value: 'es', label: 'Español', icon: <Globe className="w-4 h-4" /> }]}
            />
            <Select
              label={t('set.curr')}
              value={currencyBase}
              onChange={(v) => setCurrencyBase(v as any)}
              options={[{ value: 'COP', label: 'COP (Colombian Peso)' }, { value: 'USD', label: 'USD (US Dollar)' }, { value: 'EUR', label: 'EUR (Euro)' }]}
            />
            <Select
              label={t('set.tz')}
              value={timezone}
              onChange={(v) => setTimezone(v)}
              options={TIMEZONE_OPTIONS}
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
          {language === 'es' 
            ? 'Realiza acciones avanzadas. Ten cuidado, algunas acciones como el reinicio de fábrica no se pueden deshacer.'
            : 'Perform advanced actions. Be careful, some actions like factory reset cannot be undone.'}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" onClick={logout} className="border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">
            <LogOut className="w-4 h-4" /> {language === 'es' ? 'Cerrar Sesión' : 'Log Out'}
          </Button>
          <Button variant="danger" onClick={() => { if (window.confirm(language === 'es' ? '¿Estás seguro? Esto borrará todos los datos locales.' : 'Are you sure? This will wipe all local data.')) resetData() }}>
            {language === 'es' ? 'Reinicio de Fábrica' : 'Factory Reset Data'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// --- AI ASSISTANT VIEW ---
export const AIAssistantView = () => {
  const { t, user, addTransaction, addGoal, setView } = useApp();
  const context = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AIMessage[]>([
    { id: 'welcome', role: 'assistant', content: t('ai.welcome'), timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [previousSummary, setPreviousSummary] = useState<string | undefined>();

  // Load previous chat summary on mount
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`uflow_chat_summary_${user.uid}`);
      if (stored) {
        setPreviousSummary(stored);
      }
    }
  }, [user?.uid]);

  // Save chat summary on unmount
  useEffect(() => {
    return () => {
      // Only save if there are meaningful messages
      if (user?.uid && messages.length > 2) {
        const chatMessages = messages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ role: m.role, content: m.content }));

        // Generate and save summary asynchronously
        import('../claude-service').then(({ generateChatSummary }) => {
          generateChatSummary(chatMessages).then(summary => {
            if (summary) {
              localStorage.setItem(`uflow_chat_summary_${user.uid}`, summary);
            }
          });
        });
      }
    };
  }, [messages, user?.uid]);

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
      // Build conversation history for Claude
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await processAICommand(
        userMsg.content,
        context,
        conversationHistory,
        previousSummary
      );

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
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

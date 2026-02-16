import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Select, Badge, Money, Toggle, SegmentedControl, Modal, DatePicker } from '../components/UIComponents';
import { convertToBase, cn, processAICommand, generateId, getTodayStr, dateToISO } from '../utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, BarChart, Bar } from 'recharts';
import { Moon, Sun, Monitor, Globe, Shield, CreditCard as CreditCardIcon, LogOut, User, Activity, TrendingUp, BarChart3, PieChart as PieIcon, Send, Sparkles, Bot, Wallet, Settings, Trash2, Plus, Pencil } from 'lucide-react';
import { AIMessage, CreditCard as CreditCardType } from '../types';

// --- HISTORY VIEW ---
export const HistoryView = () => {
  const { transactions, accounts, t, language, setEditingTransaction } = useApp();
  const [filter, setFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;

  const sortedTx = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const filtered = useMemo(() => {
    return sortedTx.filter(tx => {
      // Text filter
      const matchesText = filter === '' ||
        tx.category.toLowerCase().includes(filter.toLowerCase()) ||
        tx.note.toLowerCase().includes(filter.toLowerCase());

      // Date filters
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
                const isEditable = (Date.now() - tx.createdAt) < (72 * 60 * 60 * 1000);
                return (
                  <tr key={tx.id} className="hover:bg-brand-500/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500 whitespace-nowrap">{new Date(tx.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 safe-text">{tx.category}</td>
                    <td className="px-6 py-4 text-zinc-500 max-w-[150px] safe-text" title={tx.note}>{tx.note}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500 safe-text">{accounts.find(a => a.id === tx.accountId)?.name || tx.currency}</td>
                    <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400 drop-shadow-sm' : 'text-zinc-900 dark:text-white'}`}>
                      {tx.type === 'expense' ? '-' : ''}<Money amount={tx.amount} currency={tx.currency} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditable ?
                        <button onClick={() => setEditingTransaction(tx)} className="cursor-pointer"><Badge variant="brand">EDIT 72H</Badge></button> :
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">LOCKED</span>
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
      <Card className="relative overflow-hidden group border-brand-500/10 hover:border-brand-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
          <CreditCardIcon className="w-40 h-40 text-brand-500" />
        </div>
        <div className="mb-4 relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
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
            className="!w-auto min-w-[160px]"
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

// --- ACCOUNTS VIEW ---
export const AccountsView = () => {
  const { accounts, addAccount, deleteAccount, updateAccount, addTransaction, transactions, timezone, t, currencyBase, user, language } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsAccount, setSettingsAccount] = useState<typeof accounts[0] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'transfer' | 'expense' | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [newAcc, setNewAcc] = useState({ name: '', type: 'individual', currency: 'COP', initialBalance: '' });

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

  const handleSave = () => {
    if (!newAcc.name) return;
    addAccount({
      name: newAcc.name,
      type: newAcc.type as 'individual' | 'shared',
      currency: newAcc.currency as any,
      initialBalance: newAcc.initialBalance ? parseFloat(newAcc.initialBalance) : undefined
    });
    setIsModalOpen(false);
    setNewAcc({ name: '', type: 'individual', currency: 'COP', initialBalance: '' });
  };

  const handleDelete = () => {
    if (!settingsAccount) return;

    const balance = getAccountBalance(settingsAccount.id);

    // If there's positive balance, handle it based on user choice
    if (balance > 0) {
      if (deleteAction === 'transfer' && transferToAccountId) {
        // Create transfer transaction to destination account (adjustment, not income)
        addTransaction({
          type: 'adjustment',
          amount: balance,
          currency: settingsAccount.currency,
          accountId: transferToAccountId,
          category: 'Transfer',
          note: `Transferred from ${settingsAccount.name}`,
          date: dateToISO(getTodayStr(timezone))
        });
      } else if (deleteAction === 'expense') {
        // Mark as expense/withdrawal
        addTransaction({
          type: 'expense',
          amount: balance,
          currency: settingsAccount.currency,
          accountId: settingsAccount.id,
          category: 'Account Closure',
          note: language === 'es' ? 'Cierre de cuenta' : 'Account closure',
          date: dateToISO(getTodayStr(timezone))
        });
      }
    }

    deleteAccount(settingsAccount.id);
    resetDeleteState();
  };

  const handleLeaveAccount = () => {
    if (!settingsAccount || !settingsAccount.members || !user) return;

    const balance = getAccountBalance(settingsAccount.id);
    const memberCount = settingsAccount.members.length;
    const myShare = balance / memberCount;

    // If there's balance and user's share is positive, they need to handle it
    if (myShare > 0) {
      if (deleteAction === 'transfer' && transferToAccountId) {
        // Use adjustment instead of income for transfers
        addTransaction({
          type: 'adjustment',
          amount: myShare,
          currency: settingsAccount.currency,
          accountId: transferToAccountId,
          category: 'Transfer',
          note: `My share from ${settingsAccount.name}`,
          date: dateToISO(getTodayStr(timezone))
        });
        // Reduce the shared account balance
        addTransaction({
          type: 'expense',
          amount: myShare,
          currency: settingsAccount.currency,
          accountId: settingsAccount.id,
          category: 'Member Exit',
          note: `${user.displayName || user.email} left`,
          date: dateToISO(getTodayStr(timezone))
        });
      } else if (deleteAction === 'expense') {
        // Forfeit the share (nothing to do, just leave)
      } else {
        // Show options first
        return;
      }
    }

    const updatedMembers = settingsAccount.members.filter(m => m !== user.displayName && m !== user.email);
    updateAccount(settingsAccount.id, { members: updatedMembers });
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('nav.accounts')}</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <CreditCardIcon className="w-4 h-4" />
          {language === 'es' ? 'Nueva Cuenta' : 'Add Account'}
        </Button>
      </div>

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
                <Badge variant={acc.type === 'shared' ? 'brand' : 'neutral'} className="mb-4">{acc.type}</Badge>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{acc.name}</h3>
                <p className={`text-2xl font-mono font-bold mb-2 ${balance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                  <Money amount={balance} currency={acc.currency} />
                </p>
                <p className="text-xs text-zinc-500 font-mono">{acc.currency}</p>

                {acc.members && (
                  <div className="flex items-center -space-x-2 mt-4">
                    {acc.members.map((m, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold">
                        {m[0]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Account Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={language === 'es' ? 'Nueva Cuenta' : 'Add New Account'}>
        <div className="space-y-4">
          <Input label={language === 'es' ? 'Nombre' : 'Name'} value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} placeholder={language === 'es' ? 'ej. Ahorros' : 'e.g. Savings'} />
          <Input label={language === 'es' ? 'Saldo Inicial' : 'Initial Balance'} type="number" value={newAcc.initialBalance} onChange={e => setNewAcc({ ...newAcc, initialBalance: e.target.value })} placeholder="0" />
          <Select label={language === 'es' ? 'Tipo' : 'Type'} value={newAcc.type} onChange={v => setNewAcc({ ...newAcc, type: v })} options={[{ value: 'individual', label: 'Individual' }, { value: 'shared', label: language === 'es' ? 'Compartida' : 'Shared' }]} />
          <Select label={language === 'es' ? 'Moneda' : 'Currency'} value={newAcc.currency} onChange={v => setNewAcc({ ...newAcc, currency: v })} options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
          <Button className="w-full mt-4" onClick={handleSave}>{language === 'es' ? 'Crear Cuenta' : 'Create Account'}</Button>
        </div>
      </Modal>

      {/* Account Settings Modal */}
      <Modal isOpen={!!settingsAccount} onClose={resetDeleteState} title={settingsAccount?.name || ''}>
        {settingsAccount && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-xl">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{language === 'es' ? 'Balance' : 'Balance'}</p>
              <p className={`text-3xl font-mono font-bold ${accountBalance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                <Money amount={accountBalance} currency={settingsAccount.currency} />
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">{language === 'es' ? 'Tipo' : 'Type'}</span><span className="font-medium capitalize">{settingsAccount.type}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">{language === 'es' ? 'Moneda' : 'Currency'}</span><span className="font-medium">{settingsAccount.currency}</span></div>
              {settingsAccount.members && <div className="flex justify-between"><span className="text-zinc-500">{language === 'es' ? 'Miembros' : 'Members'}</span><span className="font-medium">{settingsAccount.members.length}</span></div>}
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-white/10">
              {/* Leave shared account */}
              {settingsAccount.type === 'shared' && settingsAccount.members && settingsAccount.members.length > 1 && (
                <>
                  {!showDeleteConfirm && (
                    <Button variant="secondary" className="w-full" onClick={() => { setShowDeleteConfirm(true); setDeleteAction(null); }}>
                      <LogOut className="w-4 h-4" />
                      {language === 'es' ? 'Salir de la Cuenta' : 'Leave Account'}
                    </Button>
                  )}
                </>
              )}

              {/* Delete button */}
              {!showDeleteConfirm ? (
                <Button variant="danger" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />
                  {language === 'es' ? 'Eliminar Cuenta' : 'Delete Account'}
                </Button>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                  {/* If has balance, show options */}
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
                          <Select
                            value={transferToAccountId}
                            onChange={setTransferToAccountId}
                            options={transferableAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                            className="mt-2"
                          />
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
                    <Button variant="ghost" className="flex-1" onClick={resetDeleteState}>
                      {language === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={hasBalance && !deleteAction}
                    >
                      {language === 'es' ? 'Eliminar' : 'Delete'}
                    </Button>
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
  const { goals, addGoal, updateGoal, t, currencyBase } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', currency: 'COP' });

  const handleSave = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;
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
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', transform: 'skewX(-20deg)' }} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateGoal(goal.id, goal.targetAmount * 0.1)}>+ 10%</Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateGoal(goal.id, 10000)}>+ 10k</Button>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set New Goal">
        <div className="space-y-4">
          <Input label="Goal Name" value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="e.g. New Car" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target Amount" type="number" value={newGoal.targetAmount} onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })} />
            <Select
              label="Currency"
              value={newGoal.currency}
              onChange={v => setNewGoal({ ...newGoal, currency: v })}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
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

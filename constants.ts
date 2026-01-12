import { Account, Budget, Debt, Goal, Transaction } from './types';

export const FX_RATES = {
  COP: 1,
  USD: 4200, // 1 USD = 4200 COP
  EUR: 4600, // 1 EUR = 4600 COP
};

// Simple dictionary implementation for demo
export const TRANSLATIONS = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.history': 'History',
    'nav.analytics': 'Analytics',
    'nav.accounts': 'Accounts',
    'nav.debts': 'Risk & Debts',
    'nav.goals': 'Goals',
    'nav.settings': 'Settings',
    // Dashboard
    'dash.total': 'Total Balance',
    'dash.available': 'Available Liquidity',
    'dash.relative': 'Relative Balance',
    'dash.recent': 'Data Stream',
    'dash.targets': 'Targets',
    'dash.risk': 'Risk Assessment',
    'dash.burn': 'Monthly Burn Rate',
    'dash.commands': 'Quick Commands',
    // Actions
    'act.quick_input': 'Quick Input',
    'act.add': 'Add',
    'act.save': 'Save Record',
    'act.cancel': 'Cancel',
    'act.edit_72h': 'EDIT 72H',
    'act.transfer': 'Transfer',
    'act.scan': 'Scan Receipt',
    'act.export': 'Export CSV',
    'act.reset': 'Factory Reset (Demo)',
    // Forms & Labels
    'lbl.amount': 'Amount',
    'lbl.desc': 'Description / Note',
    'lbl.category': 'Category',
    'lbl.account': 'Account',
    'lbl.date': 'Date',
    'lbl.type': 'Type',
    'lbl.person': 'Entity / Person',
    // Status
    'st.pending': 'PENDING',
    'st.paid': 'PAID',
    'st.partial': 'PARTIAL',
    'st.critical': 'CRITICAL',
    'st.ontrack': 'ON TRACK',
    'st.locked': 'LOCKED',
    // Empty
    'empty.generic': 'No data available in this sector.',
    // Settings
    'set.general': 'General Configuration',
    'set.vis': 'Visualization Protocol',
    'set.zone': 'Danger Zone',
    'set.lang': 'Language',
    'set.curr': 'Base Currency',
    'set.theme': 'Theme Mode',
    'set.privacy': 'Privacy Mode',
    'set.cents': 'Precision (Show Cents)',
    'set.motion': 'Reduce Motion',
  },
  es: {
    'nav.dashboard': 'Panel de Control',
    'nav.history': 'Historial',
    'nav.analytics': 'Analítica',
    'nav.accounts': 'Cuentas',
    'nav.debts': 'Riesgo y Deudas',
    'nav.goals': 'Metas',
    'nav.settings': 'Ajustes',
    'dash.total': 'Balance Total',
    'dash.available': 'Liquidez Disponible',
    'dash.relative': 'Balance Relativo',
    'dash.recent': 'Flujo de Datos',
    'dash.targets': 'Objetivos',
    'dash.risk': 'Evaluación de Riesgo',
    'dash.burn': 'Tasa de Gasto Mensual',
    'dash.commands': 'Comandos Rápidos',
    'act.quick_input': 'Entrada Rápida',
    'act.add': 'Agregar',
    'act.save': 'Guardar Registro',
    'act.cancel': 'Cancelar',
    'act.edit_72h': 'EDITAR 72H',
    'act.transfer': 'Transferir',
    'act.scan': 'Escanear Recibo',
    'act.export': 'Exportar CSV',
    'act.reset': 'Restaurar Fábrica (Demo)',
    'lbl.amount': 'Monto',
    'lbl.desc': 'Descripción / Nota',
    'lbl.category': 'Categoría',
    'lbl.account': 'Cuenta',
    'lbl.date': 'Fecha',
    'lbl.type': 'Tipo',
    'lbl.person': 'Entidad / Persona',
    'st.pending': 'PENDIENTE',
    'st.paid': 'PAGADO',
    'st.partial': 'PARCIAL',
    'st.critical': 'CRÍTICO',
    'st.ontrack': 'EN CAMINO',
    'st.locked': 'BLOQUEADO',
    'empty.generic': 'Sin datos disponibles en este sector.',
    'set.general': 'Configuración General',
    'set.vis': 'Protocolo de Visualización',
    'set.zone': 'Zona de Peligro',
    'set.lang': 'Idioma',
    'set.curr': 'Moneda Base',
    'set.theme': 'Tema',
    'set.privacy': 'Modo Privacidad',
    'set.cents': 'Precisión (Mostrar Centavos)',
    'set.motion': 'Reducir Movimiento',
  }
};

export const DEMO_ACCOUNTS: Account[] = [
  { id: '1', name: 'Main Wallet', type: 'individual', currency: 'COP' },
  { id: '2', name: 'Bank Reserve', type: 'individual', currency: 'USD' },
  { id: '3', name: 'Apt 402 Shared', type: 'shared', currency: 'COP', members: ['You', 'Ana'] },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'income', amount: 4500000, currency: 'COP', accountId: '1', category: 'Salary', note: 'Monthly payroll', date: new Date().toISOString(), createdAt: Date.now() },
  { id: 't2', type: 'expense', amount: 1200000, currency: 'COP', accountId: '3', category: 'Rent', note: 'November Rent', date: new Date().toISOString(), createdAt: Date.now() - 80000000 }, // Old
  { id: 't3', type: 'expense', amount: 45000, currency: 'COP', accountId: '1', category: 'Food', note: 'Lunch w/ team', date: new Date().toISOString(), createdAt: Date.now() },
  { id: 't4', type: 'expense', amount: 15, currency: 'USD', accountId: '2', category: 'Subscriptions', note: 'Netflix', date: new Date().toISOString(), createdAt: Date.now() },
  { id: 't5', type: 'adjustment', amount: -50000, currency: 'COP', accountId: '1', category: 'Misc', note: 'Cash lost', date: new Date().toISOString(), createdAt: Date.now() },
];

export const DEMO_DEBTS: Debt[] = [
  { id: 'd1', person: 'Carlos M.', type: 'owes_me', totalAmount: 200000, currency: 'COP', status: 'pending', payments: [], createdAt: new Date().toISOString() },
  { id: 'd2', person: 'Visa Credit', type: 'i_owe', totalAmount: 1500, currency: 'USD', status: 'partial', payments: [{id: 'p1', amount: 500, date: new Date().toISOString()}], createdAt: new Date().toISOString() },
];

export const DEMO_GOALS: Goal[] = [
  { id: 'g1', name: 'Emergency Fund', targetAmount: 10000000, currentAmount: 2500000, currency: 'COP', status: 'active' },
  { id: 'g2', name: 'New Mac Studio', targetAmount: 2000, currentAmount: 1200, currency: 'USD', status: 'active' },
];

export const DEMO_BUDGETS: Budget[] = [
  { id: 'b1', category: 'Food', limit: 800000, spent: 450000, currency: 'COP' },
  { id: 'b2', category: 'Transport', limit: 300000, spent: 280000, currency: 'COP' },
];
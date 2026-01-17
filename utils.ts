import { FX_RATES } from './constants';
import { Currency, Language, AppContextType, TransactionType } from './types';

// --- CURRENCY HELPERS ---

export const formatCurrency = (
  amount: number,
  currency: Currency,
  lang: Language,
  showCents: boolean
): string => {
  const isCOP = currency === 'COP';

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: isCOP ? (showCents ? 2 : 0) : 2,
    maximumFractionDigits: isCOP ? (showCents ? 2 : 0) : 2,
  };

  const locale = lang === 'es' ? 'es-CO' : 'en-US';

  try {
    const formatter = new Intl.NumberFormat(locale, options);
    let formatted = formatter.format(amount);

    // Aesthetic fix for COP in English locale
    if (lang === 'en' && isCOP && !formatted.includes('COP')) {
      formatted = `COP ${formatted}`;
    }

    return formatted;
  } catch (e) {
    return `${amount}`;
  }
};

export const convertToBase = (amount: number, from: Currency, base: Currency): number => {
  if (from === base) return amount;

  // Convert FROM to COP first (Normalized)
  const rateFrom = FX_RATES[from as keyof typeof FX_RATES] || 1;
  const amountInCOP = amount * rateFrom;

  // If Base is COP, we are done
  if (base === 'COP') return amountInCOP;

  // If Base is other (e.g. USD), convert COP to Base
  const rateBase = FX_RATES[base as keyof typeof FX_RATES] || 1;
  return amountInCOP / rateBase;
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

// --- AI ENGINE V5: CLAUDE API + LOCAL FALLBACK ---

import { callClaudeAPI } from './claude-service';

interface AIResponse {
  text: string;
  lang: Language;
  intent: 'create' | 'query' | 'unknown';
  structured?: {
    type: 'transaction' | 'goal';
    data: any;
  };
}

// Flag to track if Claude is available
let claudeAvailable: boolean | null = null;

// 1. Dictionaries & Maps (EXPANDED)
const CATEGORY_MAP: Record<string, string[]> = {
  'Food': ['comida', 'food', 'almuerzo', 'lunch', 'cena', 'dinner', 'mercado', 'groceries', 'restaurante', 'restaurant', 'burger', 'pizza', 'sushi', 'café', 'coffee', 'desayuno', 'snack', 'postre'],
  'Transport': ['uber', 'taxi', 'bus', 'transmilenio', 'metro', 'gasolina', 'fuel', 'gas', 'transporte', 'transport', 'avion', 'flight', 'peaje', 'toll', 'parqueadero', 'parking', 'mantenimiento', 'aceite'],
  'Rent': ['arriendo', 'rent', 'alquiler', 'casa', 'house', 'apto', 'apartment', 'administracion', 'hoa', 'lease'],
  'Salary': ['nomina', 'salario', 'salary', 'sueldo', 'pago', 'paid', 'deposit', 'income', 'honorarios', 'mesada', 'quincena', 'paycheck'],
  'Utilities': ['luz', 'agua', 'gas', 'internet', 'celular', 'phone', 'plan', 'energia', 'energy', 'water', 'bill', 'servicios', 'recibo'],
  'Subscriptions': ['netflix', 'spotify', 'youtube', 'prime', 'hbo', 'disney', 'icloud', 'google', 'subscription', 'suscripcion', 'chatgpt', 'claude', 'patreon'],
  'Shopping': ['ropa', 'clothes', 'zapatos', 'shoes', 'amazon', 'mercadolibre', 'compras', 'shopping', 'regalo', 'gift', 'tienda', 'store', 'mall'],
  'Health': ['medico', 'doctor', 'medicina', 'medicine', 'farmacia', 'pharmacy', 'hospital', 'drogeria', 'salud', 'dentista', 'dentist', 'eps', 'seguro'],
  'Entertainment': ['cine', 'cinema', 'movie', 'juego', 'game', 'boletas', 'tickets', 'concierto', 'concert', 'fiesta', 'party', 'bar', 'drinks', 'cerveza', 'beer', 'licor'],
  'Education': ['universidad', 'university', 'colegio', 'school', 'curso', 'course', 'semestre', 'platzi', 'udemy', 'coursera', 'libros', 'books'],
  'Business': ['cliente', 'client', 'proyecto', 'project', 'inversion', 'investment', 'servidor', 'server', 'dominio', 'domain', 'ads', 'freelance'],
  'Savings': ['ahorro', 'fondo', 'alcancia', 'saving', 'investment', 'bolsillo']
};

const INCOME_KEYWORDS = ['me pagaron', 'pagaron', 'recibí', 'recibi', 'received', 'got paid', 'ingreso', 'income', 'entró', 'entro', 'me entró', 'me llego', 'me llegó', 'deposit', 'deposito', 'consignaron', 'me giraron', 'salary', 'salario', 'nomina', 'sueldo', 'venta', 'sale', 'vendí', 'cobré', 'invoice paid'];
const EXPENSE_KEYWORDS = ['gasté', 'gaste', 'spent', 'compré', 'compre', 'bought', 'pagué', 'pague', 'paid', 'costó', 'costo', 'cost', 'salió', 'salio', 'me cobraron', 'charged', 'billed', 'transferí', 'transferi', 'sent', 'factura', 'cuenta', 'recibo', 'se fue'];
const ANALYSIS_KEYWORDS = ['cuanto', 'cuánto', 'how much', 'gastado', 'spent', 'ahorro', 'save', 'consejo', 'advice', 'ayuda', 'help', 'resumen', 'summary', 'analisis', 'analysis', 'top', 'mayor', 'mas alto', 'highest', 'balance', 'estado'];

// 2. Helpers
const detectLanguage = (text: string, defaultLang: Language): Language => {
  const lower = text.toLowerCase();
  const esWords = ['que', 'el', 'la', 'en', 'un', 'una', 'gasté', 'pagué', 'hoy', 'ayer', 'mañana', 'cuanto'];
  const enWords = ['the', 'in', 'on', 'a', 'an', 'spent', 'paid', 'today', 'yesterday', 'tomorrow', 'how'];

  let esScore = 0;
  let enScore = 0;

  esWords.forEach(w => { if (new RegExp(`\\b${w}\\b`).test(lower)) esScore++; });
  enWords.forEach(w => { if (new RegExp(`\\b${w}\\b`).test(lower)) enScore++; });

  if (esScore > enScore) return 'es';
  if (enScore > esScore) return 'en';
  return defaultLang;
};

const extractAmount = (text: string, lang: Language): number => {
  const lower = text.toLowerCase();

  // Pattern for Colombian format: "300mil", "300 mil", "50k", "2 millones", "1.5M", "2 palos"
  // Important: "300mil" = 300 * 1000 = 300,000 (NOT 300 million!)

  // Try pattern with suffix attached: "300mil", "50k"
  const attachedMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(mil|k|millon|millones|m|palo|palos)\b/i);
  if (attachedMatch) {
    let val = parseFloat(attachedMatch[1].replace(',', '.'));
    const suffix = attachedMatch[2].toLowerCase();

    if (suffix === 'mil' || suffix === 'k') {
      val *= 1000;
    } else if (['millon', 'millones', 'm', 'palo', 'palos'].includes(suffix)) {
      val *= 1000000;
    }
    return Math.round(val);
  }

  // Try pattern with space: "300 mil", "2 millones"
  const spacedMatch = lower.match(/(\d+(?:[.,]\d+)?)\s+(mil|k|millon|millones|m|palo|palos)\b/i);
  if (spacedMatch) {
    let val = parseFloat(spacedMatch[1].replace(',', '.'));
    const suffix = spacedMatch[2].toLowerCase();

    if (suffix === 'mil' || suffix === 'k') {
      val *= 1000;
    } else if (['millon', 'millones', 'm', 'palo', 'palos'].includes(suffix)) {
      val *= 1000000;
    }
    return Math.round(val);
  }

  // Plain number without suffix
  const plainMatch = lower.match(/(\d+(?:[.,]\d+)?)/);
  if (plainMatch) {
    return Math.round(parseFloat(plainMatch[1].replace(',', '.')));
  }

  return 0;
};

const extractCurrency = (text: string, defaultCurr: Currency, lang: Language): Currency => {
  const lower = text.toLowerCase();
  // Explicit overrides
  if (lower.includes('usd') || lower.includes('dolar') || lower.includes('dollar') || lower.includes('us$')) return 'USD';
  if (lower.includes('eur') || lower.includes('euro')) return 'EUR';
  if (lower.includes('cop') || lower.includes('peso')) return 'COP';

  // Ambiguous '$' inference based on context language
  if (lower.includes('$')) {
    if (lang === 'en') return 'USD';
    if (lang === 'es') return 'COP'; // Default for ES usually COP in this context
  }

  return defaultCurr;
};

const extractCategory = (text: string): string => {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Misc';
};

const extractDate = (text: string): string => {
  const lower = text.toLowerCase();
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Day names mapping (Spanish)
  const dayNames: Record<string, number> = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'miércoles': 3,
    'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6
  };

  // Check for specific day names: "el domingo", "el sábado", etc.
  for (const [dayName, targetDay] of Object.entries(dayNames)) {
    if (lower.includes(dayName)) {
      // Calculate days ago for the most recent occurrence
      let daysAgo = (dayOfWeek - targetDay + 7) % 7;
      if (daysAgo === 0) daysAgo = 7; // If same day, assume last week

      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);
      date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      return date.toISOString();
    }
  }

  // Check for ayer, anteayer
  if (lower.includes('ayer') || lower.includes('anoche')) {
    const date = new Date(now);
    date.setDate(now.getDate() - 1);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  if (lower.includes('antier') || lower.includes('anteayer')) {
    const date = new Date(now);
    date.setDate(now.getDate() - 2);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  // Check for "hace X días"
  const agoMatch = lower.match(/hace\s+(\d+)\s*d[ií]as?/);
  if (agoMatch) {
    const date = new Date(now);
    date.setDate(now.getDate() - parseInt(agoMatch[1]));
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  // Default: today at noon
  now.setHours(12, 0, 0, 0);
  return now.toISOString();
};

// --- ANALYSIS LOGIC ---
const generateAnalysis = (prompt: string, context: AppContextType, lang: Language): string => {
  const lower = prompt.toLowerCase();
  const { transactions, currencyBase } = context;

  // 1. "How much spent on X"
  const catMatch = Object.keys(CATEGORY_MAP).find(c => lower.includes(c.toLowerCase()) || CATEGORY_MAP[c].some(k => lower.includes(k)));
  if (catMatch && (lower.includes('gast') || lower.includes('spent') || lower.includes('much') || lower.includes('cuanto'))) {
    const total = transactions
      .filter(t => t.type === 'expense' && t.category === catMatch)
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, currencyBase), 0);

    return lang === 'es'
      ? `Has gastado un total aproximado de ${formatCurrency(total, currencyBase, 'es', false)} en ${catMatch} históricamente.`
      : `You have spent approximately ${formatCurrency(total, currencyBase, 'en', false)} on ${catMatch} historically.`;
  }

  // 2. "Top Expenses"
  if (lower.includes('top') || lower.includes('mayor') || lower.includes('highest') || lower.includes('mas')) {
    // Simple aggregation
    const catTotals: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const val = convertToBase(t.amount, t.currency, currencyBase);
      catTotals[t.category] = (catTotals[t.category] || 0) + val;
    });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

    if (sorted.length === 0) return lang === 'es' ? "No hay suficientes datos." : "Not enough data.";

    const list = sorted.map(([c, v]) => `- ${c}: ${formatCurrency(v, currencyBase, lang, false)}`).join('\n');
    return lang === 'es'
      ? `Tus mayores gastos son:\n${list}`
      : `Your top expenses are:\n${list}`;
  }

  // 3. General Advice
  if (lower.includes('consejo') || lower.includes('advice') || lower.includes('ahorro') || lower.includes('save')) {
    return lang === 'es'
      ? "Basado en tus datos: Intenta reducir gastos en 'Entertainment' y revisa tus suscripciones recurrentes. Podrías ahorrar un 15% más este mes."
      : "Based on your data: Try cutting down on 'Entertainment' and check recurring subscriptions. You could save 15% more this month.";
  }

  return lang === 'es'
    ? "Puedo analizar tus gastos. Prueba: '¿Cuánto gasté en comida?' o 'Dime mis mayores gastos'."
    : "I can analyze your spending. Try: 'How much did I spend on food?' or 'Top expenses'.";
};


// Message type for conversation history
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 3. Main Processor - Now with Claude API + Local Fallback
export const processAICommand = async (
  prompt: string,
  context: AppContextType,
  messages: ConversationMessage[] = [],
  previousSummary?: string
): Promise<AIResponse> => {
  // Try Claude API first
  if (claudeAvailable !== false) {
    try {
      const claudeResponse = await callClaudeAPI(prompt, context, messages, previousSummary);

      // If we got a valid response, mark Claude as available
      if (claudeResponse.intent !== 'unknown' || !claudeResponse.text.includes('Error')) {
        claudeAvailable = true;

        // Ensure date is properly formatted for transactions
        if (claudeResponse.structured?.type === 'transaction' && claudeResponse.structured.data) {
          const data = claudeResponse.structured.data;
          if (!data.date) {
            data.date = new Date().toISOString();
          }
          if (!data.accountId && context.accounts.length > 0) {
            data.accountId = context.accounts[0].id;
          }
        }

        return claudeResponse;
      }
    } catch (error) {
      console.warn('Claude API unavailable, falling back to local NLP:', error);
      claudeAvailable = false;
    }
  }

  // Fallback to local NLP processing
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = prompt.toLowerCase();
      const lang = detectLanguage(prompt, context.language);

      // -- A. Detect Intent --
      const isGoal = ['goal', 'meta', 'ahorro', 'save', 'objetivo'].some(k => lower.includes(k) && /\d/.test(prompt));
      let isIncome = INCOME_KEYWORDS.some(k => lower.includes(k));
      let isExpense = EXPENSE_KEYWORDS.some(k => lower.includes(k));
      const hasAmount = /\d/.test(prompt);

      if (lower.includes('salary') || lower.includes('nomina') || lower.includes('sueldo')) isIncome = true;

      const isAnalysis = ANALYSIS_KEYWORDS.some(k => lower.includes(k)) && !hasAmount;

      // -- B. Handle Analysis / Query --
      if (isAnalysis || (!isIncome && !isExpense && !isGoal && !hasAmount)) {
        const analysisText = generateAnalysis(prompt, context, lang);
        resolve({ text: analysisText, lang, intent: 'query' });
        return;
      }

      // -- C. Handle Creation (Goal) --
      if (isGoal && hasAmount) {
        const amount = extractAmount(prompt, lang);
        let name = lang === 'es' ? "Nueva Meta" : "New Goal";
        const nameMatch = prompt.match(/(?:para|for)\s+(.*)/i);
        if (nameMatch) name = nameMatch[1].split(/\d/)[0].trim();

        resolve({
          text: lang === 'es' ? "¡Entendido! He configurado tu meta de ahorro." : "Got it! I've set up your savings goal.",
          lang,
          intent: 'create',
          structured: {
            type: 'goal',
            data: {
              name: name.charAt(0).toUpperCase() + name.slice(1),
              targetAmount: amount,
              currentAmount: 0,
              currency: extractCurrency(prompt, context.currencyBase, lang),
              status: 'active'
            }
          }
        });
        return;
      }

      // -- D. Handle Creation (Transaction) --
      if (isIncome || isExpense || hasAmount) {
        const amount = extractAmount(prompt, lang);

        if (!amount) {
          resolve({
            text: lang === 'es'
              ? "Entendí que quieres registrar algo, pero me falta el monto. Ej: 'Gasté 20k'."
              : "I understand you want to record something, but I'm missing the amount. Ex: 'Spent 20k'.",
            lang,
            intent: 'unknown'
          });
          return;
        }

        let type: TransactionType = 'expense';
        if (isIncome) type = 'income';

        const category = extractCategory(prompt);
        const finalCategory = (type === 'income' && category === 'Misc')
          ? (lower.includes('cliente') ? 'Business' : 'Salary')
          : category;

        resolve({
          text: lang === 'es' ? `He preparado el ${type === 'income' ? 'ingreso' : 'gasto'}. ¿Confirmas?` : `I've drafted the ${type}. Confirm?`,
          lang,
          intent: 'create',
          structured: {
            type: 'transaction',
            data: {
              type,
              amount,
              currency: extractCurrency(prompt, context.currencyBase, lang),
              category: finalCategory,
              accountId: context.accounts[0]?.id,
              note: 'Created with AI',
              date: extractDate(prompt)
            }
          }
        });
        return;
      }

      resolve({
        text: lang === 'es'
          ? "No estoy seguro. Para crear, di 'Gasté 50k'. Para consejos, ve al Asistente."
          : "Not sure. To create, say 'Spent 50k'. For advice, use the Assistant.",
        lang,
        intent: 'unknown'
      });

    }, 300);
  });
};
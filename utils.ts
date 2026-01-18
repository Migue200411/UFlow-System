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

// --- AI ENGINE: CLAUDE API FIRST + MINIMAL FALLBACK ---

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

// Minimal language detection helpers (keep simple)
const ES_COMMON_WORDS = ['que', 'el', 'la', 'en', 'un', 'una', 'gasté', 'pagué', 'hoy', 'ayer'];
const EN_COMMON_WORDS = ['the', 'in', 'on', 'a', 'an', 'spent', 'paid', 'today', 'yesterday'];

const detectLanguage = (text: string, defaultLang: Language): Language => {
  const lower = text.toLowerCase();
  let esScore = 0;
  let enScore = 0;

  ES_COMMON_WORDS.forEach(w => { if (new RegExp(`\\b${w}\\b`).test(lower)) esScore++; });
  EN_COMMON_WORDS.forEach(w => { if (new RegExp(`\\b${w}\\b`).test(lower)) enScore++; });

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

// Simplified category extraction - Claude will handle this intelligently
const extractCategory = (text: string): string => {
  // Return generic category - Claude API will provide intelligent categorization
  // This is only used in minimal fallback
  return 'General';
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

// Simplified analysis - Claude will handle intelligent analysis
// This minimal fallback just provides a generic response
const generateAnalysis = (prompt: string, context: AppContextType, lang: Language): string => {
  return lang === 'es'
    ? "Para análisis detallados, asegúrate de que el servidor con Claude API esté corriendo. Usa 'npm run dev'."
    : "For detailed analysis, make sure the Claude API server is running. Use 'npm run dev'.";
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

  // MINIMAL FALLBACK: Only used when Claude API is unavailable
  return minimalFallback(prompt, context);
};

// Minimal fallback function - keeps it simple when Claude is down
const minimalFallback = (prompt: string, context: AppContextType): Promise<AIResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lang = detectLanguage(prompt, context.language);
      const hasNumber = /\d/.test(prompt);


      // If has number, assume user wants to create a transaction
      // Create a generic draft that they can edit manually
      if (hasNumber) {
        const amount = extractAmount(prompt, lang);

        resolve({
          text: lang === 'es'
            ? `He detectado un monto. Revisa y edita los detalles.`
            : `Amount detected. Please review and edit the details.`,
          lang,
          intent: 'create',
          structured: {
            type: 'transaction',
            data: {
              type: 'expense', // Default to expense
              amount: amount || 0,
              currency: context.currencyBase,
              category: 'General', // Generic category
              accountId: context.accounts[0]?.id,
              note: prompt, // Store the original prompt as the note
              date: new Date().toISOString()
            }
          }
        });
        return;
      }

      // No number detected - can't create anything
      // Suggest using Claude API for better understanding
      resolve({
        text: lang === 'es'
          ? "No detecté un monto. Asegúrate de que el servidor con Claude API esté corriendo para mejores resultados."
          : "No amount detected. Make sure the Claude API server is running for better results.",
        lang,
        intent: 'unknown'
      });

    }, 300);
  });
};
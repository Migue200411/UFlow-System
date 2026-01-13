import { FX_RATES } from './constants';
import { Currency, Language, AppContextType } from './types';

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
  
  const amountInCOP = amount * FX_RATES[from];
  
  if (base === 'COP') return amountInCOP;
  
  return amountInCOP / FX_RATES[base];
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

// --- MOCK AI ENGINE ---
// This simulates an NLP backend. It matches keywords and extracts entities.

interface AIResponse {
  text: string;
  structured?: {
    type: 'transaction' | 'goal';
    data: any;
  };
}

export const processAICommand = (prompt: string, context: AppContextType): Promise<AIResponse> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const p = prompt.toLowerCase();

      // 1. Transaction Creation Logic (Regex extraction)
      if (p.includes('spent') || p.includes('paid') || p.includes('buy') || p.includes('income') || p.includes('received') || p.includes('spend')) {
        
        // Extract Amount (e.g., 50k, 50000, 1.5m)
        let amount = 0;
        const numberMatch = p.match(/(\d+(?:[.,]\d+)?)(k|m)?/);
        if (numberMatch) {
          let val = parseFloat(numberMatch[1].replace(',', '.'));
          if (numberMatch[2] === 'k') val *= 1000;
          if (numberMatch[2] === 'm') val *= 1000000;
          amount = val;
        }

        // Extract Currency
        let currency = 'COP';
        if (p.includes('usd') || p.includes('dollar')) currency = 'USD';
        if (p.includes('eur') || p.includes('euro')) currency = 'EUR';

        // Extract Category
        let category = 'Misc';
        if (p.includes('food') || p.includes('lunch') || p.includes('dinner')) category = 'Food';
        if (p.includes('transport') || p.includes('taxi') || p.includes('uber')) category = 'Transport';
        if (p.includes('rent')) category = 'Rent';
        if (p.includes('salary')) category = 'Salary';

        // Extract Date (simple 'yesterday' logic)
        let date = new Date();
        if (p.includes('yesterday')) date.setDate(date.getDate() - 1);

        const type = (p.includes('income') || p.includes('received') || p.includes('salary')) ? 'income' : 'expense';

        resolve({
          text: `I've prepared a ${type} record for you. Does this look correct?`,
          structured: {
            type: 'transaction',
            data: {
              type,
              amount,
              currency,
              category,
              accountId: context.accounts[0]?.id, // Default to first account
              note: 'Created with AI',
              date: date.toISOString(),
            }
          }
        });
        return;
      }

      // 2. Goal Creation Logic
      if (p.includes('goal') || p.includes('save')) {
        let amount = 0;
        const numberMatch = p.match(/(\d+(?:[.,]\d+)?)(k|m)?/);
        if (numberMatch) {
          let val = parseFloat(numberMatch[1].replace(',', '.'));
          if (numberMatch[2] === 'k') val *= 1000;
          if (numberMatch[2] === 'm') val *= 1000000;
          amount = val;
        }

        resolve({
          text: "That's a great target. I've drafted a new savings goal.",
          structured: {
            type: 'goal',
            data: {
              name: 'New Goal',
              targetAmount: amount,
              currentAmount: 0,
              currency: context.currencyBase,
              status: 'active'
            }
          }
        });
        return;
      }

      // 3. Q&A / Recommendations (Context Aware)
      if (p.includes('balance') || p.includes('have')) {
        // Calculate total available
        const assets = context.accounts.reduce((acc, curr) => {
          const rawBalance = context.transactions
            .filter(t => t.accountId === curr.id)
            .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : t.amount), 0);
          return acc + convertToBase(rawBalance, curr.currency, context.currencyBase);
        }, 0);
        
        const fmt = formatCurrency(assets, context.currencyBase, context.language, false);
        resolve({
          text: `Your total calculated assets across all accounts are approximately ${fmt}. This includes all liquidity sources.`
        });
        return;
      }

      if (p.includes('burn') || p.includes('spend') || p.includes('expenses')) {
         resolve({
             text: "Your monthly burn rate is currently 12% higher than last month. Primary drivers: Food & Transport. Recommendation: Review recurring subscriptions."
         });
         return;
      }

      // Default Fallback
      resolve({
        text: "I can help you track expenses, set goals, or analyze your cash flow. Try saying 'I spent 20k on taxi' or 'Create a goal for 5M'."
      });

    }, 1200); // 1.2s Artificial Delay
  });
};
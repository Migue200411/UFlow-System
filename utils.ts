import { FX_RATES } from './constants';
import { Currency, Language } from './types';

export const formatCurrency = (
  amount: number,
  currency: Currency,
  lang: Language,
  showCents: boolean
): string => {
  const isCOP = currency === 'COP';
  
  // Define options based on requirements
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    // For COP: default no cents, unless showCents is true.
    // For USD/EUR: default 2 decimals.
    minimumFractionDigits: isCOP ? (showCents ? 2 : 0) : 2,
    maximumFractionDigits: isCOP ? (showCents ? 2 : 0) : 2,
  };

  // Locale override specifically for formatting preferences
  // ES: 1.234.567,00
  // EN: 1,234,567.00
  const locale = lang === 'es' ? 'es-CO' : 'en-US';
  
  try {
    const formatter = new Intl.NumberFormat(locale, options);
    let formatted = formatter.format(amount);

    // Custom tweak for COP in English to ensure "COP" prefix is clear if the browser defaults to symbol
    // However, Intl usually handles this. If we want "US$ 100" style vs "$100", Intl does it via currencyDisplay.
    // The prompt requested: 
    // ES: $ 1.234.567 (COP) -> Standard es-CO
    // EN: COP $1,234,567 -> Standard en-US usually prints "COP 1,234,567.00" or "$1,234,567.00" depending on impl.
    // Let's force a bit of consistency if needed, but Intl is usually best left alone for robustness.
    
    // Fix: Some browsers might use 'COP' symbol as '$'.
    // If EN and COP, we want to be explicit.
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
  
  // Convert 'from' to COP (intermediate)
  const amountInCOP = amount * FX_RATES[from];
  
  // Convert COP to 'base'
  if (base === 'COP') return amountInCOP;
  
  return amountInCOP / FX_RATES[base];
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = () => Math.random().toString(36).substring(2, 9);
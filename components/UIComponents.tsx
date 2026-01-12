import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../utils';
import { useApp } from '../context/AppContext';
import { Check, ChevronDown, ChevronUp, X, AlertCircle, Info, CheckCircle, Loader2 } from 'lucide-react';

// --- Toast Notification (Glass Style) ---
export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastContainer: React.FC<{ toasts: ToastData[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={cn(
            "pointer-events-auto min-w-[320px] p-4 rounded-2xl border backdrop-blur-xl shadow-glass flex items-center gap-3 transition-all duration-500 animate-in slide-in-from-right-12 fade-in",
            toast.type === 'success' && "bg-white/90 dark:bg-[#1A1A25]/90 border-green-500/20 text-green-700 dark:text-green-400",
            toast.type === 'error' && "bg-white/90 dark:bg-[#1A1A25]/90 border-red-500/20 text-red-700 dark:text-red-400",
            toast.type === 'info' && "bg-white/90 dark:bg-[#1A1A25]/90 border-brand-500/20 text-brand-700 dark:text-brand-400",
          )}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium tracking-wide">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

// --- Card (Premium Glass) ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'alert' | 'ghost' }> = ({ className, children, variant = 'default', ...props }) => {
  return (
    <div 
      className={cn(
        "relative rounded-2xl p-6 transition-all duration-300 group",
        "glass-panel hover:border-brand-500/20 hover:shadow-premium",
        variant === 'alert' && "border-red-500/20 bg-red-500/5 dark:bg-red-500/10",
        variant === 'ghost' && "bg-transparent border-transparent shadow-none backdrop-blur-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- Button (Relaxed & Glowing) ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ className, variant = 'primary', size = 'md', children, loading, ...props }) => {
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]",
        "dark:focus:ring-offset-dark-bg tracking-wide",
        
        variant === 'primary' && "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-neon hover:shadow-[0_0_25px_-5px_rgba(124,92,255,0.6)] border border-white/10 hover:brightness-110",
        
        variant === 'secondary' && "bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/10 backdrop-blur-md shadow-sm hover:border-brand-500/30",
        
        variant === 'ghost' && "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100",
        
        variant === 'danger' && "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)]",
        
        variant === 'icon' && "bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/20 hover:border-brand-500/20 rounded-full aspect-square shadow-sm",

        size === 'sm' && "h-8 px-3 text-xs gap-1.5",
        size === 'md' && "h-11 px-5 text-sm gap-2",
        size === 'lg' && "h-13 px-7 text-base gap-2.5",
        size === 'icon' && "h-10 w-10 p-0",
        className
      )} 
      {...props} 
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

// --- Input (Transparent/Glass) ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ className, label, ...props }) => {
  return (
    <div className="space-y-2 w-full min-w-0 group">
      {label && <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">{label}</label>}
      <input 
        className={cn(
          "w-full h-11 px-4 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 backdrop-blur-sm",
          "text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400/70 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-black/40 transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
};

// --- Custom Select (Floating Glass Menu) ---
interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string; icon?: React.ReactNode }[];
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ label, value, onChange, options, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={cn("space-y-2 w-full min-w-0 relative group", className)} ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-11 px-4 flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 backdrop-blur-sm",
          "text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all hover:bg-white dark:hover:bg-white/5 shadow-sm"
        )}
      >
        <span className="flex items-center gap-3 truncate">
          {selectedOption?.icon && <span className="text-zinc-500 dark:text-zinc-400">{selectedOption.icon}</span>}
          <span className="font-medium">{selectedOption?.label}</span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 p-1 bg-white/95 dark:bg-[#1A1A25]/90 border border-zinc-200 dark:border-white/10 rounded-xl shadow-glass backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 origin-top overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between rounded-lg transition-all duration-200 group/item",
                value === opt.value 
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold" 
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
              )}
            >
              <span className="flex items-center gap-3 truncate">
                 {opt.icon && <span className={cn("opacity-70 group-hover/item:text-brand-500 transition-colors", value === opt.value && "text-brand-500")}>{opt.icon}</span>}
                 {opt.label}
              </span>
              {value === opt.value && <Check className="w-4 h-4 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Segmented Control (Pill) ---
interface SegmentedControlProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, value, onChange, options }) => {
  return (
    <div className="space-y-2 w-full">
      {label && <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="flex p-1.5 bg-zinc-200/50 dark:bg-black/30 border border-zinc-200 dark:border-white/5 rounded-xl relative backdrop-blur-md">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all z-10 duration-300",
              value === opt.value 
                ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white/30 dark:hover:bg-white/5 scale-95"
            )}
          >
            {opt.icon && <span className="w-3.5 h-3.5">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Toggle Switch (Glass) ---
interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: () => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between w-full py-2 group cursor-pointer" onClick={onChange}>
      {label && <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{label}</span>}
      <button
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          checked ? "bg-brand-500" : "bg-zinc-300 dark:bg-white/10"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
};

// --- Modal (Frosted Glass) ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md glass-panel rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 max-h-[90vh] overflow-y-auto border border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200/50 dark:border-white/10 sticky top-0 bg-white/80 dark:bg-[#151520]/80 backdrop-blur-xl z-10">
          <h3 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full transition-colors group">
            <X className="w-5 h-5 text-zinc-500 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- Badge (Pill) ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' }> = ({ children, variant = 'neutral' }) => {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm backdrop-blur-md",
      variant === 'neutral' && "bg-zinc-100/80 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400",
      variant === 'success' && "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400",
      variant === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
      variant === 'danger' && "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
      variant === 'brand' && "bg-brand-500/10 border-brand-500/20 text-brand-700 dark:text-brand-300",
    )}>
      {children}
    </span>
  );
};

// --- Money Display (Neon) ---
export const Money: React.FC<{ amount: number; currency: string; privacy?: boolean }> = ({ amount, currency, privacy }) => {
  const { showCents, language, privacyMode } = useApp();
  const formatted = new Intl.NumberFormat(language === 'es' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? (showCents ? 2 : 0) : 2,
    maximumFractionDigits: currency === 'COP' ? (showCents ? 2 : 0) : 2,
  }).format(amount);

  const display = (language === 'en' && currency === 'COP' && !formatted.includes('COP')) 
    ? `COP ${formatted}` 
    : formatted;

  const isBlurred = privacy !== undefined ? privacy : privacyMode;

  return (
    <span className={cn("font-mono font-semibold tracking-tight whitespace-nowrap safe-text transition-all duration-300", isBlurred && "privacy-blur blur-md opacity-70")}>
      {display}
    </span>
  );
};
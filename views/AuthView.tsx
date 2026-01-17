import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/UIComponents';
import { cn } from '../utils';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Chrome, AlertCircle, Bug } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, loginWithGoogle } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // --- VALIDATION LOGIC ---
  const isValidEmail = email.includes('@') && email.trim().length > 3;
  const isValidPass = password.length >= 6;
  
  // Strict condition to enable button
  const canSubmit = mode === 'login'
    ? isValidEmail && isValidPass && !isLoading
    : isValidEmail && isValidPass && name.trim().length > 0 && password === confirmPass && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (password !== confirmPass) {
          throw new Error("Passwords do not match"); 
        }
        await register(email, password, name);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      // Strip Firebase prefixes for cleaner UI
      const msg = error.message?.replace('Firebase: ', '').replace(' (auth/invalid-email).', '') || "Authentication Failed";
      setLocalError(msg);
    } finally {
      // CRITICAL: Always reset loading state
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setLocalError("Google Auth Failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0B12] relative overflow-hidden text-zinc-200 font-sans selection:bg-brand-500/30 selection:text-white">
      
      {/* Premium Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-brand-900/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-800/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Noise Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

      <div className="w-full max-w-md z-10 p-6 animate-in zoom-in-95 fade-in duration-700 flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="text-center mb-10">
           <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 bg-brand-600 rounded-xl rotate-45 shadow-[0_0_30px_rgba(124,92,255,0.6)] flex items-center justify-center border border-white/20">
                 <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
              </div>
           </div>
           <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-2 drop-shadow-sm">UFLOW</h1>
           <p className="text-brand-300 font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">Control Your Financial Flow</p>
        </div>

        {/* Glass Card Container */}
        <div className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1 shadow-2xl ring-1 ring-white/5 overflow-hidden">
          
          {/* Segmented Control (Tabs) */}
          <div className="flex p-1.5 bg-black/40 rounded-[28px] rounded-b-xl mb-8 relative">
            <button 
              type="button"
              onClick={() => { setMode('login'); setLocalError(null); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl transition-all duration-500 ease-out z-10",
                mode === 'login' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Log In
            </button>
            <button 
              type="button"
              onClick={() => { setMode('register'); setLocalError(null); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl transition-all duration-500 ease-out z-10",
                mode === 'register' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Sign Up
            </button>
            
            {/* Sliding Background Pill */}
            <div 
              className={cn(
                "absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-brand-600 rounded-2xl shadow-[0_4px_20px_-4px_rgba(124,92,255,0.5)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                mode === 'login' ? "left-1.5" : "left-[calc(50%+3px)]"
              )} 
            />
          </div>

          <div className="px-6 pb-8">
            {/* Error Banner */}
            {localError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-xs text-red-200 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {localError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'register' && (
                <div className="space-y-1 animate-in slide-in-from-left fade-in duration-500">
                   <div className="relative group">
                     <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
                     <input
                       type="text"
                       placeholder="Full Name"
                       required
                       value={name}
                       onChange={e => setName(e.target.value)}
                       className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-black/40 transition-all shadow-inner"
                     />
                   </div>
                </div>
              )}

              <div className="relative group">
                 <Mail className={cn("absolute left-4 top-3.5 w-5 h-5 transition-colors", isValidEmail ? "text-green-500" : "text-zinc-500 group-focus-within:text-brand-400")} />
                 <input
                   type="email"
                   placeholder="Email Address"
                   required
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-black/40 transition-all shadow-inner"
                 />
              </div>

              <div className="relative group">
                 <Lock className={cn("absolute left-4 top-3.5 w-5 h-5 transition-colors", isValidPass ? "text-green-500" : "text-zinc-500 group-focus-within:text-brand-400")} />
                 <input
                   type="password"
                   placeholder="Password (min 6 chars)"
                   required
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-black/40 transition-all shadow-inner"
                 />
              </div>

              {mode === 'register' && (
                <div className="relative group animate-in slide-in-from-left fade-in duration-500">
                   <ShieldCheck className={cn("absolute left-4 top-3.5 w-5 h-5 transition-colors", (password === confirmPass && confirmPass.length >= 6) ? "text-green-500" : "text-zinc-500 group-focus-within:text-brand-400")} />
                   <input
                     type="password"
                     placeholder="Confirm Password"
                     required
                     value={confirmPass}
                     onChange={e => setConfirmPass(e.target.value)}
                     className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-black/40 transition-all shadow-inner"
                   />
                </div>
              )}

              <Button 
                variant="primary" 
                type="submit"
                className={cn(
                  "w-full mt-6 h-12 text-sm bg-gradient-to-r from-brand-600 to-brand-500 border-none shadow-[0_0_25px_-5px_rgba(124,92,255,0.6)] rounded-2xl transition-all duration-300",
                  !canSubmit && "opacity-50 cursor-not-allowed shadow-none grayscale"
                )} 
                disabled={!canSubmit}
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    {mode === 'login' ? 'Authenticate' : 'Initialize System'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            
            <div className="relative my-8">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
               <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider"><span className="bg-[#12121a] px-3 text-zinc-600">Secure Link</span></div>
            </div>

            <Button 
               variant="secondary" 
               className="w-full bg-white text-zinc-900 hover:bg-zinc-200 border-none font-bold h-12 rounded-2xl"
               onClick={handleGoogleLogin}
               type="button"
               disabled={isLoading}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
          </div>
        </div>
        
        <div className="text-center mt-8 text-[10px] text-zinc-600 font-mono tracking-wide">
           ENCRYPTED CONNECTION • SYSTEM V2.4
        </div>

        {/* --- DEBUG PANEL (Only for Dev) --- */}
        {process.env.NODE_ENV !== 'production' && (
           <div className="mt-8 p-4 rounded-xl bg-black/40 border border-white/5 w-full font-mono text-[9px] text-zinc-500 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 mb-2"><Bug className="w-3 h-3"/> DEBUG MONITOR</div>
              <div className="flex justify-between"><span>Email Valid:</span> <span className={isValidEmail ? "text-green-500" : "text-red-500"}>{String(isValidEmail)}</span></div>
              <div className="flex justify-between"><span>Pass Valid (&gt;=6):</span> <span className={isValidPass ? "text-green-500" : "text-red-500"}>{String(isValidPass)}</span></div>
              <div className="flex justify-between"><span>Is Loading:</span> <span className={isLoading ? "text-amber-500" : "text-zinc-500"}>{String(isLoading)}</span></div>
              <div className="flex justify-between"><span>Can Submit:</span> <span className={canSubmit ? "text-green-500 font-bold" : "text-red-500"}>{String(canSubmit)}</span></div>
           </div>
        )}

      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/UIComponents';
import { cn } from '../utils';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Chrome } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, loginWithGoogle } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      // Error handled by Toast in Context
    } finally {
      setIsLoading(false);
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

      <div className="w-full max-w-md z-10 p-6 animate-in zoom-in-95 fade-in duration-700">
        
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
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1 shadow-2xl ring-1 ring-white/5 overflow-hidden">
          
          {/* Segmented Control (Tabs) */}
          <div className="flex p-1.5 bg-black/40 rounded-[28px] rounded-b-xl mb-8 relative">
            <button 
              type="button"
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl transition-all duration-500 ease-out z-10",
                mode === 'login' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Log In
            </button>
            <button 
              type="button"
              onClick={() => setMode('register')}
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
                 <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
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
                 <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
                 <input
                   type="password"
                   placeholder="Password"
                   required
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 focus:bg-black/40 transition-all shadow-inner"
                 />
              </div>

              {mode === 'register' && (
                <div className="relative group animate-in slide-in-from-left fade-in duration-500">
                   <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
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
                className="w-full mt-6 h-12 text-sm bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 border-none shadow-[0_0_25px_-5px_rgba(124,92,255,0.6)] rounded-2xl" 
                disabled={isLoading}
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
               onClick={loginWithGoogle}
               type="button"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
          </div>
        </div>
        
        <div className="text-center mt-8 text-[10px] text-zinc-600 font-mono tracking-wide">
           ENCRYPTED CONNECTION • SYSTEM V2.4
        </div>

      </div>
    </div>
  );
};
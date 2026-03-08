import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { cn } from '../utils';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, loginWithGoogle, resetPassword } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isValidEmail = email.includes('@') && email.trim().length > 3;
  const isValidPass = password.length >= 6;
  const canSubmit = isValidEmail && isValidPass && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      const msg = error.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Error de autenticacion';
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setLocalError('Error con Google. Intenta de nuevo.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSent(false);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (error: any) {
      const msg = error.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Error al enviar email';
      setResetError(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] font-sans selection:bg-brand-500/20">
      <div className="w-full max-w-sm px-5 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/icon.png" alt="uFlow" className="w-9 h-9" />
            <span className="text-xl font-bold tracking-tight text-zinc-900">uFlow</span>
          </div>
        </div>

        {showReset ? (
          /* ── Reset password view ── */
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Recuperar contrasena</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Te enviaremos un link para restablecer tu contrasena</p>
            </div>

            {resetSent && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2.5 text-xs text-green-700 animate-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Si existe una cuenta con ese email, recibiras un enlace de recuperacion. Revisa tu bandeja de entrada y spam.
              </div>
            )}

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-600 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="email"
                  placeholder="Email de tu cuenta"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={!resetEmail.includes('@')}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-[0.98]",
                  !resetEmail.includes('@') && "opacity-40 cursor-not-allowed shadow-none"
                )}
              >
                Enviar link de recuperacion
              </button>
            </form>

            <button
              onClick={() => { setShowReset(false); setResetSent(false); setResetError(null); }}
              className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-brand-600 font-medium transition-colors"
            >
              Volver al login
            </button>
          </>
        ) : (
          /* ── Login view ── */
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Bienvenido de vuelta</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Inicia sesion para acceder a tu cuenta</p>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[#FAFAFA] px-3 text-zinc-400">o con email</span></div>
            </div>

            {/* Error */}
            {localError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-600 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {localError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative group">
                <Mail className={cn("absolute left-3.5 top-3 w-4 h-4 transition-colors", isValidEmail ? "text-brand-500" : "text-zinc-400 group-focus-within:text-brand-500")} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className={cn("absolute left-3.5 top-3 w-4 h-4 transition-colors", isValidPass ? "text-brand-500" : "text-zinc-400 group-focus-within:text-brand-500")} />
                <input
                  type="password"
                  placeholder="Contrasena"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email); }}
                  className="text-xs text-zinc-400 hover:text-brand-500 font-medium transition-colors"
                >
                  Olvidaste tu contrasena?
                </button>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-[0.98]",
                  !canSubmit && "opacity-40 cursor-not-allowed shadow-none"
                )}
              >
                {isLoading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Iniciar sesion'}
              </button>
            </form>

            {/* Beta notice */}
            <p className="mt-6 text-center text-[11px] text-zinc-400 leading-relaxed">
              Acceso limitado durante beta privado.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

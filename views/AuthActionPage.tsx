import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Loader2, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils';

export const AuthActionPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode') || '';

  if (mode === 'resetPassword') {
    return <ResetPasswordPage oobCode={oobCode} />;
  }

  // Fallback for other modes (verifyEmail, etc.)
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] font-sans">
      <div className="text-center">
        <p className="text-zinc-500 text-sm">Enlace no valido o expirado.</p>
        <a href="/login" className="mt-4 inline-block text-sm text-brand-600 hover:text-brand-700 font-medium">
          Volver al login
        </a>
      </div>
    </div>
  );
};

const ResetPasswordPage: React.FC<{ oobCode: string }> = ({ oobCode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'verifying' | 'ready' | 'submitting' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Verify the code is valid
  useEffect(() => {
    if (!oobCode) {
      setStatus('error');
      setError('Enlace invalido o expirado.');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setError('Este enlace ha expirado o ya fue usado. Solicita uno nuevo.');
      });
  }, [oobCode]);

  const isValidPass = password.length >= 6;
  const passwordsMatch = password === confirmPass && confirmPass.length > 0;
  const canSubmit = isValidPass && passwordsMatch && status === 'ready';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setError('');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err: any) {
      setStatus('ready');
      const msg = err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Error al cambiar la contrasena';
      setError(msg);
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

        {/* Verifying */}
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm text-zinc-500">Verificando enlace...</p>
          </div>
        )}

        {/* Error (invalid/expired link) */}
        {status === 'error' && !email && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Enlace no valido</h1>
            <p className="text-sm text-zinc-500">{error}</p>
            <a
              href="/login"
              className="inline-block mt-2 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            >
              Volver al login
            </a>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Contrasena actualizada</h1>
            <p className="text-sm text-zinc-500">Tu contrasena ha sido cambiada exitosamente.</p>
            <a
              href="/login"
              className="inline-block mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Iniciar sesion
            </a>
          </div>
        )}

        {/* Reset Form */}
        {(status === 'ready' || status === 'submitting') && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Nueva contrasena</h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Crea una nueva contrasena para <span className="font-medium text-zinc-700">{email}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-600 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* New password */}
              <div className="relative group">
                <Lock className={cn(
                  "absolute left-3.5 top-3 w-4 h-4 transition-colors",
                  isValidPass ? "text-brand-500" : "text-zinc-400 group-focus-within:text-brand-500"
                )} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Nueva contrasena (min. 6 caracteres)"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative group">
                <Lock className={cn(
                  "absolute left-3.5 top-3 w-4 h-4 transition-colors",
                  passwordsMatch ? "text-brand-500" : "text-zinc-400 group-focus-within:text-brand-500"
                )} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmar contrasena"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength hints */}
              {password.length > 0 && (
                <div className="space-y-1 px-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isValidPass ? "bg-green-500" : "bg-zinc-300")} />
                    <span className={isValidPass ? "text-green-600" : "text-zinc-400"}>Minimo 6 caracteres</span>
                  </div>
                  {confirmPass.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className={cn("w-1.5 h-1.5 rounded-full", passwordsMatch ? "bg-green-500" : "bg-red-400")} />
                      <span className={passwordsMatch ? "text-green-600" : "text-red-500"}>
                        {passwordsMatch ? 'Las contrasenas coinciden' : 'Las contrasenas no coinciden'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === 'submitting'}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-[0.98]",
                  (!canSubmit || status === 'submitting') && "opacity-40 cursor-not-allowed shadow-none"
                )}
              >
                {status === 'submitting' ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Cambiar contrasena'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

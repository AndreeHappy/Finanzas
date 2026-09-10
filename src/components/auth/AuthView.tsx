import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeSlash,
  LockKey,
  EnvelopeSimple,
  User,
  SignIn,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  WarningCircle,
  Key,
  PaperPlaneTilt,
  CheckCircle,
  PaperPlaneRight,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot_password';

function translateSupabaseError(error: string): { title: string; hint?: string; isUnconfirmedEmail?: boolean } {
  const lower = error.toLowerCase();

  if (lower.includes('email not confirmed')) {
    return {
      title: 'Tu correo electrónico aún no ha sido confirmado.',
      hint: 'Revisa tu bandeja de entrada (y spam) para hacer clic en el enlace de verificación.',
      isUnconfirmedEmail: true,
    };
  }
  if (lower.includes('invalid login credentials')) {
    return {
      title: 'Correo electrónico o contraseña incorrectos.',
      hint: 'Verifica que tus datos estén bien escritos o usa "¿Olvidaste tu contraseña?".',
    };
  }
  if (lower.includes('user already registered')) {
    return {
      title: 'Este correo ya tiene una cuenta registrada.',
      hint: 'Selecciona la pestaña "Iniciar Sesión" para ingresar.',
    };
  }
  if (lower.includes('password should be at least 6 characters')) {
    return {
      title: 'La contraseña es demasiado corta.',
      hint: 'Debe tener un mínimo de 6 caracteres.',
    };
  }
  if (lower.includes('otp_expired') || lower.includes('email link is invalid or has expired')) {
    return {
      title: 'El enlace de correo ha expirado o ya fue utilizado.',
      hint: 'Por favor solicita un nuevo correo de acceso o confirmación.',
      isUnconfirmedEmail: true,
    };
  }
  if (lower.includes('rate limit')) {
    return {
      title: 'Demasiadas solicitudes consecutivas.',
      hint: 'Por favor espera unos momentos antes de intentar otra vez.',
    };
  }

  return { title: error };
}

export const AuthView: React.FC = () => {
  const {
    login,
    register,
    resetPasswordForEmail,
    updateUserPassword,
    resendVerificationEmail,
    isPasswordRecovery,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('finanzas_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [errorDetails, setErrorDetails] = useState<{ title: string; hint?: string; isUnconfirmedEmail?: boolean } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Asegurar tema blanco en la pantalla de autenticación
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);



  // Detect URL Hash errors from Supabase
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const errorDesc = params.get('error_description');
      const errorCode = params.get('error_code');

      if (errorDesc || errorCode) {
        setErrorDetails(translateSupabaseError(errorDesc || errorCode || 'Error de autenticación'));
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setErrorDetails({ title: 'Ingresa tu correo para reenviar la confirmación.' });
      return;
    }
    setIsResendingEmail(true);
    try {
      const res = await resendVerificationEmail(email.trim());
      if (res.error) {
        setErrorDetails(translateSupabaseError(res.error));
      } else {
        setSuccessMsg(`¡Nuevo enlace de verificación enviado a ${email.trim()}! Revisa tu bandeja de entrada.`);
      }
    } catch {
      setErrorDetails({ title: 'Error al reenviar el correo de verificación.' });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanEmail) {
      try {
        localStorage.setItem('finanzas_remembered_email', cleanEmail);
      } catch {
        // Ignorar
      }
    }

    setIsLoading(true);

    try {
      if (isPasswordRecovery) {
        if (newPassword.length < 6) {
          setErrorDetails({ title: 'La nueva contraseña debe tener al menos 6 caracteres.' });
          setIsLoading(false);
          return;
        }
        const res = await updateUserPassword(newPassword);
        if (res.error) {
          setErrorDetails(translateSupabaseError(res.error));
        } else {
          setSuccessMsg('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.');
          setNewPassword('');
        }
        setIsLoading(false);
        return;
      }

      if (mode === 'forgot_password') {
        if (!cleanEmail) {
          setErrorDetails({ title: 'Ingresa tu correo para enviarte el enlace de recuperación.' });
          setIsLoading(false);
          return;
        }
        const res = await resetPasswordForEmail(cleanEmail);
        if (res.error) {
          setErrorDetails(translateSupabaseError(res.error));
        } else {
          setSuccessMsg(`Te hemos enviado un correo a ${cleanEmail} con las instrucciones para restablecer tu contraseña.`);
        }
        setIsLoading(false);
        return;
      }

      if (mode === 'login') {
        if (!cleanEmail || !cleanPassword) {
          setErrorDetails({ title: 'Por favor ingresa tu correo y contraseña.' });
          setIsLoading(false);
          return;
        }
        const res = await login(cleanEmail, cleanPassword);
        if (res.error) {
          setErrorDetails(translateSupabaseError(res.error));
        }
        setIsLoading(false);
        return;
      }

      if (mode === 'register') {
        if (!cleanEmail || !cleanPassword) {
          setErrorDetails({ title: 'Por favor completa todos los campos requeridos.' });
          setIsLoading(false);
          return;
        }
        if (cleanPassword.length < 6) {
          setErrorDetails({ title: 'La contraseña debe tener al menos 6 caracteres.' });
          setIsLoading(false);
          return;
        }

        const res = await register(cleanEmail, cleanPassword, fullName.trim());
        if (res.error) {
          setErrorDetails(translateSupabaseError(res.error));
        } else if (res.requiresEmailConfirmation) {
          setSuccessMsg(
            `¡Cuenta registrada! Hemos enviado un enlace de confirmación a ${cleanEmail}. Por favor revisa tu correo y haz clic en el enlace para iniciar sesión.`
          );
          setMode('login');
          setPassword('');
        } else {
          setSuccessMsg('¡Cuenta registrada con éxito! Ya puedes iniciar sesión.');
          setMode('login');
          setPassword('');
        }
        setIsLoading(false);
        return;
      }
    } catch {
      setErrorDetails({ title: 'Ocurrió un error inesperado al procesar la solicitud.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col lg:flex-row antialiased selection:bg-emerald-500/20 selection:text-emerald-800 overflow-hidden">
      {/* FONDO COMPLETO EN TODA LA PANTALLA: Imagen nítida de oro */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/oro.jpg"
          alt="Oro"
          className="w-full h-full object-cover object-center select-none brightness-[0.98] contrast-[1.05]"
        />
        {/* Sutil viñeta para contraste y lectura óptima dejando traslúcido el lado del login */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-black/10 backdrop-contrast-[1.02]" />
      </div>

      {/* ALERTA FLOTANTE: Notificación de Sesión Expirada (auto-dismiss) */}
      <AnimatePresence>
        {sessionExpiredNotice && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-2xl bg-amber-500/95 backdrop-blur-md text-white shadow-2xl border border-amber-400/80 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <WarningCircle size={22} weight="fill" className="text-amber-100 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold leading-snug">
                {sessionExpiredNotice}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSessionExpiredNotice}
              className="text-amber-100 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LADO IZQUIERDO: TÍTULO Y PRESENTACIÓN (SOLO DESKTOP) */}
      <div className="relative z-10 hidden lg:flex w-full lg:w-[48%] xl:w-[52%] p-8 sm:p-12 lg:p-16 flex-col justify-end lg:min-h-screen">
        <div className="max-w-md my-auto lg:my-0 lg:mb-14">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.75)]">
            Modulo finanzas
          </h1>
          <p className="text-base sm:text-lg text-slate-100 mt-4 font-medium leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
            Control y gestión inteligente de tus finanzas personales.
          </p>
        </div>
      </div>

      {/* LADO DERECHO / VISTA MÓVIL CENTRADA: FORMULARIO FLOTANTE TRANSPARENTE GLASS */}
      <div className="relative z-10 w-full lg:w-[52%] xl:w-[48%] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 min-h-[100dvh]">
        {/* Cabecera Móvil Compacta Centrada */}
        <div className="text-center mb-3 sm:mb-4 lg:hidden w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_3px_15px_rgba(0,0,0,0.85)]">
            Modulo finanzas
          </h1>
          <p className="text-xs text-slate-100 mt-1 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Control y gestión inteligente de tus finanzas personales.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md bg-white/30 hover:bg-white/35 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.3)] flex flex-col gap-4 sm:gap-5 my-auto transition-all"
        >
          {/* Cabecera del Formulario: Icono al lado del título con letra más compacta */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center shadow-md shrink-0">
                {isPasswordRecovery ? <Key size={22} weight="bold" /> : <ShieldCheck size={22} weight="bold" />}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {isPasswordRecovery
                  ? 'Restablecer Contraseña'
                  : mode === 'forgot_password'
                  ? 'Recuperar Mi Cuenta'
                  : mode === 'login'
                  ? 'Iniciar Sesión'
                  : 'Crear Mi Cuenta'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 font-bold leading-relaxed pl-0.5">
              {isPasswordRecovery
                ? 'Ingresa tu nueva clave para recuperar el acceso a tu cuenta'
                : mode === 'forgot_password'
                ? 'Te enviaremos un enlace seguro para restablecer tu acceso'
                : mode === 'login'
                ? 'Accede a tu panel y controla tus fondos con tranquilidad'
                : 'Empieza a separar tu gasto diario de tu reserva protegida'}
            </p>
          </div>

          {/* Selector de Pestaña (Login / Registro) con Botón Negro y Texto Blanco */}
          {!isPasswordRecovery && mode !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/15 backdrop-blur-md border border-slate-300/80 relative gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorDetails(null);
                  setSuccessMsg(null);
                }}
                className={`relative py-2.5 text-xs font-black transition-all z-10 rounded-xl cursor-pointer ${
                  mode === 'login' ? 'text-white' : 'text-slate-800 hover:text-black'
                }`}
              >
                {mode === 'login' && (
                  <motion.div
                    layoutId="auth-black-tab"
                    className="absolute inset-0 bg-zinc-950 rounded-xl shadow-md border border-black"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <SignIn size={18} weight="bold" className={mode === 'login' ? 'text-white' : 'text-black'} />
                  <span>Iniciar Sesión</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorDetails(null);
                  setSuccessMsg(null);
                }}
                className={`relative py-2.5 text-xs font-black transition-all z-10 rounded-xl cursor-pointer ${
                  mode === 'register' ? 'text-white' : 'text-slate-800 hover:text-black'
                }`}
              >
                {mode === 'register' && (
                  <motion.div
                    layoutId="auth-black-tab"
                    className="absolute inset-0 bg-zinc-950 rounded-xl shadow-md border border-black"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <UserPlus size={18} weight="bold" className={mode === 'register' ? 'text-white' : 'text-black'} />
                  <span>Registrarse</span>
                </span>
              </button>
            </div>
          )}

          {/* Mensaje de Error */}
          <AnimatePresence>
            {errorDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-center gap-2 text-rose-700 font-bold">
                  <WarningCircle size={17} weight="fill" className="shrink-0 text-rose-600" />
                  <span>{errorDetails.title}</span>
                </div>
                {errorDetails.hint && (
                  <p className="text-[11px] text-rose-800 leading-relaxed pl-6">
                    {errorDetails.hint}
                  </p>
                )}

                {errorDetails.isUnconfirmedEmail && (
                  <div className="pt-2 border-t border-rose-200 pl-6 flex justify-start">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResendingEmail}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <PaperPlaneRight size={13} />
                      <span>{isResendingEmail ? 'Reenviando...' : 'Reenviar correo de verificación ahora'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mensaje de Éxito */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 shadow-sm"
              >
                <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulario con Iconos Negros y Botones Negros */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isPasswordRecovery ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                  Nueva Contraseña
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-black pointer-events-none flex items-center justify-center">
                    <LockKey size={20} weight="bold" />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    required
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/85 hover:bg-white/95 focus:bg-white border border-slate-300 focus:border-zinc-950 focus:ring-4 focus:ring-black/10 text-sm font-black text-slate-950 placeholder-slate-500 outline-none transition-all font-mono shadow-sm backdrop-blur-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 text-black hover:text-slate-700 transition-colors cursor-pointer p-1"
                  >
                    {showNewPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                  </button>
                </div>
              </div>
            ) : mode === 'forgot_password' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                  Correo Electrónico Registrado
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-black pointer-events-none flex items-center justify-center">
                    <EnvelopeSimple size={20} weight="bold" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      try {
                        localStorage.setItem('finanzas_remembered_email', e.target.value.trim());
                      } catch {}
                    }}
                    placeholder="usuario@ejemplo.com"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-3.5 py-3 rounded-xl bg-white/85 hover:bg-white/95 focus:bg-white border border-slate-300 focus:border-zinc-950 focus:ring-4 focus:ring-black/10 text-sm font-black text-slate-950 placeholder-slate-500 outline-none transition-all shadow-sm backdrop-blur-md"
                  />
                </div>
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <label className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                      Nombre Completo
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-black pointer-events-none flex items-center justify-center">
                        <User size={20} weight="bold" />
                      </span>
                      <input
                        type="text"
                        name="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        autoComplete="name"
                        className="w-full pl-11 pr-3.5 py-3 rounded-xl bg-white/85 hover:bg-white/95 focus:bg-white border border-slate-300 focus:border-zinc-950 focus:ring-4 focus:ring-black/10 text-sm font-black text-slate-950 placeholder-slate-500 outline-none transition-all shadow-sm backdrop-blur-md"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-black pointer-events-none flex items-center justify-center">
                      <EnvelopeSimple size={20} weight="bold" />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        try {
                          localStorage.setItem('finanzas_remembered_email', e.target.value.trim());
                        } catch {}
                      }}
                      placeholder="usuario@ejemplo.com"
                      autoComplete="email"
                      required
                      className="w-full pl-11 pr-3.5 py-3 rounded-xl bg-white/85 hover:bg-white/95 focus:bg-white border border-slate-300 focus:border-zinc-950 focus:ring-4 focus:ring-black/10 text-sm font-black text-slate-950 placeholder-slate-500 outline-none transition-all shadow-sm backdrop-blur-md"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                      Contraseña
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setErrorDetails(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] font-black text-slate-900 hover:text-black hover:underline transition-colors cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-black pointer-events-none flex items-center justify-center">
                      <LockKey size={20} weight="bold" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/85 hover:bg-white/95 focus:bg-white border border-slate-300 focus:border-zinc-950 focus:ring-4 focus:ring-black/10 text-sm font-black text-slate-950 placeholder-slate-500 outline-none transition-all font-mono shadow-sm backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-black hover:text-slate-700 transition-colors cursor-pointer p-1"
                    >
                      {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 rounded-xl bg-zinc-950 hover:bg-black active:scale-[0.99] text-white font-black text-xs tracking-wider uppercase transition-all shadow-xl shadow-black/30 border border-zinc-800 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Procesando...</span>
              ) : isPasswordRecovery ? (
                <>
                  <span>Guardar Nueva Contraseña</span>
                  <CheckCircle size={16} weight="bold" />
                </>
              ) : mode === 'forgot_password' ? (
                <>
                  <span>Enviar Enlace de Recuperación</span>
                  <PaperPlaneTilt size={16} weight="bold" />
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Ingresar a Finanzas</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              ) : (
                <>
                  <span>Crear Mi Cuenta</span>
                  <UserPlus size={16} weight="bold" />
                </>
              )}
            </button>

            {mode === 'forgot_password' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorDetails(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-slate-800 hover:text-black transition-colors text-center mt-1 cursor-pointer"
              >
                ← Volver a Iniciar Sesión
              </button>
            )}

          </form>
        </motion.div>
      </div>
    </div>
  );
};


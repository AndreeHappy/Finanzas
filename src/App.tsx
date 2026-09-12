import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthView } from './components/auth/AuthView';
import { InicioView } from './components/finance/InicioView';
import { MovementsView } from './components/finance/MovementsView';
import { StatisticsView } from './components/finance/StatisticsView';
import { SettingsView } from './components/settings/SettingsView';
import { LiquidNavigator } from './components/navigation/LiquidNavigator';
import { InteractiveBackground } from './components/ui/InteractiveBackground';
import { motion, AnimatePresence } from 'framer-motion';

const AdminView = lazy(() =>
  import('./components/admin/AdminView').then((module) => ({ default: module.AdminView }))
);
import type { ActiveModule } from './types';
import { CircleNotch, WarningCircle, DeviceMobile } from '@phosphor-icons/react';
import { DownloadAppModal } from './components/common/DownloadAppModal';
import { AppLogo } from './components/common/AppLogo';

const MODULE_SESSION_KEY = 'app_finanzas_active_tab_v2';


const MainPortal: React.FC = () => {
  const { user, profile, loading, logout, isAdmin, inactivitySecondsLeft, extendSession } = useAuth();

  // Nombre de visualización personalizado
  const greetingName =
    profile?.nickname ||
    profile?.first_name ||
    (profile?.full_name ? profile.full_name.trim().split(' ')[0] : 'Usuario');

  const [activeModule, setActiveModuleState] = useState<ActiveModule>('inicio');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Siempre abrir en 'inicio' al iniciar sesión
  React.useEffect(() => {
    if (user) {
      setActiveModuleState('inicio');
      sessionStorage.setItem(MODULE_SESSION_KEY, 'inicio');
    }
  }, [user?.id]);

  // Protección estricta de ruta admin: si un usuario común intenta acceder, redirigir a inicio
  React.useEffect(() => {
    if (activeModule === 'admin' && !isAdmin) {
      setActiveModuleState('inicio');
      sessionStorage.setItem(MODULE_SESSION_KEY, 'inicio');
    }
  }, [activeModule, isAdmin]);

  const setActiveModule = (mod: ActiveModule) => {
    // Si intenta seleccionar admin sin permisos, ignorar y mantenerse en inicio
    if (mod === 'admin' && !isAdmin) return;
    setActiveModuleState(mod);
    sessionStorage.setItem(MODULE_SESSION_KEY, mod);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex items-center justify-center flex-col gap-3">
        <CircleNotch size={32} className="animate-spin text-emerald-600" />
        <span className="text-xs font-mono text-slate-500">Iniciando aplicación de Finanzas...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f2f4f7] dark:bg-[#0c0d12] text-slate-900 dark:text-zinc-100 flex flex-col justify-between antialiased transition-colors relative">
      {/* Header Transparente con Saludo estilo Imagen 5 */}
      <header className="w-full bg-transparent px-4 sm:px-8 pt-3 sm:pt-4 pb-1.5 sm:pb-2 flex items-center justify-between select-none relative z-20">
        {/* Saludo a la izquierda con Nuevo Logo Oficial */}
        <div className="flex items-center gap-3">
          <AppLogo size={34} className="shrink-0 drop-shadow-md" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Hola, {greetingName}
          </h1>
        </div>

        {/* Botón Descargar App en la esquina derecha */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDownloadModalOpen(true)}
          className="btn-unified px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-md shadow-black/10 dark:shadow-black/30 transition-all flex items-center gap-2 cursor-pointer ring-1 ring-white/20"
          title="Descargar o instalar app en tu celular"
        >
          <DeviceMobile size={17} weight="bold" />
          <span>Descargar App</span>
        </motion.button>
      </header>


      {/* Interactive Dot Matrix Canvas Background */}
      <InteractiveBackground />

      {/* Vista Principal según Módulo Activo con Centrado Óptico Vertical */}
      <main className="flex-1 flex flex-col justify-center px-3 sm:px-6 lg:px-8 py-1 sm:py-1.5 relative z-10 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full my-auto flex flex-col justify-center"
          >
            {activeModule === 'inicio' && <InicioView />}
            {activeModule === 'vista' && <MovementsView />}
            {activeModule === 'estadisticas' && <StatisticsView />}
            {activeModule === 'ajustes' && (
              <SettingsView
                isAdmin={isAdmin}
                onNavigateAdmin={isAdmin ? () => setActiveModule('admin') : undefined}
              />
            )}
            {activeModule === 'admin' && isAdmin && (
              <Suspense
                fallback={
                  <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
                    <CircleNotch size={32} className="animate-spin text-emerald-600" />
                    <span className="text-xs font-mono text-slate-500">Cargando Base de Datos...</span>
                  </div>
                }
              >
                <AdminView onBack={() => setActiveModule('inicio')} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Liquid Navigator Flotante Inferior con Avatar Central */}
      <LiquidNavigator
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        profile={profile}
        userEmail={user.email}
        isAdmin={isAdmin}
        onLogout={logout}
      />

      {/* Modal Flotante de Advertencia de Inactividad (60 segundos previos) */}
      <AnimatePresence>
        {inactivitySecondsLeft !== null && inactivitySecondsLeft > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="w-full max-w-sm rounded-3xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200 shadow-2xl p-6 text-center flex flex-col items-center gap-4"
            >
              {/* Icono Pulsante de Alerta */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-16 h-16 rounded-full bg-amber-500/20 animate-ping" />
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <WarningCircle size={32} weight="fill" />
                </div>
              </div>

              {/* Título y Mensaje */}
              <div className="space-y-1.5">
                <h3 className="text-lg font-black tracking-tight text-white dark:text-zinc-950">
                  ¿Sigues en tu sesión?
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 font-medium leading-relaxed">
                  Por tu seguridad financiera, la sesión se cerrará automáticamente en:
                </p>
              </div>

              {/* Contador Gigante */}
              <div className="px-5 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 font-mono text-3xl font-black text-amber-400 dark:text-amber-600 shadow-inner">
                {inactivitySecondsLeft}s
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                Mueve el cursor o haz clic en cualquier lugar para mantener tu sesión activa.
              </p>

              {/* Botones de Acción */}
              <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={extendSession}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Mantener Activa
                </button>
                <button
                  type="button"
                  onClick={() => logout('Sesión cerrada manualmente.')}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-rose-400 dark:text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Descarga e Instalación de App Móvil */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <MainPortal />
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

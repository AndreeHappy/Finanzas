import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthView } from './components/auth/AuthView';
import { InicioView } from './components/finance/InicioView';
import { MovementsView } from './components/finance/MovementsView';
import { StatisticsView } from './components/finance/StatisticsView';
import { AutomatizacionView } from './components/automation/AutomatizacionView';
import { CategoriasView } from './components/categories/CategoriasView';
import { SettingsView } from './components/settings/SettingsView';
import { SidebarNav } from './components/navigation/SidebarNav';
import { InteractiveBackground } from './components/ui/InteractiveBackground';
import { motion, AnimatePresence } from 'framer-motion';

const AdminView = lazy(() =>
  import('./components/admin/AdminView').then((module) => ({ default: module.AdminView }))
);
import type { ActiveModule } from './types';
import { CircleNotch, WarningCircle, Sun, Moon } from '@phosphor-icons/react';
import { AppLogo } from './components/common/AppLogo';

const MODULE_SESSION_KEY = 'app_finanzas_active_tab_v3';


const MainPortal: React.FC = () => {
  const { user, profile, loading, logout, isAdmin, inactivitySecondsLeft, extendSession } = useAuth();
  const { mode, toggleTheme } = useTheme();

  // Nombre de visualización personalizado
  const greetingName =
    profile?.nickname ||
    profile?.first_name ||
    (profile?.full_name ? profile.full_name.trim().split(' ')[0] : 'Usuario');

  const [activeModule, setActiveModuleState] = useState<ActiveModule>('inicio');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_expanded') === 'true';
  });

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
    <div
      className={`min-h-[100dvh] bg-[#f2f4f7] dark:bg-[#0c0d12] text-slate-900 dark:text-zinc-100 flex flex-col justify-between antialiased transition-[padding] duration-300 ease-out relative ${
        isSidebarExpanded ? 'md:pl-[236px]' : 'md:pl-[72px]'
      }`}
    >
      {/* Header Transparente Alineado */}
      <header className="w-full bg-transparent px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-1.5 sm:pb-2 select-none relative z-20">
        <div className="w-full max-w-7xl 2xl:max-w-[1540px] mx-auto flex items-center justify-between">
          {/* Header en pantallas móviles: Saludo a la izquierda, Botón de Tema celestial a la derecha */}
          <div className="flex md:hidden items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <AppLogo size={32} className="shrink-0 drop-shadow-md" />
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Hola, {greetingName}
              </h1>
            </div>

            {/* Botón de cambio de tema móvil (Monocromático Blanco & Negro según el tema) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#151622]/90 border border-slate-200/90 dark:border-white/10 shadow-md flex items-center justify-center cursor-pointer text-zinc-950 dark:text-white"
              title="Cambiar tema claro / oscuro"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'dark' ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={20} weight="fill" className="text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun size={20} weight="fill" className="text-zinc-950" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Interactive Dot Matrix Canvas Background */}
      <InteractiveBackground />

      {/* Vista Principal según Módulo Activo con Centrado Óptico y Scroll Móvil Libre */}
      <main className="flex-1 w-full flex flex-col items-center justify-start md:justify-center px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 pb-36 md:pb-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-7xl 2xl:max-w-[1540px] mx-auto my-0 md:my-auto flex flex-col justify-start md:justify-center items-center"
          >
            {activeModule === 'inicio' && <InicioView />}
            {activeModule === 'movimientos' && <MovementsView />}
            {(activeModule === 'vista' || activeModule === 'estadisticas') && <StatisticsView />}
            {activeModule === 'automatizacion' && <AutomatizacionView />}
            {activeModule === 'categorias' && <CategoriasView />}
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

      {/* Sidebar Lateral Expandible (Fiel a Imágenes 2 y 3) */}
      <SidebarNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        profile={profile}
        userEmail={user.email}
        isAdmin={isAdmin}
        onLogout={logout}
        isExpanded={isSidebarExpanded}
        onToggleExpanded={() =>
          setIsSidebarExpanded((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_expanded', String(next));
            return next;
          })
        }
      />

      {/* Modal Flotante de Advertencia de Inactividad (60 segundos previos) */}
      <AnimatePresence>
        {inactivitySecondsLeft !== null && inactivitySecondsLeft > 0 && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
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

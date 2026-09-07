import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  ListBullets,
  ChartPieSlice,
  GearSix,
  SignOut,
  User,
  UserCircle,
  Crown,
  Sparkle,
  Lightning,
  Fire,
  Heart,
  ShieldCheck,
  Robot,
  Smiley,
  Database,
  type IconProps,
} from '@phosphor-icons/react';
import type { ActiveModule, UserProfile } from '../../types';

const AVATAR_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  User,
  UserCircle,
  Crown,
  Sparkle,
  Lightning,
  Fire,
  Heart,
  ShieldCheck,
  Robot,
  Smiley,
};

interface Props {
  activeModule: ActiveModule;
  onSelectModule: (mod: ActiveModule) => void;
  profile?: UserProfile | null;
  userEmail?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  Icon: React.ComponentType<IconProps>;
}

const LEFT_NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Inicio', Icon: House },
  { id: 'vista', label: 'Vista', Icon: ListBullets },
];

const DEFAULT_RIGHT_NAV_ITEMS: NavItem[] = [
  { id: 'estadisticas', label: 'Estadísticas', Icon: ChartPieSlice },
  { id: 'ajustes', label: 'Ajustes', Icon: GearSix },
];

export const LiquidNavigator: React.FC<Props> = ({
  activeModule,
  onSelectModule,
  profile,
  userEmail,
  isAdmin,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const rightNavItems = DEFAULT_RIGHT_NAV_ITEMS;

  // Cerrar el popup al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Determinar si el avatar es una imagen cargada (Data URL o URL HTTP) o un icono
  const avatarUrl = profile?.avatar_url || '';
  const isCustomImage =
    avatarUrl.startsWith('data:image/') ||
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://');

  const FallbackIcon = AVATAR_ICON_MAP[avatarUrl] || User;

  const displayName =
    profile?.nickname ||
    profile?.first_name ||
    (profile?.full_name ? profile.full_name.trim().split(' ')[0] : 'Usuario');

  const renderNavButton = (item: NavItem) => {
    const isActive = activeModule === item.id;
    const { Icon } = item;

    return (
      <button
        key={item.id}
        onClick={() => {
          setIsUserMenuOpen(false);
          onSelectModule(item.id);
        }}
        className={`relative flex items-center justify-center h-10 transition-all duration-200 rounded-full select-none ${
          isActive
            ? 'px-3.5 bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white font-black shadow-md'
            : 'px-2.5 sm:px-3 text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-600 dark:hover:text-zinc-950 dark:hover:bg-zinc-900/10'
        }`}
        title={item.label}
      >
        {isActive && (
          <motion.div
            layoutId="liquid-nav-pill"
            className="absolute inset-0 rounded-full bg-white dark:bg-zinc-950 -z-10 shadow-sm"
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}

        <div className="flex items-center gap-1.5">
          <Icon
            size={18}
            weight={isActive ? 'bold' : 'regular'}
            className={isActive ? 'text-zinc-950 dark:text-white' : 'currentColor'}
          />
          {isActive && (
            <motion.span
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-black tracking-tight whitespace-nowrap text-zinc-950 dark:text-white"
            >
              {item.label}
            </motion.span>
          )}
        </div>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-5 inset-x-0 z-30 flex justify-center px-4 pointer-events-none select-none"
    >
      <div
        ref={userMenuRef}
        className="pointer-events-auto relative w-auto max-w-fit mx-auto bg-zinc-950/95 dark:bg-white/95 backdrop-blur-2xl border border-white/20 dark:border-zinc-300 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.35)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] p-1.5 flex items-center justify-center gap-1 sm:gap-1.5 transition-all"
      >
        {/* Lado Izquierdo: Inicio y Vista */}
        <div className="flex items-center gap-1">
          {LEFT_NAV_ITEMS.map(renderNavButton)}
        </div>

        {/* CENTRO: AVATAR DEL USUARIO (AJUSTADO Y COMPACTO) */}
        <div className="relative flex items-center justify-center px-1 shrink-0">
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            title={`Perfil de ${displayName}`}
            className="relative w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 active:scale-95 transition-transform shadow-md flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-700 flex items-center justify-center border-2 border-zinc-950 dark:border-white">
              {isCustomImage ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <FallbackIcon size={17} weight="bold" className="text-white drop-shadow-xs" />
              )}
            </div>

            {/* Punto indicador de estado activo/en línea */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 dark:border-white" />
          </button>

          {/* Menú Popover Flotante sobre el Avatar Central */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: -16, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.16 }}
                className="absolute bottom-full mb-1 w-64 rounded-3xl bg-zinc-950 dark:bg-white backdrop-blur-2xl border border-zinc-800 dark:border-zinc-200 shadow-2xl p-2.5 z-50 flex flex-col gap-1 text-left"
              >
                {/* Cabecera del Usuario */}
                <div className="px-3 py-2.5 border-b border-white/10 dark:border-zinc-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-700 border border-white/20 dark:border-zinc-300 shrink-0 flex items-center justify-center text-white">
                    {isCustomImage ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FallbackIcon size={20} weight="bold" className="text-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-white dark:text-zinc-950 block truncate">
                      {profile?.full_name || displayName}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block truncate">
                      {userEmail || profile?.email || ''}
                    </span>
                  </div>
                </div>

                {/* Acceso directo a Perfil & Ajustes */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectModule('ajustes');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-white dark:text-zinc-950 hover:bg-white/10 dark:hover:bg-zinc-100 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <GearSix size={17} weight="bold" className="text-white dark:text-zinc-950" />
                  <span>Mi Perfil & Ajustes</span>
                </button>

                {/* Acceso a Base de Datos (Solo Administrador) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectModule('admin');
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-white dark:text-zinc-950 hover:bg-white/10 dark:hover:bg-zinc-100 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Database size={17} weight="bold" className="text-white dark:text-zinc-950" />
                    <span>Base de Datos (Admin)</span>
                  </button>
                )}

                <div className="h-px bg-white/10 dark:border-zinc-200 my-0.5" />

                {/* Cerrar Sesión (Único elemento rojo, tono pastel según tema) */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 dark:text-rose-600 hover:bg-rose-500/15 dark:hover:bg-rose-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <SignOut size={17} weight="bold" className="text-rose-300 dark:text-rose-600" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lado Derecho: Estadísticas y Ajustes */}
        <div className="flex items-center gap-1">
          {rightNavItems.map(renderNavButton)}
        </div>
      </div>

      {/* Botón Flotante Directo para el Administrador: Negro con icono blanco (Tema claro) / Blanco con icono negro (Tema oscuro) */}
      {isAdmin && (
        <div className="fixed bottom-5 right-3 sm:right-6 z-30 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setIsUserMenuOpen(false);
              onSelectModule(activeModule === 'admin' ? 'inicio' : 'admin');
            }}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-2xl transition-all cursor-pointer select-none ${
              activeModule === 'admin'
                ? 'bg-zinc-950 text-emerald-400 border-2 border-emerald-500 ring-4 ring-emerald-500/30 shadow-xl shadow-emerald-500/25 dark:bg-white dark:text-emerald-600 dark:border-emerald-600 dark:ring-emerald-500/30'
                : 'bg-zinc-950 text-white border border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/35 dark:bg-white dark:text-zinc-950 dark:border-zinc-200 dark:hover:border-zinc-300'
            }`}
            title="Base de Datos (Administrador)"
          >
            <Database
              size={21}
              weight="bold"
              className={
                activeModule === 'admin'
                  ? 'text-emerald-400 dark:text-emerald-600 drop-shadow-sm'
                  : 'text-white dark:text-zinc-950'
              }
            />
            {activeModule === 'admin' && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 dark:border-white shadow-sm" />
            )}
          </motion.button>
        </div>
      )}
    </nav>
  );
};

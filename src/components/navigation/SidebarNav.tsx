import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  ListBullets,
  ChartPieSlice,
  GearSix,
  Database,
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
  SidebarSimple,
  Sun,
  Moon,
  Stamp,
  type IconProps,
} from '@phosphor-icons/react';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';
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
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<IconProps>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'INICIO', shortLabel: 'Inicio', Icon: House },
  { id: 'movimientos', label: 'MOVIMIENTOS', shortLabel: 'Movim.', Icon: ListBullets },
  { id: 'vista', label: 'ESTADÍSTICAS', shortLabel: 'Métricas', Icon: ChartPieSlice },
  { id: 'automatizacion', label: 'AUTOMATIZACIÓN', shortLabel: 'Bot/Voz', Icon: Lightning },
  { id: 'categorias', label: 'CATEGORÍAS', shortLabel: 'Sellos', Icon: Stamp },
  { id: 'ajustes', label: 'AJUSTES', shortLabel: 'Ajustes', Icon: GearSix },
];

export const SidebarNav: React.FC<Props> = ({
  activeModule,
  onSelectModule,
  profile,
  userEmail,
  isAdmin,
  onLogout,
  isExpanded: externalIsExpanded,
  onToggleExpanded: externalToggleExpanded,
}) => {
  const { mode, toggleTheme } = useTheme();

  const [internalIsExpanded, setInternalIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_expanded') === 'true';
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const toggleExpanded = () => {
    if (externalToggleExpanded) {
      externalToggleExpanded();
    } else {
      setInternalIsExpanded((prev) => {
        const next = !prev;
        localStorage.setItem('sidebar_expanded', String(next));
        return next;
      });
    }
  };

  // Cerrar menú de perfil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const expanded = isExpanded;

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

  return (
    <>
      {/* DESKTOP SIDEBAR (md y superior) */}
      <motion.aside
        initial={false}
        animate={{
          width: expanded ? 234 : 70,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className={`hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col justify-between py-4 px-2 transition-colors select-none ${
          expanded
            ? 'bg-white/95 dark:bg-[#0c0d13]/95 backdrop-blur-2xl border-r border-slate-200/90 dark:border-white/10 shadow-2xl shadow-black/20 dark:shadow-black/50'
            : 'bg-white/80 dark:bg-[#0c0d13]/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-white/[0.07] shadow-lg shadow-black/5'
        }`}
      >
        {/* PARTE SUPERIOR: MARCA Y BARRA DE HERRAMIENTAS RÁPIDAS (EXPANDIR, TEMA, BD) */}
        <div className="flex flex-col gap-3">
          {/* Cabecera cuando está EXPANDIDO */}
          {expanded ? (
            <div className="flex flex-col gap-2.5 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                  <AppLogo size={32} className="shrink-0 drop-shadow-md" />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Hola,
                    </span>
                    <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white truncate">
                      {displayName}
                    </span>
                  </div>
                </div>

                {/* Botón Colapsar Sidebar */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleExpanded}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Colapsar menú"
                >
                  <SidebarSimple size={18} weight="bold" />
                </motion.button>
              </div>

              {/* Barra de utilidades superiores cuando está expandido: Tema Claro/Oscuro y BD */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]">
                {/* Botón Tema Oscuro / Claro con animación celestial amanecer/anochecer */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTheme();
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs overflow-hidden select-none"
                  title={mode === 'dark' ? 'Cambiar a modo claro (Amanecer)' : 'Cambiar a modo oscuro (Anochecer)'}
                >
                  <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden pointer-events-none">
                    <AnimatePresence mode="wait" initial={false}>
                      {mode === 'dark' ? (
                        <motion.div
                          key="moon-icon"
                          initial={{ y: 16, opacity: 0, rotate: -25, scale: 0.6 }}
                          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                          exit={{ y: 16, opacity: 0, rotate: 25, scale: 0.6 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center justify-center text-slate-900 dark:text-white"
                        >
                          <Moon size={15} weight="fill" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="sun-icon"
                          initial={{ y: 16, opacity: 0, rotate: -45, scale: 0.6 }}
                          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                          exit={{ y: 16, opacity: 0, rotate: 45, scale: 0.6 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center justify-center text-amber-500 dark:text-white"
                        >
                          <Sun size={15} weight="bold" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {mode === 'dark' ? 'Oscuro' : 'Claro'}
                  </span>
                </motion.button>

                {/* Botón BD (Solo Administradores) */}
                {isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelectModule('admin')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeModule === 'admin'
                        ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-black'
                        : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'
                    }`}
                    title="Panel de Base de Datos"
                  >
                    <Database size={15} weight="bold" />
                    <span className="text-[11px] font-black uppercase tracking-wider">BD</span>
                  </motion.button>
                )}
              </div>
            </div>
          ) : (
            /* Cabecera y Barra de Herramientas cuando está COLAPSADO */
            <div className="flex flex-col items-center gap-2">
              <div className="w-full flex justify-center py-1">
                <AppLogo size={32} className="shrink-0 drop-shadow-md" />
              </div>

              {/* Botón Agrandar / Expandir Sidebar (Fiel a la imagen del usuario) */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleExpanded}
                className="relative group w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100/90 dark:bg-white/[0.05] hover:bg-slate-200/90 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-white/[0.08] transition-all cursor-pointer shadow-xs"
                title="Agrandar sidebar"
              >
                <SidebarSimple size={19} weight="bold" />
                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-black uppercase tracking-wider shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10 dark:border-zinc-300">
                  Agrandar menú
                </div>
              </motion.button>

              {/* Botón Tema Oscuro / Claro con animación celestial amanecer/anochecer */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className="relative group w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100/90 dark:bg-white/[0.05] hover:bg-slate-200/90 dark:hover:bg-white/[0.12] text-slate-900 dark:text-white border border-slate-200/70 dark:border-white/[0.08] transition-all cursor-pointer shadow-xs overflow-hidden select-none"
                title={mode === 'dark' ? 'Cambiar a modo claro (Amanecer)' : 'Cambiar a modo oscuro (Anochecer)'}
              >
                <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden pointer-events-none">
                  <AnimatePresence mode="wait" initial={false}>
                    {mode === 'dark' ? (
                      <motion.div
                        key="collapsed-moon"
                        initial={{ y: 20, opacity: 0, rotate: -25, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ y: 20, opacity: 0, rotate: 25, scale: 0.6 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center justify-center text-slate-900 dark:text-white"
                      >
                        <Moon size={19} weight="fill" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed-sun"
                        initial={{ y: 20, opacity: 0, rotate: -45, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ y: 20, opacity: 0, rotate: 45, scale: 0.6 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center justify-center text-amber-500 dark:text-white"
                      >
                        <Sun size={19} weight="bold" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-black uppercase tracking-wider shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10 dark:border-zinc-300">
                  {mode === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </div>
              </motion.button>

              {/* Botón BD (Solo Administradores) */}
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelectModule('admin')}
                  className={`relative group w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
                    activeModule === 'admin'
                      ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white font-black'
                      : 'bg-slate-100/90 dark:bg-white/[0.05] hover:bg-slate-200/90 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200/70 dark:border-white/[0.08]'
                  }`}
                  title="Base de Datos"
                >
                  <Database size={19} weight="bold" />
                  <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-black uppercase tracking-wider shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10 dark:border-zinc-300">
                    Base de Datos
                  </div>
                </motion.button>
              )}
            </div>
          )}

          <div className="h-px bg-slate-200/80 dark:bg-white/[0.08] mx-1 my-0.5" />

          {/* LISTA DE MÓDULOS DE NAVEGACIÓN */}
          <nav
            className="flex flex-col gap-1.5"
            aria-label="Navegación lateral"
          >
            {NAV_ITEMS.map((item) => {
              if (item.adminOnly && !isAdmin) return null;

              const isActive =
                activeModule === item.id ||
                (item.id === 'vista' && activeModule === 'estadisticas');

              const { Icon } = item;

              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelectModule(item.id)}
                  title={item.label}
                  className={`relative flex items-center h-11 rounded-xl transition-all duration-200 select-none group cursor-pointer ${
                    expanded ? 'px-3 gap-3 justify-start w-full' : 'w-11 h-11 mx-auto justify-center'
                  } ${
                    isActive
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md shadow-black/10 dark:shadow-white/10 font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 rounded-xl bg-zinc-950 dark:bg-white -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}

                  <div className="flex items-center justify-center shrink-0">
                    <Icon
                      size={20}
                      weight={isActive ? 'bold' : 'regular'}
                      className={isActive ? 'text-white dark:text-zinc-950' : 'currentColor'}
                    />
                  </div>

                  {/* Texto de la etiqueta al estar expandido */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.16 }}
                        className={`text-xs uppercase tracking-wider font-extrabold whitespace-nowrap truncate ${
                          isActive
                            ? 'text-white dark:text-zinc-950'
                            : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip flotante al estar colapsado */}
                  {!expanded && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-black uppercase tracking-wider shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10 dark:border-zinc-300">
                      {item.label}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* PARTE INFERIOR: PERFIL Y MENÚ DE USUARIO */}
        <div ref={profileMenuRef} className="relative flex flex-col gap-2 pt-3 border-t border-slate-200/80 dark:border-white/[0.08]">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex items-center h-11 rounded-xl p-1 transition-all select-none cursor-pointer ${
              expanded ? 'gap-3 px-2 hover:bg-slate-100 dark:hover:bg-white/[0.06] w-full' : 'w-11 h-11 mx-auto justify-center'
            }`}
            title={`Perfil de ${displayName}`}
          >
            <div className="relative w-8 h-8 rounded-xl p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shrink-0 flex items-center justify-center shadow-xs">
              <div className="w-full h-full rounded-[10px] overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-700 flex items-center justify-center border border-white dark:border-zinc-950">
                {isCustomImage ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <FallbackIcon size={16} weight="bold" className="text-white" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col text-left min-w-0 flex-1"
                >
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {userEmail || ''}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Menú flotante del perfil */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.16 }}
                className="absolute left-full bottom-2 ml-3 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-2 z-50 flex flex-col gap-1 text-left backdrop-blur-2xl"
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                    {profile?.full_name || displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {userEmail || ''}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSelectModule('ajustes');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <GearSix size={16} weight="bold" />
                  <span>Mi Perfil & Ajustes</span>
                </button>

                {/* Alternar Tema en Escritorio (Blanco & Negro monocromático) */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
                  title="Cambiar tema claro / oscuro"
                >
                  <div className="flex items-center gap-2">
                    {mode === 'dark' ? (
                      <Moon size={16} weight="fill" className="text-white" />
                    ) : (
                      <Sun size={16} weight="fill" className="text-zinc-950" />
                    )}
                    <span>Modo {mode === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {mode === 'dark' ? 'Noche' : 'Día'}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSelectModule('admin');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Database size={16} weight="bold" />
                    <span>Base de Datos</span>
                  </button>
                )}

                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-0.5" />

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <SignOut size={16} weight="bold" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* BARRA DE NAVEGACIÓN MÓVIL (PANTALLAS < md) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-3 inset-x-2 z-40 flex justify-center pointer-events-none select-none"
      >
        <div className="pointer-events-auto w-full max-w-lg mx-auto bg-white/95 dark:bg-[#0c0d13]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-1 flex items-center justify-between gap-1 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive =
              activeModule === item.id ||
              (item.id === 'vista' && activeModule === 'estadisticas');
            const { Icon } = item;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => onSelectModule(item.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors cursor-pointer min-w-0 ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 rounded-xl bg-slate-200/80 dark:bg-white/15 -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon size={19} weight={isActive ? 'bold' : 'regular'} />
                <span className="text-[9px] font-black tracking-tight mt-0.5 truncate text-center w-full">
                  {item.shortLabel}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

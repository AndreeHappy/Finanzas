import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DeviceMobile,
  DownloadSimple,
  Sparkle,
  CheckCircle,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Enlace directo al release automático de GitHub Actions
  const apkDownloadUrl =
    'https://github.com/AndreeHappy/Finanzas/releases/download/android-app-latest/finanzas-app.apk';
  const releasesPageUrl = 'https://github.com/AndreeHappy/Finanzas/releases';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white/95 dark:bg-[#13141c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden max-h-[92vh] overflow-y-auto"
        >
          {/* Header con botón cerrar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <DeviceMobile size={24} weight="bold" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Instalar Finanzas en tu Celular
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Elige cómo prefieres tener la app en tu teléfono
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="space-y-4 mt-5">
            {/* Opción 1: Descargar archivo APK para Android */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Opción 1: Archivo APK
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instalador directo para Android
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Descarga el archivo instalador oficial <strong>finanzas-app.apk</strong> para pasarlo por cable, WhatsApp o descargarlo directamente en tu celular.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DownloadSimple size={16} weight="bold" />
                  <span>Descargar APK (Android)</span>
                </a>

                <a
                  href={releasesPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver todas las versiones en GitHub Releases"
                  className="py-3 px-3.5 rounded-xl border border-slate-300 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowSquareOut size={16} weight="bold" />
                  <span className="hidden sm:inline">Releases</span>
                </a>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-start gap-2">
                <CheckCircle size={15} weight="bold" className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Al abrir el archivo en tu teléfono, si Android te solicita activar <em>"Instalar aplicaciones desconocidas"</em>, actívalo para continuar la instalación.
                </span>
              </div>
            </div>

            {/* Opción 2: Instalación Inmediata PWA (Sin descargas pesadas) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkle size={12} weight="bold" />
                  Opción 2: En 1 Segundo
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Instalar directo desde el navegador (PWA)
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Si estás abriendo esta página desde el navegador de tu celular (Google Chrome, Brave, Edge o Safari):
              </p>

              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside bg-white/70 dark:bg-black/20 p-3 rounded-xl border border-indigo-100 dark:border-white/[0.05]">
                <li>
                  Toca el menú de los <strong>3 puntos (⋮)</strong> en la esquina superior derecha del navegador (o el botón compartir en Safari/iPhone).
                </li>
                <li>
                  Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </li>
                <li>
                  ¡Listo! La aplicación se instalará con su icono propio y abrirá en pantalla completa como una app nativa sin barras de navegación.
                </li>
              </ol>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-slate-200/80 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-white text-xs font-black transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

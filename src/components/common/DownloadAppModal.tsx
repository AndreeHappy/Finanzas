import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DeviceMobile,
  DownloadSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          className="relative w-full max-w-sm bg-white/95 dark:bg-[#13141c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 overflow-hidden text-center space-y-5"
        >
          {/* Header con botón cerrar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <DeviceMobile size={22} weight="bold" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Descargar App Móvil
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Finanzas para Android
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Botones Directos de Acción */}
          <div className="space-y-2.5 pt-1">
            <a
              href={apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-lg shadow-black/10 dark:shadow-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <DownloadSimple size={18} weight="bold" />
              <span>Descargar APK (Android)</span>
            </a>

            <a
              href={releasesPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <ArrowSquareOut size={16} weight="bold" />
              <span>Ver en GitHub Releases</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

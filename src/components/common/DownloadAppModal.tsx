import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DeviceMobile,
  DownloadSimple,
  ArrowSquareOut,
  CheckCircle,
  ShareNetwork,
  Info,
} from '@phosphor-icons/react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'pwa' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const apkDownloadUrl =
    'https://github.com/AndreeHappy/Finanzas/releases/latest/download/finanzas-app.apk';
  const releasesPageUrl = 'https://github.com/AndreeHappy/Finanzas/releases';

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden text-center space-y-4 my-auto"
        >
          {/* Header con botón cerrar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md flex items-center justify-center shrink-0">
                <DeviceMobile size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Descargar e Instalar App
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Versión Móvil para Android & iOS
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

          {/* Segmented Control / Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-white/[0.05] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Android (APK)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pwa')}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'pwa'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Web App (PWA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              iPhone / iOS
            </button>
          </div>

          {/* TAB 1: ANDROID APK */}
          {activeTab === 'android' && (
            <div className="space-y-4 text-left pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Pasos de Instalación en Android:
                </span>
                <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Descarga el archivo APK directamente pulsando el botón abajo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Si tu dispositivo lo solicita, selecciona <strong>"Permitir la instalación de fuentes desconocidas"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Abre la app instalada en tu teléfono y empieza a gestionar tus finanzas.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-unified w-full py-3.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <DownloadSimple size={18} weight="bold" />
                  <span>Descargar APK Directo (.apk)</span>
                </a>

                <a
                  href={releasesPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <ArrowSquareOut size={15} weight="bold" />
                  <span>Ver todas las versiones en GitHub Releases</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: PWA / INSTALACIÓN DIRECTA */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 text-left pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs">
                  <CheckCircle size={18} weight="bold" className="text-emerald-500 shrink-0" />
                  <span>Sin ocupar espacio en memoria ni descargas pesadas</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Esta aplicación cuenta con soporte <strong>PWA (Progressive Web App)</strong>. Puedes instalarla directamente en la pantalla de inicio de tu teléfono o computadora como una app nativa con soporte a pantalla completa y acceso instantáneo.
                </p>
              </div>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="btn-unified w-full py-3.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <DownloadSimple size={18} weight="bold" />
                  <span>Instalar en este Dispositivo Ahora</span>
                </button>
              ) : isInstalled ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle size={18} weight="bold" className="shrink-0" />
                  <span>¡Aplicación instalada con éxito en tu dispositivo!</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Desde el menú de tu navegador (Chrome / Edge / Brave):
                  </span>
                  <p>
                    Toca los <strong>tres puntos (⋮)</strong> en la esquina superior de tu navegador y pulsa en <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IPHONE / IOS */}
          {activeTab === 'ios' && (
            <div className="space-y-4 text-left pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Cómo instalar en iPhone o iPad (Safari):
                </span>
                <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Abre esta página web desde el navegador <strong>Safari</strong> en tu iPhone.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Toca el botón</span>
                      <strong className="inline-flex items-center gap-1 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                        <ShareNetwork size={13} weight="bold" /> Compartir
                      </strong>
                      <span>en la barra inferior de Safari.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Desliza hacia abajo y pulsa en <strong>"Agregar a pantalla de inicio"</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Info size={18} weight="bold" className="shrink-0 text-slate-400" />
                <span>La app se abrirá a pantalla completa sin barras de navegación como una app nativa.</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

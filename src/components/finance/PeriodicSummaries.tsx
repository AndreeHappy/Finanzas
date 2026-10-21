import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendDown,
  TrendUp,
  CreditCard,
  Globe,
} from '@phosphor-icons/react';
import type { PeriodSummary, WalletCard } from '../../types';

interface Props {
  walletSummary: {
    daily: PeriodSummary;
    monthly: PeriodSummary;
    yearly: PeriodSummary;
  };
  globalSummary: {
    daily: PeriodSummary;
    monthly: PeriodSummary;
    yearly: PeriodSummary;
  };
  activeWallet: WalletCard | undefined;
}

export const PeriodicSummaries: React.FC<Props> = ({
  walletSummary,
  globalSummary,
  activeWallet,
}) => {
  // Permite alternar entre ver los resúmenes de la tarjeta activa o el consolidado global
  const [viewScope, setViewScope] = useState<'wallet' | 'global'>('wallet');

  const activeData = viewScope === 'wallet' ? walletSummary : globalSummary;

  const now = new Date();
  const dailyLabel = now.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const monthlyLabel = now.toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  });
  const yearlyLabel = `Año ${now.getFullYear()}`;

  const sections = [
    {
      id: 'daily',
      title: 'RESUMEN DIARIO',
      period: dailyLabel.charAt(0).toUpperCase() + dailyLabel.slice(1),
      data: activeData.daily,
    },
    {
      id: 'monthly',
      title: 'RESUMEN MENSUAL',
      period: monthlyLabel.charAt(0).toUpperCase() + monthlyLabel.slice(1),
      data: activeData.monthly,
    },
    {
      id: 'yearly',
      title: 'RESUMEN ANUAL',
      period: yearlyLabel,
      data: activeData.yearly,
    },
  ];

  return (
    <div className="w-full space-y-2.5 sm:space-y-3">
      {/* Switcher de Ámbito (Tarjeta vs Global) Centrado en Móvil */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-1.5 pb-1 sm:pb-0.5 text-center sm:text-left">
        <div>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Flujo Financiero Periódico
          </span>
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {viewScope === 'wallet'
              ? (activeWallet?.name || 'Tarjeta Seleccionada')
              : 'Consolidado Global (Todas las Tarjetas)'}
          </p>
        </div>

        <div className="flex items-center justify-center self-center sm:self-auto p-1.5 sm:p-1 rounded-2xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.08]">
          <button
            onClick={() => setViewScope('wallet')}
            className={`px-3.5 py-1.5 sm:px-3 sm:py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'wallet'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard size={14} weight="bold" />
            <span>Tarjeta</span>
          </button>
          <button
            onClick={() => setViewScope('global')}
            className={`px-3.5 py-1.5 sm:px-3 sm:py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'global'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe size={14} weight="bold" />
            <span>Global</span>
          </button>
        </div>
      </div>

      {/* Los 3 Bloques de Resumen (Glassmorphic + Sombra Elegante + Micro-animación) */}
      {sections.map((sec, idx) => (
        <motion.div
          key={sec.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.008 }}
          transition={{
            delay: idx * 0.05,
            type: 'spring',
            stiffness: 350,
            damping: 24,
          }}
          className="w-full glass-panel rounded-2xl p-3 sm:p-3.5 shadow-md shadow-slate-900/[0.04] dark:shadow-black/35 hover:shadow-xl hover:border-slate-300/90 dark:hover:border-white/20 transition-all duration-200 group"
        >
          {/* Título de la tarjeta */}
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
              {sec.title}
            </h4>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {sec.period}
            </span>
          </div>

          {/* Dos pastillas: GASTOS e INGRESOS con Glassmorphism y Micro-animación */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* Pastilla de Gastos */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-pill rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-rose-400/50 transition-all cursor-default min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <TrendDown size={15} weight="bold" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    GASTOS
                  </span>
                  <span className="text-[11px] sm:text-sm lg:text-base font-black font-mono text-slate-900 dark:text-white block truncate">
                    S/. {sec.data.expenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Pastilla de Ingresos */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-pill rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-emerald-400/50 transition-all cursor-default min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <TrendUp size={15} weight="bold" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    INGRESOS
                  </span>
                  <span className="text-[11px] sm:text-sm lg:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block truncate">
                    S/. {sec.data.income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

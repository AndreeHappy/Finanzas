import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CardsDeck } from './CardsDeck';
import { PeriodicSummaries } from './PeriodicSummaries';
import { ContextualMovementModal } from './ContextualMovementModal';
import { useFinance } from '../../context/FinanceContext';
import {
  PiggyBank,
  CreditCard,
  Money,
} from '@phosphor-icons/react';

export const InicioView: React.FC = () => {
  const {
    wallets,
    selectedWalletId,
    selectedWallet,
    setSelectedWalletId,
    categories,
    addTransaction,
    summary,
    getWalletSummary,
  } = useFinance();

  const [isMovementOpen, setIsMovementOpen] = useState(false);

  const walletSummary = selectedWallet
    ? getWalletSummary(selectedWallet.id)
    : {
        daily: { income: 0, expenses: 0, net: 0 },
        monthly: { income: 0, expenses: 0, net: 0 },
        yearly: { income: 0, expenses: 0, net: 0 },
      };

  // Balances específicos para desglose solicitado
  const digitalWallet = wallets.find((w) => w.type === 'digital');
  const cashWallet = wallets.find((w) => w.type === 'cash');
  const savingsWallet = wallets.find((w) => w.type === 'savings');

  const digitalBalance = digitalWallet?.balance || 0;
  const cashBalance = cashWallet?.balance || 0;
  const savingsBalance = savingsWallet?.balance || summary.totalSavings || 0;

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col justify-center gap-3.5 lg:gap-4 py-1 pb-16 sm:pb-20 px-1 sm:px-2">
      {/* Sección Principal (2 Columnas: Mazo de 3 Cuentas vs Resúmenes en Cascada) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-center">
        {/* Columna Izquierda: Tarjetas y Billetes Táctiles Centrados */}
        <div className="lg:col-span-5 flex justify-center">
          <CardsDeck
            wallets={wallets}
            selectedWalletId={selectedWalletId}
            onSelectWallet={setSelectedWalletId}
            onOpenMovementModal={() => setIsMovementOpen(true)}
          />
        </div>

        {/* Columna Derecha: Resúmenes Diario, Mensual y Anual */}
        <div className="lg:col-span-7">
          <PeriodicSummaries
            walletSummary={walletSummary}
            globalSummary={summary}
            activeWallet={selectedWallet}
          />
        </div>
      </div>

      {/* Resumen General Inferior del Patrimonio (Glassmorphic + Sombra Elegante) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-lg shadow-slate-900/[0.04] dark:shadow-black/35"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
              PATRIMONIO TOTAL CONSOLIDADO
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-slate-900 dark:text-white">
                S/. {summary.totalNetWorth.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-slate-500">PEN</span>
            </div>
          </div>

          {/* Desglose en 3 Pastillas: Digital, Efectivo y Ahorro con Glassmorphism y Micro-animación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full lg:w-auto lg:flex lg:flex-wrap">
            {/* 1. Saldo Digital */}
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl glass-pill shadow-sm flex items-center gap-2.5 cursor-default"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard size={18} weight="bold" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Tarjeta Digital
                </span>
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                  S/. {digitalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </motion.div>

            {/* 2. Saldo Efectivo */}
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl glass-pill shadow-sm flex items-center gap-2.5 cursor-default"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Money size={18} weight="bold" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Dinero en Efectivo
                </span>
                <span className="text-xs font-black font-mono text-teal-600 dark:text-teal-400">
                  S/. {cashBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </motion.div>

            {/* 3. Total en Ahorros */}
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl glass-pill shadow-sm flex items-center gap-2.5 cursor-default"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <PiggyBank size={18} weight="bold" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Dinero Ahorrado
                </span>
                <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
                  S/. {savingsBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Modal Contextual de Registro de Movimiento */}
      <ContextualMovementModal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        activeWallet={selectedWallet}
        wallets={wallets}
        categories={categories}
        onAddTransaction={addTransaction}
      />
    </div>
  );
};

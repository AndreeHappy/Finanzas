import React from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Money,
  PiggyBank,
  WifiHigh,
  SimCard,
  Sparkle,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import type { WalletCard } from '../../types';

interface Props {
  wallets: WalletCard[];
  selectedWalletId: string;
  onSelectWallet: (id: string) => void;
  onOpenMovementModal: () => void;
}

export const CardsDeck: React.FC<Props> = ({
  wallets,
  selectedWalletId,
  onSelectWallet,
  onOpenMovementModal,
}) => {
  // Aseguramos exactamente los 3 fondos principales
  const activeIndex = wallets.findIndex((w) => w.id === selectedWalletId);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeWallet = wallets[currentIndex] || wallets[0];

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + wallets.length) % wallets.length;
    onSelectWallet(wallets[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % wallets.length;
    onSelectWallet(wallets[nextIdx].id);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md select-none">
      {/* Contenedor del Mazo de Tarjetas Apiladas */}
      <div className="relative w-full h-48 sm:h-52 flex justify-center items-center">
        {wallets.map((wallet, index) => {
          const isSelected = wallet.id === selectedWalletId;
          const diff = (index - currentIndex + wallets.length) % wallets.length;

          // Cálculo ordenado de apilamiento:
          // diff === 0: La tarjeta activa en primer plano
          // diff === 1: Segunda tarjeta justo detrás (peeking arriba a la derecha)
          // diff === 2: Tercera tarjeta en el fondo
          const zIndex = isSelected ? 30 : 20 - diff;
          const translateY = isSelected ? 0 : diff === 1 ? -10 : -18;
          const scale = isSelected ? 1 : diff === 1 ? 0.94 : 0.88;
          const opacity = isSelected ? 1 : diff === 1 ? 0.92 : 0.82;

          return (
            <motion.div
              key={wallet.id}
              onClick={() => onSelectWallet(wallet.id)}
              animate={{
                y: translateY,
                scale,
                opacity,
                zIndex,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              whileHover={{ scale: isSelected ? 1.03 : scale + 0.02, y: translateY - 5 }}
              whileTap={{ scale: 0.98 }}
              className={`absolute w-[92%] sm:w-full max-w-[380px] h-44 sm:h-48 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl transition-all cursor-pointer overflow-hidden border ${
                isSelected
                  ? 'ring-1 ring-white/30 shadow-[0_22px_45px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.65)] border-white/25 brightness-100'
                  : 'border-white/10 brightness-[0.88] saturate-[0.88] hover:brightness-100'
              } ${
                wallet.type === 'cash'
                  ? 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] text-white'
                  : wallet.type === 'savings'
                  ? 'bg-gradient-to-br from-[#fb923c] via-[#f97316] to-[#ea580c] text-white'
                  : 'bg-gradient-to-br from-[#38bdf8] via-[#2563eb] to-[#1d4ed8] text-white'
              }`}
            >
              {/* DISEÑO 1: BILLETE DE EFECTIVO (VERDE VIBRANTE Y CLARO) */}
              {wallet.type === 'cash' ? (
                <div className="relative h-full flex flex-col justify-between">
                  {/* Patrón ornamental de papel moneda */}
                  <div className="absolute inset-0 border border-white/25 rounded-2xl pointer-events-none" />
                  <div className="absolute inset-1 border border-dashed border-white/20 rounded-xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-sm">
                        <Money size={20} weight="bold" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100/90 block">
                          EFECTIVO FÍSICO
                        </span>
                        <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">
                          {wallet.name}
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-white uppercase tracking-wider shadow-sm">
                      EFECTIVO
                    </span>
                  </div>

                  {/* Saldo Central */}
                  <div className="my-auto z-10 py-1">
                    <span className="text-[11px] font-semibold text-emerald-100/90 block">
                      Saldo Disponible en Mano
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                      S/. {(wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Footer Billete */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-100/80 z-10">
                    <span>SERIE EF-2026-PE</span>
                    <span className="font-black text-white tracking-wider">PEN (S/.)</span>
                  </div>
                </div>
              ) : wallet.type === 'savings' ? (
                /* DISEÑO 2: DINERO AHORRADO (NARANJA CÁLIDO VIBRANTE Y CLARO) */
                <div className="relative h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-sm">
                        <PiggyBank size={20} weight="bold" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-100/90 block">
                          FONDO DE AHORROS
                        </span>
                        <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">
                          {wallet.name}
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-white uppercase tracking-wider shadow-sm">
                      BÓVEDA
                    </span>
                  </div>

                  <div className="my-auto z-10 py-1">
                    <span className="text-[11px] font-semibold text-orange-100/90 block">
                      Monto Total Ahorrado
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                      S/. {(wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-orange-100/90 z-10">
                    <span className="font-semibold flex items-center gap-1">
                      <Sparkle size={13} weight="fill" className="text-amber-200" /> Bóveda Protegida
                    </span>
                    <span className="font-mono text-white font-black tracking-wider">AHORRO ACTIVO</span>
                  </div>
                </div>
              ) : (
                /* DISEÑO 3: TARJETA DIGITAL (AZUL ELÉCTRICO OCEÁNICO Y CLARO) */
                <div className="relative h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 rounded-md bg-amber-300 shadow-inner border border-amber-400 flex items-center justify-center">
                        <SimCard size={16} className="text-amber-950" weight="fill" />
                      </div>
                      <WifiHigh size={17} className="text-white rotate-90 drop-shadow" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-white uppercase tracking-wider shadow-sm">
                        DIGITAL
                      </span>
                    </div>
                  </div>

                  {/* Saldo Central */}
                  <div className="my-auto z-10 py-1">
                    <span className="text-[11px] font-semibold text-sky-100/90 block">
                      Saldo en Tarjeta Digital
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                      S/. {(wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs z-10">
                    <span className="font-black text-white truncate max-w-[190px] drop-shadow-sm">
                      {wallet.name}
                    </span>
                    <span className="font-mono text-sky-100 tracking-widest text-xs font-bold">
                      •••• {wallet.card_number_suffix || '4821'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Paginador de Puntos y Flechas */}
      <div className="flex items-center justify-center gap-3 mt-2 mb-2.5">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePrev}
          title="Tarjeta Anterior"
          className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          <CaretLeft size={16} weight="bold" />
        </motion.button>

        <div className="flex items-center gap-1.5">
          {wallets.map((w) => {
            const isSel = w.id === selectedWalletId;
            return (
              <button
                key={w.id}
                onClick={() => onSelectWallet(w.id)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isSel
                    ? 'w-6 h-2 bg-zinc-950 dark:bg-white'
                    : 'w-2 h-2 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400'
                }`}
                title={w.name}
              />
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNext}
          title="Siguiente Tarjeta"
          className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          <CaretRight size={16} weight="bold" />
        </motion.button>
      </div>

      {/* Botón Contextual Compacto y Centrado con la Tarjeta (Infallible btn-unified) */}
      <div className="w-full flex justify-center">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenMovementModal}
          className="btn-unified w-auto max-w-[260px] py-2 px-5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          {activeWallet?.type === 'savings' ? (
            <>
              <PiggyBank size={17} weight="bold" />
              <span>Registrar Ahorro</span>
            </>
          ) : (
            <>
              <CreditCard size={17} weight="bold" />
              <span>Registrar Movimiento</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

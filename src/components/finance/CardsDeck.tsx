import React, { useState, useEffect, useRef } from 'react';
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

interface TiltCardProps {
  wallet: WalletCard;
  isSelected: boolean;
  translateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isPassingBehind: boolean;
  shuffleDirection: number;
  onSelect: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPassBehindDone: () => void;
}

const TiltCard: React.FC<TiltCardProps> = ({
  wallet,
  isSelected,
  translateY,
  scale,
  opacity,
  zIndex,
  isPassingBehind,
  shuffleDirection,
  onSelect,
  onSwipeLeft,
  onSwipeRight,
  onPassBehindDone,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, xPct: 50, yPct: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Soporte táctil nativo sin capturar puntero para permitir scroll vertical nativo 100% fluido
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSelected) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSelected) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Solo si el usuario desliza horizontalmente de forma clara
    if (Math.abs(dx) > Math.abs(dy) + 12 && Math.abs(dx) > 18) {
      isHorizontalSwipe.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSelected || !isHorizontalSwipe.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 45) {
      onSwipeRight();
    } else if (dx < -45) {
      onSwipeLeft();
    }
    isHorizontalSwipe.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    // Si no está seleccionada o si el usuario está pulsando/arrastrando (buttons > 0), no ejecutar tilt
    if (!isSelected || e.buttons > 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;

    // Calcular inclinación 3D sutil
    const rx = ((y / rect.height) - 0.5) * -10;
    const ry = ((x / rect.width) - 0.5) * 10;

    setTilt({ rx, ry, xPct, yPct });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0, xPct: 50, yPct: 50 });
  };

  const animateProps = isPassingBehind
    ? {
        x: [0, shuffleDirection * 140, 0],
        y: [0, -10, translateY],
        scale: [1, 1.04, scale],
        rotateZ: [0, shuffleDirection * 8, 0],
        zIndex: [60, 60, 25, zIndex],
        opacity: [1, 1, opacity],
      }
    : {
        x: 0,
        rotateZ: 0,
        y: isSelected && isHovered ? translateY - 4 : translateY,
        scale: isSelected ? (isHovered ? 1.025 : 1) : scale,
        opacity,
        zIndex,
        rotateX: isSelected ? tilt.rx : 0,
        rotateY: isSelected ? tilt.ry : 0,
      };

  const transitionProps: any = isPassingBehind
    ? {
        duration: 0.5,
        times: [0, 0.45, 0.55, 1],
        ease: [0.22, 1, 0.36, 1],
      }
    : {
        type: 'spring',
        stiffness: 450,
        damping: 30,
      };

  return (
    <motion.div
      drag={!isTouchDevice && isSelected && !isPassingBehind ? 'x' : false}
      dragDirectionLock={true}
      dragSnapToOrigin={true}
      dragMomentum={false}
      dragElastic={0.8}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
      whileDrag={{
        scale: 1.05,
        zIndex: 99999,
        cursor: 'grabbing',
        boxShadow: '0 28px 60px -12px rgba(0,0,0,0.5)',
      }}
      onDragEnd={(_e, info) => {
        if (!isSelected) return;
        const swipeThreshold = 60;
        const velocityThreshold = 220;
        if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
          onSwipeRight();
        } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
          onSwipeLeft();
        }
      }}
      onAnimationComplete={() => {
        if (isPassingBehind) {
          onPassBehindDone();
        }
      }}
      onClick={() => {
        onSelect();
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={animateProps}
      transition={transitionProps}
      whileTap={{ scale: isSelected ? 0.99 : scale }}
      className={`group absolute w-[92%] sm:w-full max-w-[380px] h-44 sm:h-48 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl transition-shadow overflow-hidden border ${
        isSelected
          ? 'cursor-grab active:cursor-grabbing ring-1 ring-white/30 shadow-[0_22px_45px_rgba(0,0,0,0.28)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.65)] border-white/30 brightness-100 touch-pan-y select-none'
          : 'cursor-pointer border-white/10 brightness-[0.88] saturate-[0.88] hover:brightness-100 hover:scale-[0.92]'
      } ${
        wallet.type === 'cash'
          ? 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] text-white'
          : wallet.type === 'savings'
          ? 'bg-gradient-to-br from-[#fb923c] via-[#f97316] to-[#ea580c] text-white'
          : 'bg-gradient-to-br from-[#38bdf8] via-[#2563eb] to-[#1d4ed8] text-white'
      }`}
    >
      {/* Reflejo / Destello Holográfico Metálico Premium */}
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
          style={{
            background: `radial-gradient(circle at ${tilt.xPct}% ${tilt.yPct}%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 40%, transparent 70%)`,
          }}
        />
      )}

      {/* DISEÑO 1: BILLETE DE EFECTIVO (VERDE VIBRANTE Y CLARO) */}
      {wallet.type === 'cash' ? (
        <div className="relative h-full flex flex-col justify-between z-10">
          {/* Patrón ornamental de papel moneda */}
          <div className="absolute inset-0 border border-white/25 rounded-2xl pointer-events-none" />
          <div className="absolute inset-1 border border-dashed border-white/20 rounded-xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
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
        <div className="relative h-full flex flex-col justify-between z-10">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
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
              <Sparkle size={13} weight="fill" className="text-amber-200 animate-pulse" /> Bóveda Protegida
            </span>
            <span className="font-mono text-white font-black tracking-wider">AHORRO ACTIVO</span>
          </div>
        </div>
      ) : (
        /* DISEÑO 3: TARJETA DIGITAL (AZUL ELÉCTRICO OCEÁNICO Y CLARO) */
        <div className="relative h-full flex flex-col justify-between z-10">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded-md bg-amber-300 shadow-inner border border-amber-400 flex items-center justify-center transition-transform group-hover:scale-105">
                <SimCard size={16} className="text-amber-950" weight="fill" />
              </div>
              <WifiHigh size={17} className="text-white rotate-90 drop-shadow transition-transform group-hover:scale-110" />
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
};

export const CardsDeck: React.FC<Props> = ({
  wallets,
  selectedWalletId,
  onSelectWallet,
  onOpenMovementModal,
}) => {
  const activeIndex = wallets.findIndex((w) => w.id === selectedWalletId);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeWallet = wallets[currentIndex] || wallets[0];

  const [passingBehindId, setPassingBehindId] = useState<string | null>(null);
  const [shuffleDirection, setShuffleDirection] = useState<number>(1);

  const handlePrev = () => {
    setShuffleDirection(-1);
    setPassingBehindId(selectedWalletId);
    const nextIdx = (currentIndex - 1 + wallets.length) % wallets.length;
    onSelectWallet(wallets[nextIdx].id);
  };

  const handleNext = () => {
    setShuffleDirection(1);
    setPassingBehindId(selectedWalletId);
    const nextIdx = (currentIndex + 1) % wallets.length;
    onSelectWallet(wallets[nextIdx].id);
  };

  const handleSwipeLeft = () => {
    // Al mover hacia la izquierda, la tarjeta sale hacia la IZQUIERDA (-1)
    setShuffleDirection(-1);
    setPassingBehindId(selectedWalletId);
    const nextIdx = (currentIndex + 1) % wallets.length;
    onSelectWallet(wallets[nextIdx].id);
  };

  const handleSwipeRight = () => {
    // Al mover hacia la derecha, la tarjeta sale hacia la DERECHA (1) y navega a la anterior
    setShuffleDirection(1);
    setPassingBehindId(selectedWalletId);
    const prevIdx = (currentIndex - 1 + wallets.length) % wallets.length;
    onSelectWallet(wallets[prevIdx].id);
  };

  const handleSelectCard = (id: string, index: number) => {
    if (id === selectedWalletId) return;
    const dir = index > currentIndex ? 1 : -1;
    setShuffleDirection(dir);
    setPassingBehindId(selectedWalletId);
    onSelectWallet(id);
  };

  useEffect(() => {
    if (passingBehindId) {
      const timer = setTimeout(() => {
        setPassingBehindId(null);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [passingBehindId]);

  // Ordenar para el DOM: el elemento del fondo se dibuja primero, el del medio después, y el activo al final.
  // Si una tarjeta está en vuelo pasando atrás (passingBehindId), se mantiene al frente del DOM para que pase por encima
  const sortedWallets = [...wallets].sort((a, b) => {
    if (a.id === passingBehindId) return 1;
    if (b.id === passingBehindId) return -1;
    if (a.id === selectedWalletId) return 1;
    if (b.id === selectedWalletId) return -1;

    const idxA = wallets.findIndex((w) => w.id === a.id);
    const idxB = wallets.findIndex((w) => w.id === b.id);
    const diffA = (idxA - currentIndex + wallets.length) % wallets.length;
    const diffB = (idxB - currentIndex + wallets.length) % wallets.length;
    return diffB - diffA;
  });

  return (
    <div className="flex flex-col items-center w-full max-w-md select-none touch-pan-y" style={{ touchAction: 'pan-y' }}>
      {/* Contenedor del Mazo de Tarjetas Apiladas con perspectiva controlada */}
      <div
        className="relative w-full h-48 sm:h-52 flex justify-center items-center touch-pan-y"
        style={{ perspective: 1000, touchAction: 'pan-y' }}
      >
        {sortedWallets.map((wallet) => {
          const index = wallets.findIndex((w) => w.id === wallet.id);
          const isSelected = wallet.id === selectedWalletId;
          const isPassingBehind = wallet.id === passingBehindId;
          const diff = (index - currentIndex + wallets.length) % wallets.length;

          const zIndex = isSelected ? 30 : 20 - diff;
          const translateY = isSelected ? 0 : diff === 1 ? -10 : -18;
          const scale = isSelected ? 1 : diff === 1 ? 0.94 : 0.88;
          const opacity = isSelected ? 1 : diff === 1 ? 0.92 : 0.82;

          return (
            <TiltCard
              key={wallet.id}
              wallet={wallet}
              isSelected={isSelected}
              translateY={translateY}
              scale={scale}
              opacity={opacity}
              zIndex={zIndex}
              isPassingBehind={isPassingBehind}
              shuffleDirection={shuffleDirection}
              onSelect={() => handleSelectCard(wallet.id, index)}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onPassBehindDone={() => setPassingBehindId(null)}
            />
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
          {wallets.map((w, idx) => {
            const isSel = w.id === selectedWalletId;
            return (
              <button
                key={w.id}
                onClick={() => handleSelectCard(w.id, idx)}
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

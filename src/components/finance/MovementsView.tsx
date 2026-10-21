import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  FileCsv,
  CreditCard,
  PiggyBank,
  Trash,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Money,
  PencilSimple,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { parseLocalDateParts } from '../../utils/date';
import { ContextualMovementModal } from './ContextualMovementModal';
import { EditMovementModal } from './EditMovementModal';
import { sanitizeCsvCell } from '../../utils/security';
import { getCategoryIcon } from '../../constants/iconMap';
import type { Transaction, WalletCard, Category } from '../../types';
import { CompactPagination } from '../common/CompactPagination';

interface InteractiveMovementCardProps {
  tx: Transaction;
  regNumber: number;
  wallet?: WalletCard;
  category?: Category;
  isIncome: boolean;
  borderThemeClass: string;
  amountColorClass: string;
  isHovered: boolean;
  isOtherHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

const InteractiveMovementCard: React.FC<InteractiveMovementCardProps> = ({
  tx,
  regNumber,
  wallet,
  category,
  isIncome,
  borderThemeClass,
  amountColorClass,
  isHovered,
  isOtherHovered,
  onHoverStart,
  onHoverEnd,
  onEdit,
  onDelete,
}) => {
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Inclinación 3D directa sin retrasos de resorte: responde en tiempo real a la velocidad del ratón (desactivado en táctil)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-14, 14]);
  const moveX = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);

  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const isCardHovered = isLocalHovered || isHovered;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 a 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 a 0.5
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    if (isTouchDevice) return;
    setIsLocalHovered(true);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;
    animate(mouseX, 0, { type: 'spring', stiffness: 600, damping: 30 });
    animate(mouseY, 0, { type: 'spring', stiffness: 600, damping: 30 });
    setIsLocalHovered(false);
    onHoverEnd();
  };

  const isCash = wallet?.type === 'cash';
  const isSavings = wallet?.type === 'savings';
  const paymentLabel = isCash
    ? 'Efectivo'
    : isSavings
    ? 'Ahorro'
    : wallet?.name || 'Tarjeta Digital';

  const PaymentIcon = isCash ? Money : isSavings ? PiggyBank : CreditCard;
  const paymentColorStyle = isCash
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25'
    : isSavings
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/25'
    : 'text-blue-500 bg-blue-500/10 border-blue-500/25';
  const dateParts = parseLocalDateParts(tx.date);

  const categoryName = category?.name || tx.category_name || 'General';
  const categoryColor = category?.color || (isSavings ? '#f59e0b' : isIncome ? '#10b981' : '#f43f5e');
  const CategoryIcon = getCategoryIcon(category?.icon_name || category?.name || tx.category_name || 'Tag');

  // Sombra ambiental reactiva según el tipo de movimiento
  const hoverGlowClass = isCardHovered
    ? isSavings
      ? 'shadow-2xl shadow-amber-500/25 border-amber-500 ring-2 ring-amber-500/30'
      : isIncome
      ? 'shadow-2xl shadow-emerald-500/25 border-emerald-500 ring-2 ring-emerald-500/30'
      : 'shadow-2xl shadow-rose-500/25 border-rose-500 ring-2 ring-rose-500/30'
    : 'hover:border-slate-300 dark:hover:border-white/20';

  return (
    <motion.div
      layoutId={`movement-card-${tx.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: isOtherHovered ? 0.75 : 1,
        scale: isCardHovered ? 1.055 : 1,
        y: isCardHovered ? -7 : 0,
        zIndex: isCardHovered ? 40 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 460,
        damping: 32,
        mass: 0.22,
      }}
      style={{
        rotateX: isCardHovered && !isTouchDevice ? rotateX : 0,
        rotateY: isCardHovered && !isTouchDevice ? rotateY : 0,
        x: isCardHovered && !isTouchDevice ? moveX : 0,
        transformPerspective: 800,
        transformStyle: 'preserve-3d',
      }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onEdit(tx)}
      className={`relative rounded-2xl p-3.5 sm:p-4 cursor-pointer select-none group border-2 ${borderThemeClass} ${hoverGlowClass} bg-white dark:bg-[#11131a] flex flex-col justify-between min-h-[142px] sm:min-h-[148px] shadow-sm hover:shadow-2xl transition-colors duration-150`}
    >
      {/* Top Row: [NOMBRE DEL MOVIMIENTO] a la izquierda, # N° REGISTRO a la derecha */}
      <div className="flex items-start justify-between gap-2">
        <h4
          className="text-sm sm:text-[14px] font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-1 truncate flex-1 transition-colors group-hover:text-slate-950 dark:group-hover:text-white"
          title={tx.concept}
        >
          {tx.concept || 'MOVIMIENTO'}
        </h4>

        <span className="text-xs font-mono font-black text-slate-400 dark:text-zinc-500 shrink-0 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors">
          #{regNumber}
        </span>
      </div>

      {/* Second Row: SOLO FECHA a la izquierda (sin la hora) + SOLO ICONO DE CATEGORÍA CON SU COLOR a la derecha */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">
          <span>{dateParts.formattedDate}</span>
        </div>

        {/* SOLO ICONO DE LA CATEGORÍA CON SU COLOR (Mismo tamaño w-8 h-8 que el método de pago) */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `${categoryColor}18`,
            borderColor: `${categoryColor}35`,
            color: categoryColor,
          }}
          title={`Categoría: ${categoryName}`}
        >
          <CategoryIcon size={16} weight="bold" />
        </div>
      </div>

      {/* Third Row: [MONTO DEL GASTO O GANANCIA GRANDE] a la izquierda, ICONO METODO DE PAGO a la derecha */}
      <div className="flex items-end justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.08] min-w-0">
        <div className="min-w-0 flex-1">
          <div
            className={`whitespace-nowrap inline-flex items-baseline font-mono font-black tracking-tight leading-none ${amountColorClass}`}
          >
            <span className="text-xl sm:text-2xl font-black mr-1 shrink-0 select-none tracking-tight">
              {isIncome ? '+' : '-'}S/.
            </span>
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              {Number(tx.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Payment Method Badge: SOLO ICONO CON SU COLOR DISTINTIVO (w-8 h-8) */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${paymentColorStyle}`}
          title={paymentLabel}
        >
          <PaymentIcon size={16} weight="bold" />
        </div>
      </div>

      {/* Quick Action Floating Controls: Acceso rápido táctil en móvil y hover en desktop */}
      <div className="absolute top-2.5 right-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 dark:bg-[#1a1c26] rounded-xl p-1 shadow-md border border-slate-200 dark:border-white/10 z-30">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(tx);
          }}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Editar"
        >
          <PencilSimple size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tx.id);
          }}
          className="p-1 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
          title="Eliminar"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </motion.div>
  );
};

export const MovementsView: React.FC = () => {
  const {
    wallets,
    categories,
    transactions,
    deleteTransaction,
    updateTransaction,
    addTransaction,
    selectedWallet,
  } = useFinance();

  // Filtro de cuenta / tarjeta: 'free_spending' (libre para gastar), 'savings' (ahorro), 'all' (ver todo)
  const [filterWalletId, setFilterWalletId] = useState<string>('free_spending');
  // Filtro por tipo: 'all' (todos), 'expense' (solo gastos), 'income' (solo ingresos)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  
  // Registros por página: Default 12 (opciones 12, 20, Ver Todos)
  const [pageSize, setPageSize] = useState<number | 'all'>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [hoveredTxId, setHoveredTxId] = useState<string | null>(null);

  // 1. Filtrado de transacciones según cuenta y tipo
  const rawFilteredTransactions = useMemo(() => {
    let result = [...transactions];

    const savingsWalletIds = new Set(
      wallets.filter((w) => w.type === 'savings').map((w) => w.id)
    );

    // 1.1 Filtrado por cuenta / tarjeta
    if (filterWalletId === 'free_spending') {
      result = result.filter((t) => !savingsWalletIds.has(t.wallet_id));
    } else if (filterWalletId === 'savings') {
      result = result.filter((t) => savingsWalletIds.has(t.wallet_id));
    } else if (filterWalletId !== 'all') {
      result = result.filter((t) => t.wallet_id === filterWalletId);
    }

    // 1.2 Filtrado por tipo
    if (filterType === 'expense') {
      result = result.filter((t) => {
        const isSavingsTx = savingsWalletIds.has(t.wallet_id);
        if (isSavingsTx) {
          return t.type === 'savings_withdrawal' || t.type === 'expense';
        }
        return t.type === 'expense';
      });
    } else if (filterType === 'income') {
      result = result.filter((t) => {
        const isSavingsTx = savingsWalletIds.has(t.wallet_id);
        if (isSavingsTx) {
          return t.type === 'savings_deposit' || t.type === 'income';
        }
        return t.type === 'income';
      });
    }

    return result;
  }, [transactions, wallets, filterWalletId, filterType]);

  // 2. Mapa correlativo cronológico estable (#1, #2, ..., #N)
  const txIndexMap = useMemo(() => {
    const chronological = [...rawFilteredTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.created_at || a.date).getTime();
      const timeB = new Date(b.created_at || b.date).getTime();
      return timeA - timeB;
    });

    const map = new Map<string, number>();
    chronological.forEach((tx, idx) => {
      map.set(tx.id, idx + 1);
    });
    return map;
  }, [rawFilteredTransactions]);

  // 3. Orden de transacciones: Más recientes primero
  const filteredTransactions = useMemo(() => {
    return [...rawFilteredTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = new Date(a.created_at || a.date).getTime();
      const timeB = new Date(b.created_at || b.date).getTime();
      return timeB - timeA;
    });
  }, [rawFilteredTransactions]);

  // Paginación
  const totalItems = filteredTransactions.length;
  const effectivePageSize = pageSize === 'all' ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;

  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['ID', 'Tarjeta/Fondo', 'Tipo', 'Monto', 'Categoría', 'Detalle/Concepto', 'Fecha'];
    const rows = filteredTransactions.map((tx) => {
      const walletName = wallets.find((w) => w.id === tx.wallet_id)?.name || 'Desconocido';
      return [
        sanitizeCsvCell(tx.id),
        sanitizeCsvCell(walletName),
        sanitizeCsvCell(tx.type),
        tx.amount,
        sanitizeCsvCell(tx.category_name || 'General'),
        sanitizeCsvCell(tx.concept),
        sanitizeCsvCell(tx.date),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finanzas_movimientos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Título contextual según filtro (Fiel a Imagen 4)
  const getContainerTitle = () => {
    if (filterWalletId === 'free_spending') return 'MOVIMIENTOS: LIBRE PARA GASTAR';
    if (filterWalletId === 'savings') return 'MOVIMIENTOS: CUENTAS DE AHORRO';
    if (filterWalletId === 'all') return 'MOVIMIENTOS: VER TODO';
    const w = wallets.find((x) => x.id === filterWalletId);
    return `MOVIMIENTOS: ${w?.name?.toUpperCase() || 'TARJETA'}`;
  };

  const activeModalWallet = useMemo(() => {
    if (filterWalletId === 'savings') {
      return wallets.find((w) => w.type === 'savings') || selectedWallet || wallets[0];
    }
    if (filterWalletId !== 'all' && filterWalletId !== 'free_spending') {
      return wallets.find((w) => w.id === filterWalletId) || selectedWallet || wallets[0];
    }
    return selectedWallet || wallets[0];
  }, [filterWalletId, wallets, selectedWallet]);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1540px] mx-auto space-y-3.5 sm:space-y-4 pb-12 sm:pb-16">
      {/* 1. BARRA DE FILTROS SUPERIOR (ESTILO IMAGEN 4) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Pills Izquierda: [Libre para Gastar] [Ahorro] [Ver Todo] con deslizamiento fluido */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-2xl bg-slate-200/80 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.08] w-full sm:w-auto backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setFilterWalletId('free_spending');
              setCurrentPage(1);
            }}
            className={`relative flex-1 sm:flex-none px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
              filterWalletId === 'free_spending'
                ? 'text-zinc-950 dark:text-zinc-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {filterWalletId === 'free_spending' && (
              <motion.div
                layoutId="activeMovementsTabPill"
                className="absolute inset-0 bg-white rounded-xl shadow-md ring-1 ring-black/5 -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <CreditCard size={16} weight="bold" />
            <span>Libre para Gastar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterWalletId('savings');
              setCurrentPage(1);
            }}
            className={`relative flex-1 sm:flex-none px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
              filterWalletId === 'savings'
                ? 'text-zinc-950 dark:text-zinc-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {filterWalletId === 'savings' && (
              <motion.div
                layoutId="activeMovementsTabPill"
                className="absolute inset-0 bg-white rounded-xl shadow-md ring-1 ring-black/5 -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <PiggyBank size={16} weight="bold" />
            <span>Ahorro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterWalletId('all');
              setCurrentPage(1);
            }}
            className={`relative flex-1 sm:flex-none px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-colors flex items-center justify-center cursor-pointer z-10 ${
              filterWalletId === 'all'
                ? 'text-zinc-950 dark:text-zinc-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {filterWalletId === 'all' && (
              <motion.div
                layoutId="activeMovementsTabPill"
                className="absolute inset-0 bg-white rounded-xl shadow-md ring-1 ring-black/5 -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Ver Todo</span>
          </button>
        </div>

        {/* Botones Derecha: [Exportar CSV] [+ Registrar] */}
        <div className="flex items-center justify-center gap-2.5 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportCSV}
            title="Exportar movimientos a CSV"
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer backdrop-blur-md"
          >
            <FileCsv size={17} weight="bold" />
            <span>Exportar CSV</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMovementModalOpen(true)}
            className="btn-unified flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-md shadow-black/10 dark:shadow-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-white/20"
          >
            <Plus size={17} weight="bold" />
            <span>Registrar</span>
          </motion.button>
        </div>
      </div>

      {/* 2. PANEL CONTENEDOR PRINCIPAL (ESTILO IMAGEN 4) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/50 border border-slate-200/80 dark:border-white/[0.08]"
      >
        {/* Cabecera del Contenedor: Título + Contador a la Izquierda, Filtros a la Derecha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.08] mb-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {getContainerTitle()}
            </h3>
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
              {totalItems} {totalItems === 1 ? 'movimiento' : 'movimientos'}
            </span>
          </div>

          {/* Filtros de Tipo: [Todos] [Solo Gastos] [Solo Ingresos] */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/80 dark:bg-white/[0.06] border border-slate-300/80 dark:border-white/[0.08] self-stretch sm:self-auto backdrop-blur-md overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer z-10 ${
                filterType === 'all'
                  ? 'text-white dark:text-zinc-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filterType === 'all' && (
                <motion.div
                  layoutId="activeMovementsTypePill"
                  className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              Todos
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('expense');
                setCurrentPage(1);
              }}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer z-10 ${
                filterType === 'expense'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              {filterType === 'expense' && (
                <motion.div
                  layoutId="activeMovementsTypePill"
                  className="absolute inset-0 bg-rose-600 rounded-xl shadow-sm shadow-rose-600/30 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <ArrowUpRight size={14} weight="bold" />
              <span>Solo Gastos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('income');
                setCurrentPage(1);
              }}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer z-10 ${
                filterType === 'income'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {filterType === 'income' && (
                <motion.div
                  layoutId="activeMovementsTypePill"
                  className="absolute inset-0 bg-emerald-600 rounded-xl shadow-sm shadow-emerald-600/30 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <ArrowDownLeft size={14} weight="bold" />
              <span>Solo Ingresos</span>
            </button>
          </div>
        </div>

        {/* 3. GRID DE CARDS DE MOVIMIENTOS RESPONSIVE (1 COL MÓVIL, 2 SM, 3 LG, 4 XL) */}
        {paginatedTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No hay movimientos registrados para este filtro.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en "+ Registrar" para añadir una nueva transacción.
            </p>
          </div>
        ) : (
          <div onMouseLeave={() => setHoveredTxId(null)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${filterWalletId}-${filterType}-${currentPage}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3"
              >
                {paginatedTransactions.map((tx) => {
                  const conceptLower = (tx.concept || '').toLowerCase();
                  const catNameLower = (tx.category_name || '').toLowerCase();

                  const isSavingsDeposit =
                    !conceptLower.includes('7ds') &&
                    (tx.type === 'savings_deposit' ||
                      catNameLower === 'reposición de ahorro' ||
                      catNameLower === 'depósito ahorro' ||
                      conceptLower.includes('aporte a ahorro') ||
                      conceptLower.includes('reposición'));

                  const isSavingsWithdrawal =
                    !conceptLower.includes('7ds') &&
                    (tx.type === 'savings_withdrawal' ||
                      catNameLower === 'retiro de ahorro' ||
                      catNameLower === 'inyección de ahorro' ||
                      (conceptLower.includes('retiro') && conceptLower.includes('ahorro')));

                  const wallet = wallets.find((w) => w.id === tx.wallet_id);
                  const isSavingsWalletTx = wallet?.type === 'savings';
                  const isSavingsRelated = isSavingsWalletTx || isSavingsDeposit || isSavingsWithdrawal;

                  let isIncome = false;
                  if (isSavingsWalletTx) {
                    isIncome = isSavingsDeposit || tx.type === 'income';
                  } else {
                    if (isSavingsWithdrawal) {
                      isIncome = true;
                    } else if (isSavingsDeposit) {
                      isIncome = false;
                    } else {
                      isIncome = tx.type === 'income';
                    }
                  }

                  // Determine border & theme according to wireframe in Image 4:
                  let borderThemeClass =
                    'border-rose-400/90 bg-white dark:bg-[#0e1017] hover:border-rose-500 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 dark:border-rose-500/80';
                  let amountColorClass = 'text-rose-600 dark:text-rose-400';

                  if (isSavingsRelated) {
                    borderThemeClass =
                      'border-amber-400/90 bg-white dark:bg-[#0e1017] hover:border-amber-500 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 dark:border-amber-400/80';
                    amountColorClass = 'text-amber-600 dark:text-amber-400';
                  } else if (isIncome) {
                    borderThemeClass =
                      'border-emerald-400/90 bg-white dark:bg-[#0e1017] hover:border-emerald-500 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 dark:border-emerald-500/80';
                    amountColorClass = 'text-emerald-600 dark:text-emerald-400';
                  }

                  const regNumber = txIndexMap.get(tx.id) ?? 1;
                  const isHovered = hoveredTxId === tx.id;
                  const isOtherHovered = hoveredTxId !== null && hoveredTxId !== tx.id;
                  const category = categories.find(
                    (c) => c.id === tx.category_id || c.name.toLowerCase() === (tx.category_name || '').toLowerCase()
                  );

                  return (
                    <InteractiveMovementCard
                      key={tx.id}
                      tx={tx}
                      regNumber={regNumber}
                      wallet={wallet}
                      category={category}
                      isIncome={isIncome}
                      borderThemeClass={borderThemeClass}
                      amountColorClass={amountColorClass}
                      isHovered={isHovered}
                      isOtherHovered={isOtherHovered}
                      onHoverStart={() => setHoveredTxId(tx.id)}
                      onHoverEnd={() => setHoveredTxId(null)}
                      onEdit={setEditingTx}
                      onDelete={deleteTransaction}
                    />
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* 4. CONTROLES INFERIORES (PAGINACIÓN EXACTA A IMAGEN 4) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3.5 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
          {/* Mostrar: [12] [20] [Ver Todos] */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">
              Mostrar:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-white/[0.06] backdrop-blur-md">
              {([12, 20, 'all'] as const).map((sz) => (
                <motion.button
                  key={sz}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    pageSize === sz
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sz === 'all' ? 'Ver Todos' : sz}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Paginador Compacto: < [1] [2] [3] ... [32] > */}
          {pageSize !== 'all' && totalPages > 1 && (
            <CompactPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mx-auto sm:mx-0"
            />
          )}
        </div>
      </motion.div>

      {/* MODAL REGISTRAR MOVIMIENTO */}
      <ContextualMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        activeWallet={activeModalWallet}
        wallets={wallets}
        categories={categories}
        onAddTransaction={addTransaction}
      />

      {/* MODAL EDITAR MOVIMIENTO */}
      <EditMovementModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        movementNumber={editingTx ? (txIndexMap.get(editingTx.id) ?? 1) : 1}
        wallets={wallets}
        categories={categories}
        onSave={updateTransaction}
      />
    </div>
  );
};

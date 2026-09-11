import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCsv,
  CaretLeft,
  CaretRight,
  CreditCard,
  PiggyBank,
  Trash,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CaretDown,
  CaretUp,
  CalendarBlank,
  Clock,
  DeviceMobile,
  Money,
  PencilSimple,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { parseLocalDateParts } from '../../utils/date';
import { ContextualMovementModal } from './ContextualMovementModal';
import { EditMovementModal } from './EditMovementModal';
import { sanitizeCsvCell } from '../../utils/security';
import type { Transaction } from '../../types';


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

  // Filtro de cuenta / tarjeta
  const [filterWalletId, setFilterWalletId] = useState<string>('free_spending');
  // Filtro por tipo de movimiento: 'all' (todos), 'expense' (solo gastos), 'income' (solo ingresos)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  // Rows per page: 5, 10, 20, or Infinity ('all')
  const [pageSize, setPageSize] = useState<number | 'all'>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 1. Filtrado de transacciones según cuenta y tipo (Resiliente)
  const rawFilteredTransactions = useMemo(() => {
    let result = [...transactions];

    const savingsWalletIds = new Set(
      wallets.filter((w) => w.type === 'savings').map((w) => w.id)
    );

    // 1.1 Filtrado por cuenta / tarjeta
    if (filterWalletId === 'free_spending') {
      // Tarjetas de gasto libre (digital y efectivo): excluir únicamente cuentas de la bóveda de ahorro
      result = result.filter((t) => !savingsWalletIds.has(t.wallet_id));
    } else if (filterWalletId === 'savings') {
      // Solo ahorros: ÚNICAMENTE movimientos pertenecientes a cuentas de ahorro
      result = result.filter((t) => savingsWalletIds.has(t.wallet_id));
    } else if (filterWalletId !== 'all') {
      // Tarjeta específica
      result = result.filter((t) => t.wallet_id === filterWalletId);
    }

    // 1.2 Filtrado por tipo (Todos | Solo Gastos | Solo Ingresos)
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

  // 2. Mapa para calcular correlativo cronológico estable (#1, #2, ..., #N)
  // El primer movimiento registrado históricamente en el tiempo (fecha más antigua) es SIEMPRE el #1.
  // El último movimiento realizado (fecha más reciente) es el #N (ej. #18).
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

  // 3. Orden final de transacciones para la pantalla según la preferencia elegida:
  // - 'desc': Más recientes primero (el último hecho arriba con su badge correlativo mayor, ej. #18)
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

  // Manejador de cambio de página
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

  // Título contextual según filtro
  const getContainerTitle = () => {
    if (filterWalletId === 'free_spending') return 'MOVIMIENTOS: LIBRE PARA GASTAR';
    if (filterWalletId === 'savings') return 'MOVIMIENTOS: CUENTAS DE AHORRO';
    if (filterWalletId === 'all') return 'TODOS LOS MOVIMIENTOS';
    const w = wallets.find((x) => x.id === filterWalletId);
    return `MOVIMIENTOS: ${w?.name?.toUpperCase() || 'TARJETA'}`;
  };

  // Cuenta activa contextual para el modal de registrar según el filtro activo
  const activeModalWallet = useMemo(() => {
    if (filterWalletId === 'savings') {
      return wallets.find((w) => w.type === 'savings') || selectedWallet || wallets[0];
    }
    if (filterWalletId !== 'all' && filterWalletId !== 'free_spending') {
      return wallets.find((w) => w.id === filterWalletId) || selectedWallet || wallets[0];
    }
    return selectedWallet || wallets[0];
  }, [filterWalletId, wallets, selectedWallet]);

  // Helper para resolver el nombre e insignia de categoría respetando las categorías reales del usuario
  const resolveCategory = (tx: (typeof transactions)[0]) => {
    const conceptLower = (tx.concept || '').toLowerCase();
    const categoryNameLower = (tx.category_name || '').toLowerCase();

    // 1. Si tiene category_id asociado y existe en categories del usuario, usarlo con su nombre y color real
    if (tx.category_id) {
      const found = categories.find((c) => c.id === tx.category_id);
      if (found) {
        return {
          name: found.name,
          color: found.color,
        };
      }
    }

    // 2. Coincidencia directa de nombre con alguna categoría del usuario (ej. "Reposición de Ahorro", "Retiro de Ahorro")
    const matchByName = categories.find((c) => c.name.toLowerCase().trim() === categoryNameLower.trim());
    if (matchByName) {
      return {
        name: matchByName.name,
        color: matchByName.color,
      };
    }

    // 3. Caso especial: Pago internet 7DS ORIGIN y LootBar -> Entretenimiento
    if (conceptLower.includes('7ds') || conceptLower.includes('lootbar')) {
      const entCat = categories.find((c) => c.name.toLowerCase() === 'entretenimiento');
      return {
        name: entCat?.name || 'Entretenimiento',
        color: entCat?.color || '#ec4899',
      };
    }

    // 4. Mapeos de nombres de CSV anteriores a categorías del sistema
    if (categoryNameLower === 'comida') {
      const cat = categories.find((c) => c.name.toLowerCase() === 'alimentación');
      return {
        name: cat?.name || 'Alimentación',
        color: cat?.color || '#f59e0b',
      };
    }

    if (categoryNameLower === 'pasajes') {
      const cat = categories.find((c) => c.name.toLowerCase() === 'transporte');
      return {
        name: cat?.name || 'Transporte',
        color: cat?.color || '#3b82f6',
      };
    }

    // 5. Si es Aporte o Reposición a Ahorro
    if (
      tx.type === 'savings_deposit' ||
      categoryNameLower === 'depósito ahorro' ||
      conceptLower.includes('aporte a ahorro') ||
      conceptLower.includes('reposición al fondo de ahorro') ||
      conceptLower.includes('reposición de ahorro')
    ) {
      const repCat = categories.find((c) => c.name.toLowerCase() === 'reposición de ahorro');
      return {
        name: repCat?.name || 'Reposición de Ahorro',
        color: repCat?.color || '#f97316',
      };
    }

    // 6. Si es Retiro de Ahorro
    if (
      tx.type === 'savings_withdrawal' ||
      categoryNameLower === 'inyección de ahorro' ||
      categoryNameLower === 'retiro ahorro' ||
      conceptLower.includes('retiro de bolsa de ahorro') ||
      conceptLower.includes('retiro de ahorro')
    ) {
      const retCat = categories.find((c) => c.name.toLowerCase() === 'retiro de ahorro');
      return {
        name: retCat?.name || 'Retiro de Ahorro',
        color: retCat?.color || '#8b5cf6',
      };
    }

    return {
      name: tx.category_name || 'General',
      color: '#818cf8',
    };
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto space-y-6 pb-28">
      {/* 1. Barra de Filtros Superior con Micro-animaciones */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 w-full">
        {/* Filtros de Fondo / Tarjeta */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.08] w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setFilterWalletId('free_spending');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterWalletId === 'free_spending'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard size={16} weight="bold" />
            <span>Libre para Gastar</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setFilterWalletId('savings');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterWalletId === 'savings'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PiggyBank size={16} weight="bold" />
            <span>Ahorro</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setFilterWalletId('all');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
              filterWalletId === 'all'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Ver Todo</span>
          </motion.button>
        </div>

        {/* Botones rápidos destacados con feedback háptico / visual */}
        <div className="flex items-center justify-center gap-2.5 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportCSV}
            title="Descargar movimientos en archivo CSV"
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileCsv size={17} weight="bold" />
            <span>Exportar CSV</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMovementModalOpen(true)}
            className="btn-unified flex-1 sm:flex-none px-5 py-2.5 sm:py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-md shadow-black/10 dark:shadow-black/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-white/20"
          >
            <Plus size={17} weight="bold" />
            <span>Registrar</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Contenedor de Movimientos (Glassmorphic + Sombra Elegante) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass-panel rounded-3xl p-6 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40"
      >
        {/* Encabezado del Contenedor */}
        {/* Encabezado del Contenedor con Selector de Orden Cronológico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08] mb-4">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {getContainerTitle()}
            </h3>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {totalItems} {totalItems === 1 ? 'movimiento' : 'movimientos'}
            </span>
          </div>

          {/* Filtros de Tipo: Todos / Solo Gastos / Solo Ingresos */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.08] self-start sm:self-auto">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setFilterType('expense');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterType === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <ArrowUpRight size={14} weight="bold" />
              <span>Solo Gastos</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setFilterType('income');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterType === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <ArrowDownLeft size={14} weight="bold" />
              <span>Solo Ingresos</span>
            </motion.button>
          </div>
        </div>

        {/* Lista de Filas de Movimiento (Diseño Acordeón Expandible Fiel a la Versión Previa) */}
        {paginatedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No hay movimientos registrados para este filtro.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en "Registrar" para añadir un ingreso o egreso.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedTransactions.map((tx) => {
              const conceptLower = (tx.concept || '').toLowerCase();
              const catNameLower = (tx.category_name || '').toLowerCase();

              // Es aporte al ahorro si mueve dinero a la cuenta de ahorro (no es gasto de consumo)
              const isSavingsDeposit =
                !conceptLower.includes('7ds') &&
                (tx.type === 'savings_deposit' ||
                  catNameLower === 'reposición de ahorro' ||
                  catNameLower === 'depósito ahorro' ||
                  conceptLower.includes('aporte a ahorro') ||
                  conceptLower.includes('reposición al fondo de ahorro') ||
                  conceptLower.includes('reposición de ahorro'));

              // Es retiro de ahorro si libera dinero del fondo de ahorro a gastos
              const isSavingsWithdrawal =
                !conceptLower.includes('7ds') &&
                (tx.type === 'savings_withdrawal' ||
                  catNameLower === 'retiro de ahorro' ||
                  catNameLower === 'inyección de ahorro' ||
                  (conceptLower.includes('retiro') && conceptLower.includes('ahorro')));

              const wallet = wallets.find((w) => w.id === tx.wallet_id);
              const isSavingsWalletTx = wallet?.type === 'savings';

              // Es una transacción vinculada a la operativa de ahorro
              const isSavingsRelated = isSavingsWalletTx || isSavingsDeposit || isSavingsWithdrawal;

              // Determinar si suma o resta de esta tarjeta:
              // - En cuenta de ahorro: depósito es suma (+), retiro es resta (-)
              // - En cuenta libre (digital/efectivo): retiro de ahorro entrante es suma (+), aporte enviado es resta (-)
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

              // Color del Monto según especificación:
              // - En cuenta de ahorro: color mostaza / ámbar diferenciador
              // - En libre para gastar:
              //    * Si entra monto desde el ahorro al digital: verde (+S/.)
              //    * Si sale monto hacia el ahorro desde el digital: amarillo/mostaza (-S/.)
              //    * Ingreso estándar: verde (+S/.)
              //    * Gasto estándar: rojo (-S/.)
              let amountColorClass = 'text-rose-600 dark:text-rose-400';
              if (isSavingsWalletTx) {
                amountColorClass = 'text-amber-500 dark:text-amber-400 font-bold';
              } else if (isSavingsWithdrawal) {
                amountColorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
              } else if (isSavingsDeposit) {
                amountColorClass = 'text-amber-500 dark:text-amber-400 font-bold';
              } else if (isIncome) {
                amountColorClass = 'text-emerald-600 dark:text-emerald-400';
              }

              const resolvedCat = resolveCategory(tx);
              const regNumber = txIndexMap.get(tx.id) ?? 1;
              const isExpanded = expandedTxIds.has(tx.id);

              // Formatear Fecha y Hora precisas sin desfaces UTC
              const dateParts = parseLocalDateParts(tx.date);

              // Determinar Tipo de Fondo
              const isCash = wallet?.type === 'cash';
              const isSavings = wallet?.type === 'savings';
              const fundLabel = isCash
                ? 'Efectivo / Físico'
                : isSavings
                ? 'Ahorro / Metas'
                : 'Digital / Bancos';

              return (
                <motion.div
                  key={tx.id}
                  layout
                  whileHover={{ scale: 1.006, y: -1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="w-full glass-pill hover:bg-white/80 dark:hover:bg-white/[0.08] rounded-2xl p-4 transition-all shadow-sm hover:shadow-md"
                >
                  {/* Fila Principal / Cabecera (Click para expandir detalles) */}
                  <div
                    onClick={() => toggleExpand(tx.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    {/* Lado Izquierdo: Icono Flecha/Cerdito + Concepto + Badges */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icono: Cerdito para todo lo de ahorro (Ahorro, o transferencias de/hacia ahorro), Flecha Verde para Ingreso, Flecha Roja para Gasto */}
                      <div
                        className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border transition-all select-none ${
                          isSavingsRelated
                            ? isSavingsWithdrawal && !isSavingsWalletTx
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : isIncome
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isSavingsRelated ? (
                          <PiggyBank size={22} weight="bold" />
                        ) : isIncome ? (
                          <ArrowDownLeft size={22} weight="bold" />
                        ) : (
                          <ArrowUpRight size={22} weight="bold" />
                        )}
                      </div>

                      <div className="min-w-0">
                        {/* Concepto / Título */}
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                          {tx.concept}
                        </h4>

                        {/* Badges: Categoría, Fecha con icono, y Fondo (El N° de registro solo se muestra al hacer click) */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {/* Badge de Categoría con color */}
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-lg border"
                            style={{
                              backgroundColor: `${resolvedCat.color}15`,
                              borderColor: `${resolvedCat.color}35`,
                              color: resolvedCat.color,
                            }}
                          >
                            {resolvedCat.name}
                          </span>

                          {/* Badge de Fecha */}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-white/[0.05] flex items-center gap-1">
                            <CalendarBlank size={12} weight="bold" className="text-slate-400" />
                            {dateParts.formattedDate}
                          </span>

                          {/* Badge de Tipo de Fondo */}
                          <span className="text-[11px] font-bold flex items-center gap-1">
                            {isCash ? (
                              <>
                                <Money size={14} weight="bold" className="text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Efectivo</span>
                              </>
                            ) : isSavings ? (
                              <>
                                <PiggyBank size={14} weight="bold" className="text-purple-500" />
                                <span className="text-purple-600 dark:text-purple-400">Ahorro</span>
                              </>
                            ) : (
                              <>
                                <DeviceMobile size={14} weight="bold" className="text-sky-500" />
                                <span className="text-sky-600 dark:text-sky-400">Digital</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Derecho: Monto y Caret Expand/Collapse */}
                    <div className="flex items-center gap-3 shrink-0 pl-3">
                      <span
                        className={`text-base sm:text-lg font-black font-mono tracking-tight ${amountColorClass}`}
                      >
                        {isIncome ? '+' : '-'}S/.{' '}
                        {Number(tx.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>

                      {/* Botón rápido de editar en la fila */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTx(tx);
                        }}
                        title="Editar movimiento"
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      >
                        <PencilSimple size={16} weight="bold" />
                      </button>

                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        {isExpanded ? (
                          <CaretUp size={16} weight="bold" />
                        ) : (
                          <CaretDown size={16} weight="bold" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contenido Desplegable (Accordion de Detalles y Número de Registro) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-300/80 dark:border-white/[0.08] mt-3.5 pt-3.5 space-y-3">
                          {/* Cuadrícula de 4 Datos: Registro, Hora, Fecha, Fondo */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-100 dark:bg-black/25 border border-slate-300/60 dark:border-white/[0.06]">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                # N° REGISTRO
                              </span>
                              <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                                #{regNumber}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock size={11} weight="bold" /> HORA
                              </span>
                              <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                                {dateParts.formattedTime}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <CalendarBlank size={11} weight="bold" /> FECHA
                              </span>
                              <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                                {dateParts.formattedDate}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                FONDO
                              </span>
                              <span className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 mt-0.5 block truncate">
                                {fundLabel}
                              </span>
                            </div>
                          </div>

                          {/* Caja de Cita: Concepto o Notas */}
                          <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-300/60 dark:border-white/[0.06]">
                            <p className="text-xs font-mono italic text-slate-700 dark:text-slate-300">
                              "{tx.notes || tx.concept || wallet?.name}"
                            </p>
                          </div>

                          {/* Botones de Acción: Editar y Eliminar Registro */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTx(tx);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <PencilSimple size={14} weight="bold" />
                              <span>Editar Registro</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTransaction(tx.id);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Trash size={14} weight="bold" />
                              <span>Eliminar Registro</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 3. Controles Inferiores (Fiel al Boceto 2): Filas por Página y Paginador */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.08]">
          {/* Selector de Filas: Mostrar 5, 10, 20, Ver Todos */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Mostrar:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-white/[0.06]">
              {([5, 10, 20, 'all'] as const).map((sz) => (
                <motion.button
                  key={sz}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    pageSize === sz
                      ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sz === 'all' ? 'Ver Todos' : sz}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Botones de Paginación Inteligente con puntos suspensivos (1 - 2 - 3 - 4 - ... - 11) */}
          {pageSize !== 'all' && totalPages > 1 && (() => {
            const getPaginationPages = (current: number, total: number): (number | string)[] => {
              if (total <= 7) {
                return Array.from({ length: total }, (_, i) => i + 1);
              }
              if (current <= 4) {
                return [1, 2, 3, 4, 5, '...', total];
              }
              if (current >= total - 3) {
                return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
              }
              return [1, '...', current - 1, current, current + 1, '...', total];
            };

            return (
              <div className="flex items-center justify-center gap-1 bg-slate-200/80 dark:bg-white/[0.06] p-1 rounded-xl mx-auto sm:mx-0 select-none">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default select-none outline-none focus:outline-none"
                  title="Página anterior"
                >
                  <CaretLeft size={16} weight="bold" />
                </motion.button>

                {getPaginationPages(currentPage, totalPages).map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-6 h-7 flex items-center justify-center text-xs font-black text-slate-400 select-none tracking-widest pointer-events-none"
                      >
                        ...
                      </span>
                    );
                  }

                  const pg = item as number;
                  return (
                    <motion.button
                      key={pg}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePageChange(pg)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none outline-none focus:outline-none ${
                        currentPage === pg
                          ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {pg}
                    </motion.button>
                  );
                })}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default select-none outline-none focus:outline-none"
                  title="Página siguiente"
                >
                  <CaretRight size={16} weight="bold" />
                </motion.button>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Modal para Registrar Movimiento con Cuenta Contextual */}
      <ContextualMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        activeWallet={activeModalWallet}
        wallets={wallets}
        categories={categories}
        onAddTransaction={addTransaction}
      />

      {/* Modal para Editar Movimiento Existente */}
      <EditMovementModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        wallets={wallets}
        categories={categories}
        onSave={async (id, updates) => {
          await updateTransaction(id, updates);
        }}
      />
    </div>
  );
};

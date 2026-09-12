import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartPieSlice,
  ChartBar,
  ChartLineUp,
  ArrowsOutSimple,
  X,
  TrendUp,
  TrendDown,
  Calendar,
  FireSimple,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { getCategoryIcon } from '../../constants/iconMap';
import type { Transaction } from '../../types';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface MonthPeriod {
  year: number;
  month: number; // 0-indexado: 0 = Enero, 11 = Diciembre
  key: string;   // 'YYYY-MM'
  label: string; // 'Agosto 2026'
  shortLabel: string; // 'Ago 2026'
}

export const StatisticsView: React.FC = () => {
  const { wallets, transactions, categories } = useFinance();

  // Exclusivo para tarjetas y billetes libre para gastar (excluyendo ahorros)
  const freeSpendingWalletIds = useMemo(() => {
    return new Set(wallets.filter((w) => w.type !== 'savings').map((w) => w.id));
  }, [wallets]);

  const freeTransactions = useMemo(() => {
    return transactions.filter((t) => freeSpendingWalletIds.has(t.wallet_id));
  }, [transactions, freeSpendingWalletIds]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Detección DINÁMICA de todos los meses y años existentes a partir de las transacciones
  const availableMonths = useMemo<MonthPeriod[]>(() => {
    const set = new Set<string>();

    // Siempre incluir el mes actual
    const nowKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    set.add(nowKey);

    // Extraer meses únicos de transacciones
    for (const t of freeTransactions) {
      if (!t.date) continue;
      const key = t.date.slice(0, 7); // 'YYYY-MM'
      if (/^\d{4}-\d{2}$/.test(key)) {
        set.add(key);
      }
    }

    // Ordenar cronológicamente ascendente (antiguos -> recientes)
    const sortedKeys = Array.from(set).sort();
    return sortedKeys.map((k) => {
      const [yStr, mStr] = k.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      return {
        year: y,
        month: m,
        key: k,
        label: `${MONTH_NAMES_ES[m]} ${y}`,
        shortLabel: `${MONTH_NAMES_ES[m].slice(0, 3)} ${y}`,
      };
    });
  }, [freeTransactions, currentYear, currentMonth]);

  // Estado del mes seleccionado (por defecto el último mes disponible)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    return Math.max(0, availableMonths.length - 1);
  });

  // Asegurar consistencia de índice si availableMonths cambia
  useEffect(() => {
    setSelectedMonthIndex((prev) => {
      if (prev >= availableMonths.length) {
        return Math.max(0, availableMonths.length - 1);
      }
      return prev;
    });
  }, [availableMonths.length]);

  const selectedPeriod: MonthPeriod =
    availableMonths[selectedMonthIndex] ||
    availableMonths[availableMonths.length - 1] || {
      year: currentYear,
      month: currentMonth,
      key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      label: `${MONTH_NAMES_ES[currentMonth]} ${currentYear}`,
      shortLabel: `${MONTH_NAMES_ES[currentMonth].slice(0, 3)} ${currentYear}`,
    };

  const handlePrevMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex < availableMonths.length - 1) {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  // Helper para identificar transferencias internas hacia/desde ahorros (no son gastos de consumo)
  const isSavingsTransfer = (t: Transaction) => {
    const concept = (t.concept || '').toLowerCase();
    if (concept.includes('7ds')) return false; // 7DS es gasto de Entretenimiento
    const cat = (t.category_name || '').toLowerCase();
    return (
      t.type === 'savings_deposit' ||
      t.type === 'savings_withdrawal' ||
      cat === 'reposición de ahorro' ||
      cat === 'depósito ahorro' ||
      cat === 'retiro de ahorro' ||
      cat === 'inyección de ahorro' ||
      concept.includes('aporte a ahorro') ||
      concept.includes('reposición al fondo de ahorro') ||
      concept.includes('reposición de ahorro')
    );
  };

  // Helper para resolver la categoría correcta
  const resolveStatCategory = (t: Transaction) => {
    const concept = (t.concept || '').toLowerCase();
    if (concept.includes('7ds') || concept.includes('lootbar')) {
      const ent = categories.find((c) => c.name.toLowerCase() === 'entretenimiento');
      return {
        name: 'Entretenimiento',
        color: ent?.color || '#ec4899',
        icon_name: ent?.icon_name || 'GameController',
      };
    }
    if (t.category_id) {
      const cat = categories.find((c) => c.id === t.category_id);
      if (cat) return { name: cat.name, color: cat.color, icon_name: cat.icon_name };
    }
    const catName = (t.category_name || '').toLowerCase();
    if (catName === 'comida') {
      const cat = categories.find((c) => c.name.toLowerCase() === 'alimentación');
      return { name: 'Alimentación', color: cat?.color || '#f59e0b', icon_name: cat?.icon_name || 'ForkKnife' };
    }
    if (catName === 'pasajes') {
      const cat = categories.find((c) => c.name.toLowerCase() === 'transporte');
      return { name: 'Transporte', color: cat?.color || '#3b82f6', icon_name: cat?.icon_name || 'Car' };
    }
    const direct = categories.find((c) => c.name.toLowerCase() === catName);
    if (direct) return { name: direct.name, color: direct.color, icon_name: direct.icon_name };

    return { name: t.category_name || 'Otros', color: '#94A3B8', icon_name: 'Tag' };
  };

  const [expandedModal, setExpandedModal] = useState<'categoryBars' | 'monthlyPie' | 'gauge' | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Cerrar modal al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Transacciones correspondientes al mes seleccionado
  const selectedPeriodTx = useMemo(() => {
    return freeTransactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
      return d.getFullYear() === selectedPeriod.year && d.getMonth() === selectedPeriod.month;
    });
  }, [freeTransactions, selectedPeriod]);

  // 1. DESGLOSE POR CATEGORÍAS (ORDENADO ESTRICTAMENTE DE MAYOR A MENOR)
  const categoryExpenses = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string; icon_name: string; count: number }> = {};

    for (const t of selectedPeriodTx) {
      if (isSavingsTransfer(t)) continue;
      if (t.type === 'expense') {
        const resolved = resolveStatCategory(t);
        const name = resolved.name;
        const color = resolved.color;
        const icon_name = resolved.icon_name;

        if (!map[name]) {
          map[name] = { name, amount: 0, color, icon_name, count: 0 };
        }
        map[name].amount += Number(t.amount) || 0;
        map[name].count += 1;
      }
    }

    // Ordenar de mayor a menor estrictamente
    const items = Object.values(map).sort((a, b) => b.amount - a.amount);
    const total = items.reduce((acc, cur) => acc + cur.amount, 0);
    const maxAmount = items[0]?.amount || 1;

    return {
      items: items.map((it, idx) => ({
        ...it,
        rank: idx + 1,
        percentage: total > 0 ? Math.round((it.amount / total) * 100) : 0,
        relativeBarWidth: Math.max(8, Math.round((it.amount / maxAmount) * 100)),
      })),
      total,
      maxAmount,
    };
  }, [selectedPeriodTx, categories]);

  // 2. DATOS DEL GRÁFICO DE PASTEL (INGRESOS VS GASTOS) DEL MES SELECCIONADO
  const monthlyPieData = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const t of selectedPeriodTx) {
      if (isSavingsTransfer(t)) continue;
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amt;
        incomeCount++;
      } else if (t.type === 'expense') {
        expense += amt;
        expenseCount++;
      }
    }

    const total = income + expense;
    const net = income - expense;
    const incomePercent = total > 0 ? (income / total) * 100 : 0;
    const expensePercent = total > 0 ? (expense / total) * 100 : 0;

    return {
      income,
      expense,
      incomeCount,
      expenseCount,
      total,
      net,
      incomePercent,
      expensePercent,
    };
  }, [selectedPeriodTx]);

  // 3. EVOLUCIÓN DIARIA DEL MES SELECCIONADO (Se mantiene intacta)
  const dailyTimelineData = useMemo(() => {
    const daysInMonth = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0).getDate();
    const isCurrentMonth = selectedPeriod.year === currentYear && selectedPeriod.month === currentMonth;
    const maxDay = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    const days = [];
    let runningCumNet = 0;
    let runningCumExpense = 0;
    let runningCumIncome = 0;
    let maxDailyExpense = 0;
    let peakExpenseDay = { day: 1, amount: 0 };

    for (let d = 1; d <= maxDay; d++) {
      const dayTxs = selectedPeriodTx.filter((t) => {
        const td = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
        return td.getDate() === d && !isSavingsTransfer(t);
      });

      let inc = 0;
      let exp = 0;
      for (const t of dayTxs) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') inc += amt;
        if (t.type === 'expense') exp += amt;
      }

      const net = inc - exp;
      runningCumNet += net;
      runningCumExpense += exp;
      runningCumIncome += inc;

      if (exp > maxDailyExpense) {
        maxDailyExpense = exp;
        peakExpenseDay = { day: d, amount: exp };
      }

      days.push({
        day: d,
        income: inc,
        expense: exp,
        net,
        cumNet: runningCumNet,
        cumExpense: runningCumExpense,
        cumIncome: runningCumIncome,
        isPositive: net >= 0,
      });
    }

    const minNet = Math.min(0, ...days.map((d) => d.cumNet));
    const maxNet = Math.max(10, ...days.map((d) => d.cumNet));
    const netRange = maxNet - minNet || 10;
    const dailyAvg = maxDay > 0 ? runningCumExpense / maxDay : 0;

    return {
      days,
      totalDays: daysInMonth,
      today: now.getDate(),
      isCurrentMonth,
      peakExpenseDay,
      minNet,
      maxNet,
      netRange,
      latestCumNet: runningCumNet,
      runningCumExpense,
      runningCumIncome,
      dailyAvg,
    };
  }, [selectedPeriodTx, selectedPeriod, currentYear, currentMonth, now]);

  // SVG Arcos para el Gráfico de Pastel / Dona (Ingresos vs Gastos)
  const pieDonutArcs = useMemo(() => {
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const incomeDash = (monthlyPieData.incomePercent * circumference) / 100;
    const expenseDash = (monthlyPieData.expensePercent * circumference) / 100;

    return {
      size,
      strokeWidth,
      radius,
      circumference,
      incomeDash,
      expenseDash,
    };
  }, [monthlyPieData]);

  // Modal SVG Arcos (size 240)
  const modalPieDonutArcs = useMemo(() => {
    const size = 240;
    const strokeWidth = 32;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const incomeDash = (monthlyPieData.incomePercent * circumference) / 100;
    const expenseDash = (monthlyPieData.expensePercent * circumference) / 100;

    return {
      size,
      strokeWidth,
      radius,
      circumference,
      incomeDash,
      expenseDash,
    };
  }, [monthlyPieData]);

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto space-y-4 lg:space-y-5 pb-16 sm:pb-20">
      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        
        {/* PANEL IZQUIERDO: BARRAS DE GASTOS POR CATEGORÍA (DE MAYOR A MENOR) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedModal('categoryBars')}
          className="lg:col-span-6 glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40 flex flex-col justify-between cursor-pointer group hover:border-emerald-500/40 transition-all min-h-[380px] lg:min-h-[420px]"
        >
          {/* Cabecera del Panel de Barras */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <ChartBar size={19} weight="bold" className="text-amber-500 dark:text-amber-400" />
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  GASTOS POR CATEGORÍA
                </h3>
                <span className="hidden sm:inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Mayor a Menor
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedModal('categoryBars');
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                title="Ampliar detalle"
              >
                <ArrowsOutSimple size={13} weight="bold" />
                <span className="hidden sm:inline">Ampliar</span>
              </button>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {selectedPeriod.shortLabel}
              </span>
            </div>
          </div>

          {/* Sub-cabecera con KPI de Gasto Total del período */}
          <div className="flex items-center justify-between py-2 px-3 my-1 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Total gastado en {selectedPeriod.label}:
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
              S/. {categoryExpenses.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Lista de Barras de Categorías Ordenadas de Mayor a Menor */}
          <div className="flex-1 py-1 space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {categoryExpenses.items.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium">
                No hay gastos registrados en {selectedPeriod.label}.
              </div>
            ) : (
              categoryExpenses.items.map((cat, idx) => {
                const IconComp = getCategoryIcon(cat.icon_name);
                return (
                  <div key={idx} className="space-y-1.5 group/item">
                    <div className="flex items-center justify-between text-xs">
                      {/* Izquierda: Rank, Icono y Nombre */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold'
                              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          #{cat.rank}
                        </span>

                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                        >
                          <IconComp size={14} weight="bold" />
                        </div>

                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                          {cat.name}
                        </span>

                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                          ({cat.count} {cat.count === 1 ? 'mov' : 'movs'})
                        </span>
                      </div>

                      {/* Derecha: Monto y Porcentaje */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          S/. {cat.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 min-w-[34px] text-right">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso Visual con el Color Propio de la Categoría */}
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.relativeBarWidth}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.04, ease: 'easeOut' }}
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: cat.color,
                          boxShadow: `0 0 10px ${cat.color}40`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie del Panel */}
          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {categoryExpenses.items.length} {categoryExpenses.items.length === 1 ? 'categoría con gasto' : 'categorías con gasto'}
            </span>
            <span className="text-slate-400 text-[10px]">
              Toca para ver el desglose completo
            </span>
          </div>
        </motion.div>

        {/* COLUMNA DERECHA: PASTEL MENSUAL Y EVOLUCIÓN DIARIA */}
        <div className="lg:col-span-6 space-y-4 lg:space-y-5 flex flex-col justify-between">
          
          {/* PANEL 2: GRÁFICO DE PASTEL (INGRESOS VS EGRESOS CON SELECTOR DE MES Y AÑO) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpandedModal('monthlyPie')}
            className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40 cursor-pointer group hover:border-emerald-500/40 transition-all"
          >
            {/* Cabecera con Selector de Mes y Año Interactivo */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08] mb-2">
              <div className="flex items-center gap-2">
                <ChartPieSlice size={19} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  PASTEL: INGRESOS Y EGRESOS
                </h3>
              </div>

              {/* Selector de Mes con Flechas */}
              <div
                className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-slate-200/80 dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={selectedMonthIndex === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Mes anterior"
                >
                  <CaretLeft size={14} weight="bold" />
                </button>

                <span className="text-xs font-black px-2 text-slate-900 dark:text-white font-mono whitespace-nowrap min-w-[92px] text-center select-none">
                  {selectedPeriod.label}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={selectedMonthIndex === availableMonths.length - 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Mes siguiente"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Contenido del Gráfico de Pastel / Dona */}
            <div className="py-2 flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* Gráfico SVG Circular */}
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                {monthlyPieData.total === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 max-w-[80px]">
                        Sin movimientos en este mes
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                      {/* Fondo neutral de pista */}
                      <circle
                        cx="90"
                        cy="90"
                        r={pieDonutArcs.radius}
                        className="text-slate-200/80 dark:text-white/[0.05]"
                        strokeWidth={pieDonutArcs.strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                      />

                      {/* Arco Ingresos (Verde Pastel) */}
                      {monthlyPieData.income > 0 && (
                        <circle
                          cx="90"
                          cy="90"
                          r={pieDonutArcs.radius}
                          stroke="#34d399"
                          strokeWidth={pieDonutArcs.strokeWidth}
                          strokeDasharray={`${pieDonutArcs.incomeDash} ${pieDonutArcs.circumference}`}
                          strokeDashoffset="0"
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      )}

                      {/* Arco Egresos (Rojo/Coral Pastel) */}
                      {monthlyPieData.expense > 0 && (
                        <circle
                          cx="90"
                          cy="90"
                          r={pieDonutArcs.radius}
                          stroke="#fb7185"
                          strokeWidth={pieDonutArcs.strokeWidth}
                          strokeDasharray={`${pieDonutArcs.expenseDash} ${pieDonutArcs.circumference}`}
                          strokeDashoffset={-pieDonutArcs.incomeDash}
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      )}
                    </svg>

                    {/* Centro con Balance Neto */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none mb-0.5">
                        Balance Neto
                      </span>
                      <span
                        className={`text-base sm:text-lg font-black font-mono leading-tight ${
                          monthlyPieData.net >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {monthlyPieData.net >= 0 ? '+' : ''}S/. {monthlyPieData.net.toFixed(0)}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md mt-0.5 ${
                          monthlyPieData.net > 0
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : monthlyPieData.net < 0
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                        }`}
                      >
                        {monthlyPieData.net > 0 ? 'Superávit' : monthlyPieData.net < 0 ? 'Déficit' : 'Equilibrio'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Leyenda y Desglose de Valores */}
              <div className="w-full sm:w-auto flex-1 space-y-2">
                {/* Caja de Ingresos */}
                <div className="p-2.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#34d399] shrink-0" />
                    <div>
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
                        Ingresos
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {monthlyPieData.incomeCount} {monthlyPieData.incomeCount === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                      +S/. {monthlyPieData.income.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {monthlyPieData.incomePercent.toFixed(1)}% del volumen
                    </span>
                  </div>
                </div>

                {/* Caja de Gastos / Egresos */}
                <div className="p-2.5 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#fb7185] shrink-0" />
                    <div>
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
                        Gastos (Egresos)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {monthlyPieData.expenseCount} {monthlyPieData.expenseCount === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                      -S/. {monthlyPieData.expense.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {monthlyPieData.expensePercent.toFixed(1)}% del volumen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* PANEL 3: GRÁFICO DE LÍNEA DE EVOLUCIÓN DIARIA (SE QUEDA) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpandedModal('gauge')}
            className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40 space-y-3 cursor-pointer group hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ChartLineUp size={19} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  EVOLUCIÓN DIARIA DEL MES
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedModal('gauge');
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                  title="Ampliar detalle"
                >
                  <ArrowsOutSimple size={13} weight="bold" />
                  <span className="hidden sm:inline">Ampliar</span>
                </button>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {selectedPeriod.shortLabel}
                </span>
              </div>
            </div>

            {/* Resumen Superior de Métricas */}
            <div className="flex items-center justify-between text-xs font-bold px-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Balance acumulado:</span>
                <span
                  className={`font-mono font-black ${
                    dailyTimelineData.latestCumNet >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {dailyTimelineData.latestCumNet >= 0 ? '+' : ''}S/. {dailyTimelineData.latestCumNet.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Gasto prom: <strong className="font-mono text-slate-700 dark:text-slate-300">S/. {dailyTimelineData.dailyAvg.toFixed(1)}/d</strong>
              </div>
            </div>

            {/* Gráfico de Línea Interactivo SVG */}
            <div className="relative w-full h-28 sm:h-32 bg-slate-100/60 dark:bg-white/[0.02] rounded-2xl p-2.5 border border-slate-200/60 dark:border-white/[0.04]">
              {dailyTimelineData.days.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                  Sin movimientos registrados en este período
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col justify-between">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 460 100" preserveAspectRatio="none">
                    {/* Línea base horizontal en cero */}
                    {(() => {
                      const yZero =
                        100 -
                        12 -
                        ((0 - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 76;
                      const clampedZero = Math.max(12, Math.min(88, yZero));
                      return (
                        <line
                          x1="16"
                          y1={clampedZero}
                          x2="444"
                          y2={clampedZero}
                          stroke="currentColor"
                          strokeDasharray="3 3"
                          className="text-slate-300 dark:text-white/10"
                          strokeWidth="1"
                        />
                      );
                    })()}

                    {/* Segmentos de Línea día a día */}
                    {dailyTimelineData.days.map((d, i) => {
                      if (i === 0) return null;
                      const prevD = dailyTimelineData.days[i - 1];
                      const n = dailyTimelineData.days.length;
                      const x1 = 16 + ((i - 1) / (n - 1 || 1)) * 428;
                      const y1 =
                        100 -
                        12 -
                        ((prevD.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 76;
                      const x2 = 16 + (i / (n - 1 || 1)) * 428;
                      const y2 =
                        100 -
                        12 -
                        ((d.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 76;

                      const strokeColor = d.net >= 0 ? '#34d399' : '#fb7185';

                      return (
                        <line
                          key={`seg-${d.day}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {/* Puntos por Día */}
                    {dailyTimelineData.days.map((d, i) => {
                      const n = dailyTimelineData.days.length;
                      const x = 16 + (i / (n - 1 || 1)) * 428;
                      const y =
                        100 -
                        12 -
                        ((d.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 76;
                      const isSelected = hoveredDay === d.day;

                      return (
                        <g
                          key={`dot-${d.day}`}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredDay(d.day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          {isSelected && (
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              className={d.net >= 0 ? "fill-emerald-400/20 stroke-[#34d399]" : "fill-rose-400/20 stroke-[#fb7185]"}
                              strokeWidth="1.5"
                            />
                          )}

                          <circle
                            cx={x}
                            cy={y}
                            r={isSelected ? "4.5" : "3.5"}
                            fill={d.net >= 0 ? '#34d399' : '#fb7185'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip flotante interactivo */}
                  {hoveredDay !== null && (() => {
                    const d = dailyTimelineData.days.find((x) => x.day === hoveredDay);
                    if (!d) return null;
                    return (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 px-2 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[9px] font-mono shadow-md border border-zinc-800 dark:border-zinc-200 pointer-events-none flex items-center gap-2 whitespace-nowrap">
                        <span className="font-bold">Día {d.day}:</span>
                        <span className="text-[#34d399]">+{d.income.toFixed(0)}</span>
                        <span className="text-[#fb7185]">-{d.expense.toFixed(0)}</span>
                        <span className="font-black">
                          Flujo: {d.net >= 0 ? '+' : ''}{d.net.toFixed(0)}
                        </span>
                        <span className="opacity-80">
                          (Acum: S/. {d.cumNet.toFixed(0)})
                        </span>
                      </div>
                    );
                  })()}

                  {/* Eje X de Días */}
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-2 pt-1">
                    <span>Día 1</span>
                    <span className="hidden sm:inline">
                      Día {Math.round(dailyTimelineData.days.length / 2)}
                    </span>
                    <span>Día {dailyTimelineData.days[dailyTimelineData.days.length - 1]?.day || 30}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* PORTAL MODAL AMPLIADO PARA ESTADÍSTICAS */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {expandedModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedModal(null)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Contenedor Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative w-full max-w-3xl bg-white dark:bg-[#12141a] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-5 sm:p-7 z-10 my-auto text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto space-y-6"
                >
                  {/* Cabecera del Modal */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        {expandedModal === 'categoryBars' && <ChartBar size={22} weight="bold" className="text-amber-500" />}
                        {expandedModal === 'monthlyPie' && <ChartPieSlice size={22} weight="bold" />}
                        {expandedModal === 'gauge' && <ChartLineUp size={22} weight="bold" />}
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          {expandedModal === 'categoryBars' && `Desglose de Gastos por Categoría - ${selectedPeriod.label}`}
                          {expandedModal === 'monthlyPie' && `Balance de Ingresos y Egresos - ${selectedPeriod.label}`}
                          {expandedModal === 'gauge' && `Evolución Diaria - ${selectedPeriod.label}`}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          {expandedModal === 'categoryBars' && 'Ordenado de mayor a menor gasto para visualizar claramente en qué se gasta más'}
                          {expandedModal === 'monthlyPie' && 'Proporción entre ingresos percibidos y gastos totales del mes seleccionado'}
                          {expandedModal === 'gauge' && 'Trayectoria día a día: superávit en verde, déficit en rojo y picos de gasto'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedModal(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>

                  {/* MODAL 1: BARRAS POR CATEGORÍA AMPLIADAS */}
                  {expandedModal === 'categoryBars' && (
                    <div className="space-y-6">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Gasto Total del Período
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                            S/. {categoryExpenses.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Mayor Categoría de Gasto
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate block">
                            {categoryExpenses.items[0]?.name || 'Ninguna'}
                          </span>
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {categoryExpenses.items[0]?.percentage || 0}% del gasto total
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Operaciones de Gasto
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                            {categoryExpenses.items.reduce((acc, c) => acc + c.count, 0)}{' '}
                            <span className="text-xs text-slate-400 font-sans font-normal">registros</span>
                          </span>
                        </div>
                      </div>

                      {/* Listado Expandido de Barras */}
                      {categoryExpenses.items.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm font-medium">
                          No hay gastos registrados en {selectedPeriod.label}.
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                          {categoryExpenses.items.map((cat, idx) => {
                            const IconComp = getCategoryIcon(cat.icon_name);
                            const avgTicket = cat.count > 0 ? cat.amount / cat.count : 0;
                            return (
                              <div
                                key={idx}
                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                        idx === 0
                                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      #{cat.rank}
                                    </span>

                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                                    >
                                      <IconComp size={18} weight="bold" />
                                    </div>

                                    <div>
                                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">
                                        {cat.name}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        {cat.count} {cat.count === 1 ? 'operación' : 'operaciones'} • Promedio S/. {avgTicket.toFixed(2)}/op
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white block">
                                      S/. {cat.amount.toFixed(2)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                      {cat.percentage}% del total
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden p-0.5">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${cat.relativeBarWidth}%`,
                                      backgroundColor: cat.color,
                                      boxShadow: `0 0 12px ${cat.color}50`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODAL 2: PASTEL INGRESOS VS GASTOS AMPLIADO */}
                  {expandedModal === 'monthlyPie' && (
                    <div className="space-y-6">
                      {/* Selector de Mes dentro del Modal */}
                      <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 max-w-sm mx-auto">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          disabled={selectedMonthIndex === 0}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Mes anterior"
                        >
                          <CaretLeft size={16} weight="bold" />
                        </button>

                        <span className="text-sm font-black px-4 text-slate-900 dark:text-white font-mono select-none">
                          {selectedPeriod.label}
                        </span>

                        <button
                          type="button"
                          onClick={handleNextMonth}
                          disabled={selectedMonthIndex === availableMonths.length - 1}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Mes siguiente"
                        >
                          <CaretRight size={16} weight="bold" />
                        </button>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Total Ingresos
                          </span>
                          <div className="flex items-center gap-1.5">
                            <TrendUp size={16} weight="bold" className="text-emerald-500" />
                            <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                              +S/. {monthlyPieData.income.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Total Gastos
                          </span>
                          <div className="flex items-center gap-1.5">
                            <TrendDown size={16} weight="bold" className="text-rose-500" />
                            <span className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                              -S/. {monthlyPieData.expense.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Balance Neto
                          </span>
                          <span
                            className={`text-lg sm:text-xl font-black font-mono ${
                              monthlyPieData.net >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {monthlyPieData.net >= 0 ? '+' : ''}S/. {monthlyPieData.net.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Gráfico SVG Grande y Comparativa */}
                      {monthlyPieData.total === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm font-medium">
                          No hay ingresos ni gastos registrados en {selectedPeriod.label}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          {/* Gráfico SVG Grande */}
                          <div className="md:col-span-5 flex items-center justify-center">
                            <div className="relative w-60 h-60 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                                <circle
                                  cx="120"
                                  cy="120"
                                  r={modalPieDonutArcs.radius}
                                  className="text-slate-200 dark:text-white/[0.05]"
                                  strokeWidth={modalPieDonutArcs.strokeWidth}
                                  stroke="currentColor"
                                  fill="transparent"
                                />

                                {monthlyPieData.income > 0 && (
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r={modalPieDonutArcs.radius}
                                    stroke="#34d399"
                                    strokeWidth={modalPieDonutArcs.strokeWidth}
                                    strokeDasharray={`${modalPieDonutArcs.incomeDash} ${modalPieDonutArcs.circumference}`}
                                    strokeDashoffset="0"
                                    fill="transparent"
                                    className="transition-all duration-700 ease-out"
                                  />
                                )}

                                {monthlyPieData.expense > 0 && (
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r={modalPieDonutArcs.radius}
                                    stroke="#fb7185"
                                    strokeWidth={modalPieDonutArcs.strokeWidth}
                                    strokeDasharray={`${modalPieDonutArcs.expenseDash} ${modalPieDonutArcs.circumference}`}
                                    strokeDashoffset={-modalPieDonutArcs.incomeDash}
                                    fill="transparent"
                                    className="transition-all duration-700 ease-out"
                                  />
                                )}
                              </svg>

                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                  Flujo Neto
                                </span>
                                <span
                                  className={`text-2xl font-black font-mono leading-tight ${
                                    monthlyPieData.net >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {monthlyPieData.net >= 0 ? '+' : ''}S/. {monthlyPieData.net.toFixed(2)}
                                </span>
                                <span className="text-xs font-bold text-slate-400 mt-1">
                                  {selectedPeriod.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Tabla y Métricas Complementarias */}
                          <div className="md:col-span-7 space-y-3">
                            <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                  Total Ingresos del Mes
                                </span>
                                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                  S/. {monthlyPieData.income.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Representa el {monthlyPieData.incomePercent.toFixed(1)}% del movimiento total de dinero registrado en este mes.
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-rose-700 dark:text-rose-400">
                                  Total Egresos (Gastos) del Mes
                                </span>
                                <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                                  S/. {monthlyPieData.expense.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Representa el {monthlyPieData.expensePercent.toFixed(1)}% del dinero total movilizado durante este período.
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                Tasa de Superávit / Ahorro Potencial:
                              </span>
                              <span
                                className={`text-xs font-black font-mono ${
                                  monthlyPieData.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {monthlyPieData.income > 0
                                  ? `${((monthlyPieData.net / monthlyPieData.income) * 100).toFixed(1)}%`
                                  : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODAL 3: EVOLUCIÓN DIARIA DEL MES AMPLIADA */}
                  {expandedModal === 'gauge' && (
                    <div className="space-y-6">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Pico Más Alto de Gasto
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
                              <FireSimple size={16} weight="fill" />
                            </span>
                            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                              {dailyTimelineData.peakExpenseDay.amount > 0
                                ? `Día ${dailyTimelineData.peakExpenseDay.day}: S/. ${dailyTimelineData.peakExpenseDay.amount.toFixed(2)}`
                                : 'Sin gastos aún'}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Balance Acumulado del Mes
                          </span>
                          <div className="flex items-center gap-2">
                            {dailyTimelineData.latestCumNet >= 0 ? (
                              <TrendUp size={16} weight="bold" className="text-emerald-500" />
                            ) : (
                              <TrendDown size={16} weight="bold" className="text-rose-500" />
                            )}
                            <span
                              className={`text-lg sm:text-xl font-black font-mono ${
                                dailyTimelineData.latestCumNet >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {dailyTimelineData.latestCumNet >= 0 ? '+' : ''}S/. {dailyTimelineData.latestCumNet.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Gasto Promedio Diario
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                            S/. {dailyTimelineData.dailyAvg.toFixed(2)}{' '}
                            <span className="text-xs font-sans text-slate-400 font-normal">/ día</span>
                          </span>
                        </div>
                      </div>

                      {/* Gráfico de Línea Grande */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Trayectoria Día a Día (Día 1 al {dailyTimelineData.days[dailyTimelineData.days.length - 1]?.day || now.getDate()})
                          </span>
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Ganancia / Superávit
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" /> Pérdida / Consumo
                            </span>
                          </div>
                        </div>

                        <div className="relative w-full h-48 sm:h-56 bg-slate-100/50 dark:bg-white/[0.02] rounded-2xl p-4 border border-slate-200/60 dark:border-white/[0.04]">
                          {dailyTimelineData.days.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                              Sin movimientos en este período
                            </div>
                          ) : (
                            <div className="relative w-full h-full flex flex-col justify-between">
                              <svg className="w-full h-full overflow-visible" viewBox="0 0 760 160" preserveAspectRatio="none">
                                {/* Línea base de cero */}
                                {(() => {
                                  const yZero =
                                    160 -
                                    20 -
                                    ((0 - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 120;
                                  const clampedZero = Math.max(20, Math.min(140, yZero));
                                  return (
                                    <line
                                      x1="20"
                                      y1={clampedZero}
                                      x2="740"
                                      y2={clampedZero}
                                      stroke="currentColor"
                                      strokeDasharray="4 4"
                                      className="text-slate-300 dark:text-white/15"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })()}

                                {/* Segmentos de Línea día a día */}
                                {dailyTimelineData.days.map((d, i) => {
                                  if (i === 0) return null;
                                  const prevD = dailyTimelineData.days[i - 1];
                                  const n = dailyTimelineData.days.length;
                                  const x1 = 20 + ((i - 1) / (n - 1 || 1)) * 720;
                                  const y1 =
                                    160 -
                                    20 -
                                    ((prevD.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 120;
                                  const x2 = 20 + (i / (n - 1 || 1)) * 720;
                                  const y2 =
                                    160 -
                                    20 -
                                    ((d.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 120;

                                  const strokeColor = d.net >= 0 ? '#34d399' : '#fb7185';

                                  return (
                                    <line
                                      key={`modal-seg-${d.day}`}
                                      x1={x1}
                                      y1={y1}
                                      x2={x2}
                                      y2={y2}
                                      stroke={strokeColor}
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                    />
                                  );
                                })}

                                {/* Puntos y Marcadores en Modal */}
                                {dailyTimelineData.days.map((d, i) => {
                                  const n = dailyTimelineData.days.length;
                                  const x = 20 + (i / (n - 1 || 1)) * 720;
                                  const y =
                                    160 -
                                    20 -
                                    ((d.cumNet - dailyTimelineData.minNet) / (dailyTimelineData.netRange || 1)) * 120;
                                  const isPeak = d.day === dailyTimelineData.peakExpenseDay.day && d.expense > 0;
                                  const isSelected = hoveredDay === d.day;

                                  return (
                                    <g
                                      key={`modal-dot-${d.day}`}
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredDay(d.day)}
                                      onMouseLeave={() => setHoveredDay(null)}
                                    >
                                      {(isPeak || isSelected) && (
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r={isSelected ? "9" : "8"}
                                          className={isPeak ? "fill-rose-400/20 stroke-[#fb7185] animate-pulse" : "fill-emerald-400/20 stroke-[#34d399]"}
                                          strokeWidth="2"
                                        />
                                      )}
                                      <circle
                                        cx={x}
                                        cy={y}
                                        r={isPeak ? "5.5" : "4"}
                                        fill={d.net >= 0 ? '#34d399' : '#fb7185'}
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                      />
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* Tooltip interactivo en modal */}
                              {hoveredDay !== null && (() => {
                                const d = dailyTimelineData.days.find((x) => x.day === hoveredDay);
                                if (!d) return null;
                                return (
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-mono shadow-xl border border-zinc-800 dark:border-zinc-200 pointer-events-none flex items-center gap-3">
                                    <span className="font-bold">Día {d.day}:</span>
                                    <span className="text-[#34d399] font-bold">+{d.income.toFixed(2)}</span>
                                    <span className="text-[#fb7185] font-bold">-{d.expense.toFixed(2)}</span>
                                    <span className="font-black">
                                      Flujo: {d.net >= 0 ? '+' : ''}{d.net.toFixed(2)}
                                    </span>
                                    <span className="opacity-85 font-black">
                                      (Acum: S/. {d.cumNet.toFixed(2)})
                                    </span>
                                  </div>
                                );
                              })()}

                              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-2 pt-2">
                                <span>Día 1</span>
                                <span>Día {Math.round(dailyTimelineData.days.length / 2)}</span>
                                <span>Día {dailyTimelineData.days[dailyTimelineData.days.length - 1]?.day || 30}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tabla Desglose Diario Pormenorizado */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} weight="bold" className="text-emerald-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Tabla Detallada Día a Día del Mes ({selectedPeriod.label})
                          </h4>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.06] max-h-64 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="sticky top-0 bg-slate-100 dark:bg-[#1a1d26] text-slate-500 font-bold uppercase text-[10px] z-10">
                              <tr>
                                <th className="py-2.5 px-3">Día</th>
                                <th className="py-2.5 px-3 text-right">Ingresos</th>
                                <th className="py-2.5 px-3 text-right">Gastos</th>
                                <th className="py-2.5 px-3 text-right">Flujo del Día</th>
                                <th className="py-2.5 px-3 text-right">Balance Acumulado</th>
                                <th className="py-2.5 px-3 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                              {dailyTimelineData.days.map((d) => {
                                const isPeak = d.day === dailyTimelineData.peakExpenseDay.day && d.expense > 0;
                                return (
                                  <tr
                                    key={d.day}
                                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                                      isPeak ? 'bg-rose-500/[0.06]' : ''
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-mono font-bold flex items-center gap-1.5">
                                      <span>Día {d.day}</span>
                                      {isPeak && (
                                        <span className="inline-flex items-center text-rose-500" title="Día de mayor gasto del mes">
                                          <FireSimple size={14} weight="fill" />
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {d.income > 0 ? `+S/. ${d.income.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                      {d.expense > 0 ? `-S/. ${d.expense.toFixed(2)}` : '-'}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-mono font-black ${
                                        d.net > 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : d.net < 0
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {d.net > 0 ? '+' : ''}
                                      {d.net !== 0 ? `S/. ${d.net.toFixed(2)}` : 'S/. 0.00'}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-mono font-black ${
                                        d.cumNet >= 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {d.cumNet >= 0 ? '+' : ''}S/. {d.cumNet.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {d.net > 0 ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                          Ganancia
                                        </span>
                                      ) : d.net < 0 ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                          Pérdida
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/[0.05] text-slate-400">
                                          Neutro
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

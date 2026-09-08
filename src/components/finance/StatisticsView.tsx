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
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { getCategoryIcon } from '../../constants/iconMap';
import type { Transaction } from '../../types';

export const StatisticsView: React.FC = () => {
  const { wallets, transactions, categories } = useFinance();

  // 1. REGLA ESTRICTA DEL BOCETO 3:
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

  // Transacciones del mes actual de gasto libre
  const currentMonthTx = useMemo(() => {
    return freeTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [freeTransactions, currentYear, currentMonth]);

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

  // Helper para resolver el nombre de categoría correcto (Comida -> Alimentación, Pasajes -> Transporte, 7DS / LootBar -> Entretenimiento)
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

  const [expandedModal, setExpandedModal] = useState<'donut' | 'bars' | 'gauge' | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Cerrar modal al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Desglose por Categoría para el GRÁFICO DE DONA MENSUAL
  const categoryExpenses = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string; icon_name: string; count: number }> = {};

    for (const t of currentMonthTx) {
      if (isSavingsTransfer(t)) continue; // No contar aportes a ahorro como gasto de consumo
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

    const items = Object.values(map).sort((a, b) => b.amount - a.amount);
    const total = items.reduce((acc, cur) => acc + cur.amount, 0);

    return {
      items: items.map((it) => ({
        ...it,
        percentage: total > 0 ? Math.round((it.amount / total) * 100) : 0,
      })),
      total,
    };
  }, [currentMonthTx, categories]);

  // 2. Datos para el GRÁFICO DE BARRAS AGRUPADAS (Últimos 4 meses)
  const monthlyBarData = useMemo(() => {
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mIdx = d.getMonth();
      const yIdx = d.getFullYear();
      const label = d.toLocaleDateString('es-PE', { month: 'short' });

      let inc = 0;
      let exp = 0;

      for (const t of freeTransactions) {
        if (isSavingsTransfer(t)) continue; // No contar transferencias a ahorro en barras
        const td = new Date(t.date);
        if (td.getFullYear() === yIdx && td.getMonth() === mIdx) {
          if (t.type === 'income') inc += Number(t.amount) || 0;
          if (t.type === 'expense') exp += Number(t.amount) || 0;
        }
      }

      months.push({ label, income: inc, expense: exp });
    }

    const maxVal = Math.max(...months.map((m) => Math.max(m.income, m.expense, 100)));

    return { months, maxVal };
  }, [freeTransactions, currentYear, currentMonth]);

  // Resumen acumulado para modal de barras
  const barSummary = useMemo(() => {
    const totalInc = monthlyBarData.months.reduce((acc, m) => acc + m.income, 0);
    const totalExp = monthlyBarData.months.reduce((acc, m) => acc + m.expense, 0);
    const net = totalInc - totalExp;
    const avgInc = totalInc / (monthlyBarData.months.length || 1);
    const avgExp = totalExp / (monthlyBarData.months.length || 1);
    return { totalInc, totalExp, net, avgInc, avgExp };
  }, [monthlyBarData]);

  // 3. Datos de la Evolución Diaria del Mes Actual (Día a Día, Ganancias / Pérdidas y Acumulativo)
  const dailyTimelineData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = now.getDate();
    const maxDay = Math.min(today, daysInMonth);

    const days = [];
    let runningCumNet = 0;
    let runningCumExpense = 0;
    let runningCumIncome = 0;
    let maxDailyExpense = 0;
    let peakExpenseDay = { day: 1, amount: 0 };

    for (let d = 1; d <= maxDay; d++) {
      const dayTxs = currentMonthTx.filter((t) => {
        const td = new Date(t.date);
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
      today,
      peakExpenseDay,
      minNet,
      maxNet,
      netRange,
      latestCumNet: runningCumNet,
      runningCumExpense,
      runningCumIncome,
      dailyAvg,
    };
  }, [currentMonthTx, currentYear, currentMonth, now]);

  // Generar Arcos SVG para el Gráfico de Dona en tarjeta
  const donutArcs = useMemo(() => {
    let cumulativePercent = 0;
    const size = 180;
    const strokeWidth = 26;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return categoryExpenses.items.map((cat) => {
      const strokeDasharray = `${(cat.percentage * circumference) / 100} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent * circumference) / 100);
      cumulativePercent += cat.percentage;
      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
        radius,
        strokeWidth,
      };
    });
  }, [categoryExpenses]);

  // Arcos SVG para el modal agrandado (size 240)
  const modalDonutArcs = useMemo(() => {
    let cumulativePercent = 0;
    const size = 240;
    const strokeWidth = 32;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return categoryExpenses.items.map((cat) => {
      const strokeDasharray = `${(cat.percentage * circumference) / 100} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent * circumference) / 100);
      cumulativePercent += cat.percentage;
      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
        radius,
        strokeWidth,
      };
    });
  }, [categoryExpenses]);

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto space-y-4 lg:space-y-5 pb-16 sm:pb-20">

      {/* Grid de Gráficos idéntico al Boceto 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        {/* PANEL IZQUIERDO: GRÁFICO DE DONA SEGÚN CATEGORÍA (Centrado Óptico) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedModal('donut')}
          className="lg:col-span-6 glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40 flex flex-col justify-between cursor-pointer group hover:border-emerald-500/40 transition-all min-h-[380px] lg:min-h-[400px]"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <ChartPieSlice size={19} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                DONA DE GASTOS POR CATEGORÍA
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedModal('donut');
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                title="Ampliar detalle"
              >
                <ArrowsOutSimple size={13} weight="bold" />
                <span className="hidden sm:inline">Ampliar</span>
              </button>
              <span className="text-xs font-bold text-slate-500">Mes Actual</span>
            </div>
          </div>

          {/* Contenedor Gráfico de Dona SVG Interactivo - CENTRADO VERTICAL PERFECTO */}
          <div className="flex-1 my-auto py-4 flex flex-col items-center justify-center relative min-h-[220px]">
            {categoryExpenses.items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No hay gastos registrados en el mes actual.
              </div>
            ) : (
              <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                  <circle
                    cx="90"
                    cy="90"
                    r="74"
                    className="text-slate-200 dark:text-white/[0.05]"
                    strokeWidth="24"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {donutArcs.map((arc, i) => (
                    <circle
                      key={i}
                      cx="90"
                      cy="90"
                      r={arc.radius}
                      stroke={arc.color}
                      strokeWidth={arc.strokeWidth}
                      strokeDasharray={arc.strokeDasharray}
                      strokeDashoffset={arc.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  ))}
                </svg>

                {/* Centro de la Dona con Total del Mes */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Gasto Total
                  </span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-white leading-tight">
                    S/. {categoryExpenses.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda de Categorías */}
          <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-white/[0.08] max-h-36 sm:max-h-40 overflow-y-auto">
            {categoryExpenses.items.map((cat, idx) => {
              const IconComp = getCategoryIcon(cat.icon_name);
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <IconComp size={13} weight="bold" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                      S/. {cat.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 w-8 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* COLUMNA DERECHA: 2 PANELES APILADOS */}
        <div className="lg:col-span-6 space-y-4 lg:space-y-5 flex flex-col justify-between">
          {/* PANEL 2: BARRAS AGRUPADAS DE GASTOS E INGRESOS MENSUAL */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpandedModal('bars')}
            className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.05] dark:shadow-black/40 cursor-pointer group hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <ChartBar size={19} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  BARRAS AGRUPADAS: GASTOS E INGRESOS
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingreso
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Gasto
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedModal('bars');
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                  title="Ampliar detalle"
                >
                  <ArrowsOutSimple size={13} weight="bold" />
                  <span className="hidden sm:inline">Ampliar</span>
                </button>
              </div>
            </div>

            {/* Gráfico de Barras Agrupadas con Badges Unificados Sin Choques */}
            <div className="h-36 sm:h-40 flex items-end justify-between gap-3 px-2 pt-2">
              {monthlyBarData.months.map((m, idx) => {
                const incHeight = Math.max(6, (m.income / monthlyBarData.maxVal) * 100);
                const expHeight = Math.max(6, (m.expense / monthlyBarData.maxVal) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    {/* Badge Superior Unificado: Cero colisiones */}
                    <div className="flex items-center justify-center gap-1 font-mono font-black text-[9px] bg-slate-100/90 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10 shadow-xs whitespace-nowrap mb-0.5">
                      <span className="text-emerald-500 dark:text-emerald-300">+{m.income.toFixed(0)}</span>
                      <span className="text-slate-400 text-[8px]">/</span>
                      <span className="text-rose-500 dark:text-rose-300">-{m.expense.toFixed(0)}</span>
                    </div>

                    <div className="w-full flex items-end justify-center gap-1.5 h-24 sm:h-28 relative">
                      {/* Barra Ingreso (Verde Pastel) */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${incHeight}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                        title={`Ingresos: S/. ${m.income.toFixed(2)}`}
                        className="w-1/2 max-w-[20px] bg-[#34d399] hover:bg-[#6ee7b7] rounded-t-md shadow-xs cursor-pointer transition-colors"
                      />

                      {/* Barra Gasto (Rojo Pastel) */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${expHeight}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.1 + 0.05 }}
                        title={`Gastos: S/. ${m.expense.toFixed(2)}`}
                        className="w-1/2 max-w-[20px] bg-[#fb7185] hover:bg-[#fda4af] rounded-t-md shadow-xs cursor-pointer transition-colors"
                      />
                    </div>

                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* PANEL 3: GRÁFICO DE LÍNEA DE EVOLUCIÓN DIARIA DEL MES ACTUAL */}
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
                  Sin movimientos registrados este mes
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col justify-between">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 460 100" preserveAspectRatio="none">
                    {/* Línea base horizontal en cero si está en rango */}
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

                    {/* Segmentos de Línea día a día: Verde si ganancia neta, Rojo si pérdida neta */}
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

                    {/* Puntos por Día (Limpio, sin anillo de pico en vista general) */}
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
                          {/* Anillo al seleccionar con cursor */}
                          {isSelected && (
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              className={d.net >= 0 ? "fill-emerald-400/20 stroke-[#34d399]" : "fill-rose-400/20 stroke-[#fb7185]"}
                              strokeWidth="1.5"
                            />
                          )}

                          {/* Punto Principal */}
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

                  {/* Tooltip flotante interactivo para el día hovered */}
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
                        {expandedModal === 'donut' && <ChartPieSlice size={22} weight="bold" />}
                        {expandedModal === 'bars' && <ChartBar size={22} weight="bold" />}
                        {expandedModal === 'gauge' && <ChartLineUp size={22} weight="bold" />}
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          {expandedModal === 'donut' && 'Desglose Integral de Gastos por Categoría'}
                          {expandedModal === 'bars' && 'Comparativa Histórica: Ingresos vs Gastos'}
                          {expandedModal === 'gauge' && 'Evolución Diaria del Mes (Balance & Flujo)'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          {expandedModal === 'donut' && 'Detalle pormenorizado de consumos del mes actual'}
                          {expandedModal === 'bars' && 'Análisis de los últimos 4 meses y balance acumulado'}
                          {expandedModal === 'gauge' && 'Trayectoria día a día: ganancias en verde, pérdidas en rojo y picos de gasto'}
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

                  {/* MODAL 1: DONA AMPLIADA */}
                  {expandedModal === 'donut' && (
                    <div className="space-y-6">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Gasto Total del Mes
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                            S/. {categoryExpenses.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Categoría Predominante
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate block">
                            {categoryExpenses.items[0]?.name || 'Ninguna'}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {categoryExpenses.items[0]?.percentage || 0}% del total
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Transacciones de Gasto
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                            {currentMonthTx.filter((t) => t.type === 'expense').length}{' '}
                            <span className="text-xs text-slate-400 font-sans font-normal">operaciones</span>
                          </span>
                        </div>
                      </div>

                      {categoryExpenses.items.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm font-medium">
                          No hay gastos registrados en el mes actual.
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
                                  r="104"
                                  className="text-slate-200 dark:text-white/[0.05]"
                                  strokeWidth="30"
                                  stroke="currentColor"
                                  fill="transparent"
                                />
                                {modalDonutArcs.map((arc, i) => (
                                  <circle
                                    key={i}
                                    cx="120"
                                    cy="120"
                                    r={arc.radius}
                                    stroke={arc.color}
                                    strokeWidth={arc.strokeWidth}
                                    strokeDasharray={arc.strokeDasharray}
                                    strokeDashoffset={arc.strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    className="transition-all duration-700 ease-out"
                                  />
                                ))}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                  Total Gastado
                                </span>
                                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white leading-tight">
                                  S/. {categoryExpenses.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Detalle Categorías con Barra de Progreso */}
                          <div className="md:col-span-7 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {categoryExpenses.items.map((cat, idx) => {
                              const IconComp = getCategoryIcon(cat.icon_name);
                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                                      >
                                        <IconComp size={16} weight="bold" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                          {cat.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {cat.count} {cat.count === 1 ? 'registro' : 'registros'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white block">
                                        S/. {cat.amount.toFixed(2)}
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-500">
                                        {cat.percentage}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODAL 2: BARRAS AMPLIADAS */}
                  {expandedModal === 'bars' && (
                    <div className="space-y-6">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Ingresos Período (4 meses)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <TrendUp size={16} weight="bold" className="text-emerald-500" />
                            <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                              S/. {barSummary.totalInc.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Gastos Período (4 meses)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <TrendDown size={16} weight="bold" className="text-rose-500" />
                            <span className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                              S/. {barSummary.totalExp.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Balance Neto Acumulado
                          </span>
                          <span
                            className={`text-lg sm:text-xl font-black font-mono ${
                              barSummary.net >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {barSummary.net >= 0 ? '+' : ''}S/. {barSummary.net.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Gráfico de Barras Agrandado */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Evolución Mensual Comparada
                          </span>
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Ingresos
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" /> Gastos
                            </span>
                          </div>
                        </div>

                        <div className="h-56 flex items-end justify-between gap-4 sm:gap-6 px-4 pt-6">
                          {monthlyBarData.months.map((m, idx) => {
                            const incHeight = Math.max(8, (m.income / monthlyBarData.maxVal) * 100);
                            const expHeight = Math.max(8, (m.expense / monthlyBarData.maxVal) * 100);

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                {/* Badge Superior Unificado exactamente como en la vista principal para evitar cualquier colisión */}
                                <div className="flex items-center justify-center gap-1.5 font-mono font-black text-[11px] sm:text-xs bg-white dark:bg-zinc-900 px-2 sm:px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs whitespace-nowrap mb-1">
                                  <span className="text-emerald-500 dark:text-emerald-300">+{m.income.toFixed(0)}</span>
                                  <span className="text-slate-300 dark:text-white/20">/</span>
                                  <span className="text-rose-500 dark:text-rose-300">-{m.expense.toFixed(0)}</span>
                                </div>

                                <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-40">
                                  {/* Barra Ingreso */}
                                  <div className="flex-1 max-w-[32px] sm:max-w-[40px] flex flex-col items-center h-full justify-end">
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: `${incHeight}%` }}
                                      transition={{ duration: 0.5, delay: idx * 0.08 }}
                                      title={`Ingresos: S/. ${m.income.toFixed(2)}`}
                                      className="w-full bg-[#34d399] hover:bg-[#6ee7b7] rounded-t-xl shadow-md shadow-emerald-400/20 cursor-pointer transition-colors"
                                    />
                                  </div>

                                  {/* Barra Gasto */}
                                  <div className="flex-1 max-w-[32px] sm:max-w-[40px] flex flex-col items-center h-full justify-end">
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: `${expHeight}%` }}
                                      transition={{ duration: 0.5, delay: idx * 0.08 + 0.04 }}
                                      title={`Gastos: S/. ${m.expense.toFixed(2)}`}
                                      className="w-full bg-[#fb7185] hover:bg-[#fda4af] rounded-t-xl shadow-md shadow-rose-400/20 cursor-pointer transition-colors"
                                    />
                                  </div>
                                </div>

                                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">
                                  {m.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tabla de Comparativa Numérica */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-white/[0.03] text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-4">Mes</th>
                              <th className="py-2.5 px-4 text-right">Ingresos</th>
                              <th className="py-2.5 px-4 text-right">Gastos</th>
                              <th className="py-2.5 px-4 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                            {monthlyBarData.months.map((m, idx) => {
                              const bal = m.income - m.expense;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-4 font-bold uppercase">{m.label}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    S/. {m.income.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                    S/. {m.expense.toFixed(2)}
                                  </td>
                                  <td
                                    className={`py-2.5 px-4 text-right font-mono font-black ${
                                      bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {bal >= 0 ? '+' : ''}S/. {bal.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
                            Tabla Detallada Día a Día del Mes
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

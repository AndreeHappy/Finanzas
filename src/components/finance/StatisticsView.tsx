import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartPieSlice,
  ChartBar,
  ChartLineUp,
  ArrowsOutSimple,
  X,
  CaretLeft,
  CaretRight,
  FireSimple,
  Sparkle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import type { Transaction } from '../../types';
import { getCategoryIcon } from '../../constants/iconMap';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface MonthPeriod {
  year: number;
  month: number;
  key: string;
  label: string;
  shortLabel: string;
}

// Helper para convertir coordenadas polares a cartesianas en SVG
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper para trazar arcos SVG perfectos de pastel o dona
function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  // Evitar 360 grados exactos que colapsan en SVG
  const sweepAngle = Math.min(359.99, endAngle - startAngle);
  const adjustedEnd = startAngle + sweepAngle;

  const start = polarToCartesian(x, y, outerRadius, adjustedEnd);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const largeArcFlag = sweepAngle <= 180 ? '0' : '1';

  if (innerRadius <= 0) {
    return [
      'M', x, y,
      'L', end.x, end.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, start.x, start.y,
      'Z'
    ].join(' ');
  }

  const innerStart = polarToCartesian(x, y, innerRadius, adjustedEnd);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

  return [
    'M', end.x, end.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, start.x, start.y,
    'L', innerStart.x, innerStart.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
    'Z'
  ].join(' ');
}

// Helper para generar curvas suaves (Catmull-Rom / Spline Bezier) en SVG
function getCurvedPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Helper para generar segmentos individuales coloreados: verde para subida/estable, rojo para bajada
interface CurveSegment {
  d: string;
  color: string;
  type: 'rise' | 'drop' | 'flat';
  fromDay: number;
  toDay: number;
}

function getCurvedSegments(points: { x: number; y: number; cumNet: number; day: number }[]): CurveSegment[] {
  if (points.length < 2) return [];
  const segments: CurveSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

    const delta = p2.cumNet - p1.cumNet;
    let color = '#10b981'; // Verde por defecto (subida o si se mantiene)
    let type: 'rise' | 'drop' | 'flat' = 'flat';

    if (delta > 0.001) {
      color = '#10b981'; // Subida -> Verde
      type = 'rise';
    } else if (delta < -0.001) {
      color = '#f43f5e'; // Bajada -> Rojo
      type = 'drop';
    } else {
      color = '#10b981'; // Se mantiene -> Verde
      type = 'flat';
    }

    segments.push({
      d,
      color,
      type,
      fromDay: p1.day,
      toDay: p2.day,
    });
  }

  return segments;
}

// Tarjeta interactiva con elevación nítida, resplandor dinámico con el cursor y tipografía 100% nítida (sin desenfoque en Windows)
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  allowOverflow?: boolean;
}

const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', onClick, allowOverflow = false }) => {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ${className}`}
      style={{
        transform: 'translateZ(0)',
        WebkitFontSmoothing: 'antialiased',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Resplandor sutil que sigue al cursor con elegancia sin distorsionar ni desenfocar el texto */}
      {mousePos && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0 rounded-3xl overflow-hidden"
          style={{
            background: `radial-gradient(450px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.08), transparent 75%)`,
          }}
        />
      )}
      <div className={`relative z-10 w-full h-full flex flex-col justify-between ${allowOverflow ? 'overflow-visible' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
};

export const StatisticsView: React.FC = () => {
  const { wallets, transactions, categories } = useFinance();

  // Mode toggles
  const [categoryViewMode, setCategoryViewMode] = useState<'bars' | 'pie'>('bars');
  const [comparePreviousMonth, setComparePreviousMonth] = useState(false);

  // Hover states for interactive highlights
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredPieSlice, setHoveredPieSlice] = useState<'income' | 'expense' | null>(null);
  const [hoveredDayPoint, setHoveredDayPoint] = useState<number | null>(null);

  // Modal expand states
  const [expandedModal, setExpandedModal] = useState<'categoryBars' | 'monthlyPie' | 'evolution' | null>(null);

  // Referencias para auto-scroll sincronizado a la categoría resaltada
  const mainCategoryListRef = useRef<HTMLDivElement>(null);
  const modalCategoryListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hoveredCategory) return;

    // Auto-scroll en la lista de la tarjeta principal
    if (mainCategoryListRef.current) {
      const items = Array.from(mainCategoryListRef.current.querySelectorAll<HTMLElement>('[data-category]'));
      const target = items.find((el) => el.getAttribute('data-category') === hoveredCategory);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Auto-scroll en la lista del modal
    if (modalCategoryListRef.current) {
      const items = Array.from(modalCategoryListRef.current.querySelectorAll<HTMLElement>('[data-category]'));
      const target = items.find((el) => el.getAttribute('data-category') === hoveredCategory);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [hoveredCategory]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter transactions for non-savings (free spending)
  const freeSpendingWalletIds = useMemo(() => {
    return new Set(wallets.filter((w) => w.type !== 'savings').map((w) => w.id));
  }, [wallets]);

  const freeTransactions = useMemo(() => {
    return transactions.filter((t) => freeSpendingWalletIds.has(t.wallet_id));
  }, [transactions, freeSpendingWalletIds]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Available months detection
  const availableMonths = useMemo<MonthPeriod[]>(() => {
    const set = new Set<string>();
    const nowKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    set.add(nowKey);

    for (const t of freeTransactions) {
      if (!t.date) continue;
      const key = t.date.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(key)) {
        set.add(key);
      }
    }

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

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    return availableMonths.length > 0 ? availableMonths.length - 1 : 0;
  });

  useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonthIndex(availableMonths.length - 1);
    }
  }, [availableMonths.length]);

  const selectedPeriod = useMemo<MonthPeriod>(() => {
    return (
      availableMonths[selectedMonthIndex] || {
        year: currentYear,
        month: currentMonth,
        key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        label: `${MONTH_NAMES_ES[currentMonth]} ${currentYear}`,
        shortLabel: `${MONTH_NAMES_ES[currentMonth].slice(0, 3)} ${currentYear}`,
      }
    );
  }, [availableMonths, selectedMonthIndex, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (selectedMonthIndex > 0) setSelectedMonthIndex((prev) => prev - 1);
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex < availableMonths.length - 1) setSelectedMonthIndex((prev) => prev + 1);
  };

  // Identificador de transferencias de ahorro que no deben computarse como gasto
  const isSavingsTransfer = (t: Transaction) => {
    const concept = (t.concept || '').toLowerCase();
    const catName = (t.category_name || '').toLowerCase();
    if (concept.includes('7ds') || concept.includes('lootbar')) return false;
    return (
      t.type === 'savings_deposit' ||
      t.type === 'savings_withdrawal' ||
      catName.includes('ahorro') ||
      concept.includes('ahorro') ||
      concept.includes('reposición') ||
      concept.includes('reposicion')
    );
  };

  // Resolver categoría con color e icono exacto
  const resolveStatCategory = (t: Transaction): { name: string; color: string; icon_name: string } => {
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

    return { name: t.category_name || 'Otros Gastos', color: '#64748b', icon_name: 'Coins' };
  };

  // Transacciones del período actual
  const selectedPeriodTx = useMemo(() => {
    return freeTransactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
      return d.getFullYear() === selectedPeriod.year && d.getMonth() === selectedPeriod.month;
    });
  }, [freeTransactions, selectedPeriod]);

  // Transacciones del mes anterior (para comparación)
  const previousPeriod = useMemo(() => {
    let prevYear = selectedPeriod.year;
    let prevMonth = selectedPeriod.month - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    return {
      year: prevYear,
      month: prevMonth,
      label: `${MONTH_NAMES_ES[prevMonth]} ${prevYear}`,
    };
  }, [selectedPeriod]);

  const prevPeriodTx = useMemo(() => {
    return freeTransactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
      return d.getFullYear() === previousPeriod.year && d.getMonth() === previousPeriod.month;
    });
  }, [freeTransactions, previousPeriod]);

  // 1. DESGLOSE DE GASTOS POR CATEGORÍA
  const categoryExpenses = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string; icon_name: string; count: number }> = {};

    for (const t of selectedPeriodTx) {
      if (isSavingsTransfer(t)) continue;
      if (t.type === 'expense') {
        const resolved = resolveStatCategory(t);
        const name = resolved.name;
        if (!map[name]) {
          map[name] = { name, amount: 0, color: resolved.color, icon_name: resolved.icon_name, count: 0 };
        }
        map[name].amount += Number(t.amount) || 0;
        map[name].count += 1;
      }
    }

    const items = Object.values(map).sort((a, b) => b.amount - a.amount);
    const total = items.reduce((acc, cur) => acc + cur.amount, 0);
    const maxAmount = items[0]?.amount || 1;

    const mappedItems = items.map((it, idx) => ({
      ...it,
      rank: idx + 1,
      percentage: total > 0 ? Math.round((it.amount / total) * 100) : 0,
      relativeBarWidth: Math.max(4, Math.round((it.amount / maxAmount) * 100)),
    }));

    return {
      items: mappedItems,
      total,
      maxAmount,
      totalCount: items.reduce((acc, cur) => acc + cur.count, 0),
      topCategory: mappedItems[0] || null,
    };
  }, [selectedPeriodTx, categories]);

  // Escala Numérica para barras
  const barScale = useMemo(() => {
    const maxVal = categoryExpenses.maxAmount;
    if (maxVal <= 0) return { max: 100, ticks: [0, 25, 50, 75, 100] };

    const exponent = Math.floor(Math.log10(maxVal));
    const base = Math.pow(10, exponent);
    const fraction = maxVal / base;

    let niceFraction = 10;
    let numTicks = 5;

    if (fraction <= 1.25) { niceFraction = 1.25; numTicks = 5; }
    else if (fraction <= 1.5) { niceFraction = 1.5; numTicks = 3; }
    else if (fraction <= 2.0) { niceFraction = 2.0; numTicks = 4; }
    else if (fraction <= 2.5) { niceFraction = 2.5; numTicks = 5; }
    else if (fraction <= 3.0) { niceFraction = 3.0; numTicks = 3; }
    else if (fraction <= 4.0) { niceFraction = 4.0; numTicks = 4; }
    else if (fraction <= 5.0) { niceFraction = 5.0; numTicks = 5; }
    else if (fraction <= 6.0) { niceFraction = 6.0; numTicks = 3; }
    else if (fraction <= 8.0) { niceFraction = 8.0; numTicks = 4; }
    else { niceFraction = 10.0; numTicks = 5; }

    const max = Math.round(niceFraction * base);
    const step = max / numTicks;
    const ticks: number[] = [];
    for (let i = 0; i <= numTicks; i++) {
      ticks.push(Math.round(i * step));
    }

    return { max, ticks };
  }, [categoryExpenses.maxAmount]);

  // 2. TOTALES MENSUALES (INGRESOS VS GASTOS)
  const monthlyTotals = useMemo(() => {
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
    const superavitRate = income > 0 ? (net / income) * 100 : 0;

    return {
      income,
      expense,
      incomeCount,
      expenseCount,
      total,
      net,
      incomePercent,
      expensePercent,
      superavitRate,
    };
  }, [selectedPeriodTx]);

  // 3. EVOLUCIÓN DIARIA DEL MES ACTUAL
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
        isPeak: exp === maxDailyExpense && exp > 0,
      });
    }

    const minNet = Math.min(0, ...days.map((d) => d.cumNet));
    const maxNet = Math.max(10, ...days.map((d) => d.cumNet));
    const dailyAvg = maxDay > 0 ? runningCumExpense / maxDay : 0;

    return {
      days,
      totalDays: daysInMonth,
      today: now.getDate(),
      isCurrentMonth,
      peakExpenseDay,
      minNet,
      maxNet,
      latestCumNet: runningCumNet,
      runningCumExpense,
      runningCumIncome,
      dailyAvg,
    };
  }, [selectedPeriodTx, selectedPeriod, currentYear, currentMonth]);

  // Datos del mes anterior para comparativa
  const prevMonthDailyData = useMemo(() => {
    const daysInMonth = new Date(previousPeriod.year, previousPeriod.month + 1, 0).getDate();
    const days = [];
    let runningCumNet = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTxs = prevPeriodTx.filter((t) => {
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
      runningCumNet += (inc - exp);
      days.push({ day: d, cumNet: runningCumNet });
    }
    return days;
  }, [previousPeriod, prevPeriodTx]);

  // Coordenadas para la gráfica de curva SVG de Evolución Diaria
  const svgTimelineCoords = useMemo(() => {
    const days = dailyTimelineData.days;
    if (days.length === 0) return { currentPoints: [], prevPoints: [], minVal: 0, maxVal: 100, zeroY: 100, width: 800, height: 220, maxDailyTx: 1 };

    const allValues = [...days.map((d) => d.cumNet)];
    if (comparePreviousMonth && prevMonthDailyData.length > 0) {
      allValues.push(...prevMonthDailyData.map((d) => d.cumNet));
    }

    const minVal = Math.min(0, ...allValues) - 20;
    const maxVal = Math.max(20, ...allValues) + 20;
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 220;
    const paddingX = 30;
    const paddingY = 25;

    const totalDays = Math.max(days.length, comparePreviousMonth ? prevMonthDailyData.length : days.length);
    const maxDailyTx = Math.max(1, ...days.map((d) => Math.max(d.income || 0, d.expense || 0)));

    const currentPoints = days.map((d, i) => {
      const x = paddingX + (i / Math.max(1, totalDays - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((d.cumNet - minVal) / range) * (height - paddingY * 2);
      return {
        x,
        y,
        day: d.day,
        cumNet: d.cumNet,
        net: d.net,
        income: d.income || 0,
        expense: d.expense || 0,
        isPeak: d.isPeak,
      };
    });

    const prevPoints = prevMonthDailyData.slice(0, totalDays).map((d, i) => {
      const x = paddingX + (i / Math.max(1, totalDays - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((d.cumNet - minVal) / range) * (height - paddingY * 2);
      return { x, y, day: d.day, cumNet: d.cumNet };
    });

    const zeroY = height - paddingY - ((0 - minVal) / range) * (height - paddingY * 2);

    return { currentPoints, prevPoints, minVal, maxVal, zeroY, width, height, maxDailyTx };
  }, [dailyTimelineData.days, prevMonthDailyData, comparePreviousMonth]);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1540px] mx-auto space-y-4 lg:space-y-5 pb-20">
      {/* 1. HEADER PRINCIPAL: ÚNICAMENTE SELECTOR DE MES */}
      <div className="flex items-center justify-end pb-1">
        {/* Controles de Navegación del Mes */}
        <div className="flex items-center gap-1.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 p-1.5 rounded-2xl shadow-md">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={selectedMonthIndex === 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white dark:text-zinc-950 hover:bg-white/20 dark:hover:bg-zinc-950/10 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mes anterior"
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <span className="px-3 text-xs sm:text-sm font-black font-mono tracking-wider whitespace-nowrap min-w-[140px] text-center select-none">
            {selectedPeriod.label}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={selectedMonthIndex === availableMonths.length - 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white dark:text-zinc-950 hover:bg-white/20 dark:hover:bg-zinc-950/10 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mes siguiente"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL DE GRÁFICOS: AJUSTADO Y RESPONSIVE (SIN DESBORDAMIENTO VERTICAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        
        {/* PANEL IZQUIERDO: GASTOS POR CATEGORÍA (BARRAS O PASTEL SEGÚN SWITCHER) */}
        <TiltCard
          className="lg:col-span-7 glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 flex flex-col justify-between border border-slate-200/80 dark:border-white/[0.08] relative group cursor-pointer"
          onClick={() => setExpandedModal('categoryBars')}
        >
          {/* Header con Switcher [Barras | Pastel] y Botón Ampliar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <ChartBar size={20} weight="bold" className="text-emerald-500 shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  GASTOS POR CATEGORÍA
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Switcher [Barras | Pastel] */}
              <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('bars')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    categoryViewMode === 'bars'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ChartBar size={13} weight="bold" />
                  <span>Barras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('pie')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    categoryViewMode === 'pie'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ChartPieSlice size={13} weight="bold" />
                  <span>Pastel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setExpandedModal('categoryBars')}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                title="Ampliar a pantalla completa con detalles"
              >
                <ArrowsOutSimple size={13} weight="bold" />
                <span className="hidden sm:inline">Ampliar</span>
              </button>
            </div>
          </div>

          {/* Sub-header compacto: Resumen en 1 sola fila elegante */}
          <div className="flex items-center justify-between text-xs py-1.5 px-1 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-white/[0.04]">
            <span className="font-mono font-bold">
              Total: <strong className="text-slate-950 dark:text-white font-black">S/. {categoryExpenses.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-[11px]">
              Top: <strong className="text-amber-500 font-bold">{categoryExpenses.topCategory?.name || 'Ninguno'} ({categoryExpenses.topCategory?.percentage || 0}%)</strong>
            </span>
            <span className="text-[11px] font-mono">
              {categoryExpenses.totalCount} compras
            </span>
          </div>

          {/* CUERPO DEL GRÁFICO (BARRAS O PASTEL) */}
          <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
            {categoryExpenses.items.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs font-medium my-auto">
                No hay gastos registrados en {selectedPeriod.label}.
              </div>
            ) : categoryViewMode === 'bars' ? (
              /* MODO 1: BARRAS HORIZONTALES ROBUSTAS COMPACTAS CON ICONOS REALES */
              <div className="relative w-full flex-1 flex flex-col justify-between min-h-0">
                {/* Cuadrícula de Fondo */}
                <div className="absolute inset-0 left-28 sm:left-36 right-3 bottom-6 pointer-events-none z-0">
                  <div className="relative w-full h-full">
                    {barScale.ticks.map((tick, i) => {
                      const leftPct = (tick / barScale.max) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-r border-slate-200/80 dark:border-white/[0.06]"
                          style={{ left: `${leftPct}%` }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Filas de Categorías: Ocupa todo el alto disponible del cuadro sin espacios muertos */}
                <div className="relative z-10 flex-1 flex flex-col gap-1.5 sm:gap-2 py-1 pr-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
                  {categoryExpenses.items.map((cat, idx) => {
                    const IconComp = getCategoryIcon(cat.icon_name || cat.name);
                    const barWidth = Math.max(4, Math.min(100, (cat.amount / barScale.max) * 100));
                    const isHovered = hoveredCategory === cat.name;
                    const isAnyHovered = hoveredCategory !== null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 group cursor-pointer transition-opacity"
                        onMouseEnter={() => setHoveredCategory(cat.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        style={{
                          opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 1,
                        }}
                      >
                        {/* Categoría a la izquierda */}
                        <div className="w-28 sm:w-36 flex items-center justify-end gap-2 shrink-0 text-right pr-2">
                          <span
                            className={`text-xs font-bold truncate transition-colors ${
                              isHovered ? 'text-slate-950 dark:text-white scale-105' : 'text-slate-800 dark:text-slate-200'
                            }`}
                            title={cat.name}
                          >
                            {cat.name}
                          </span>
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          >
                            <IconComp size={15} weight="bold" />
                          </div>
                        </div>

                        {/* Barra Horizontal */}
                        <div className="flex-1 flex items-center relative pr-2 min-w-0">
                          <div className="w-full flex items-center relative h-6 sm:h-7">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.02, ease: 'easeOut' }}
                              className={`h-full rounded-r-xl transition-all duration-200 flex items-center justify-end pr-2 shrink-0 min-w-[8px] ${
                                isHovered
                                  ? 'brightness-125 scale-y-105 drop-shadow-md ring-2 ring-white/60'
                                  : 'hover:brightness-110'
                              }`}
                              style={{
                                backgroundColor: cat.color,
                                boxShadow: isHovered ? `0 0 16px ${cat.color}95` : undefined,
                              }}
                              title={`${cat.name}: S/. ${cat.amount.toFixed(2)} (${cat.percentage}%)`}
                            >
                              {barWidth >= 40 && (
                                <span className="text-[10px] sm:text-[11px] font-mono font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap pr-1">
                                  S/. {cat.amount.toFixed(2)} ({cat.percentage}%)
                                </span>
                              )}
                            </motion.div>

                            {barWidth < 40 && (
                              <span className="ml-2 text-[10px] sm:text-[11px] font-mono font-black text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0">
                                S/. {cat.amount.toFixed(2)} ({cat.percentage}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Eje X Numérico */}
                <div className="mt-1 pt-1.5 border-t border-slate-200 dark:border-white/10 flex items-center pl-28 sm:pl-36 pr-3 shrink-0">
                  <div className="relative w-full h-4">
                    {barScale.ticks.map((tick, i) => {
                      const leftPct = (tick / barScale.max) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 flex flex-col items-center"
                          style={{
                            left: `${leftPct}%`,
                            transform: i === 0 ? 'none' : i === barScale.ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                          }}
                        >
                          <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 select-none">
                            S/. {tick}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* MODO 2: GRÁFICO PASTEL 100% RELLENO CON BURBUJA DE PENSAMIENTO Y RESALTADO VÍVIDO (50% - 55% DEL CUADRO) */
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-5 py-2 w-full flex-1 min-h-0">
                {/* SVG Pie Chart de Categorías Totalmente Relleno: 50% - 55% del contenedor */}
                <div className="relative w-full md:w-[52%] lg:w-[55%] flex items-center justify-center shrink-0 py-2">
                  <svg
                    viewBox="0 0 300 300"
                    className="w-full max-w-[270px] sm:max-w-[310px] xl:max-w-[330px] aspect-square overflow-visible"
                  >
                    {(() => {
                      let currentAngle = 0;
                      const total = categoryExpenses.total || 1;
                      return categoryExpenses.items.map((cat, idx) => {
                        const sliceAngle = (cat.amount / total) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + sliceAngle;
                        currentAngle += sliceAngle;

                        const isHovered = hoveredCategory === cat.name;
                        const isAnyHovered = hoveredCategory !== null;

                        const midAngle = startAngle + sliceAngle / 2;
                        const midRad = ((midAngle - 90) * Math.PI) / 180;
                        const shiftX = isHovered ? Math.cos(midRad) * 8 : 0;
                        const shiftY = isHovered ? Math.sin(midRad) * 8 : 0;

                        // Relleno 100% sólido: innerRadius = 0, centro (150, 150)
                        const pathD = describeArc(150, 150, 0, isHovered ? 142 : 132, startAngle, endAngle);

                        return (
                          <g
                            key={idx}
                            style={{
                              transform: `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px)`,
                              transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                          >
                            {sliceAngle >= 359.9 ? (
                              <circle
                                cx={150}
                                cy={150}
                                r={isHovered ? 142 : 132}
                                fill={cat.color}
                                className="cursor-pointer"
                                style={{
                                  filter: isHovered ? `drop-shadow(0 0 18px ${cat.color}95)` : undefined,
                                }}
                                onMouseEnter={() => setHoveredCategory(cat.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              />
                            ) : (
                              <path
                                d={pathD}
                                fill={cat.color}
                                className="cursor-pointer"
                                style={{
                                  filter: isHovered
                                    ? `drop-shadow(0 0 18px ${cat.color}95)`
                                    : undefined,
                                  opacity: isHovered ? 1 : isAnyHovered ? 0.32 : 1,
                                  transition: 'filter 0.22s ease, opacity 0.22s ease',
                                }}
                                onMouseEnter={() => setHoveredCategory(cat.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              />
                            )}
                          </g>
                        );
                      });
                    })()}
                  </svg>

                  {/* BURBUJA TIPO PENSAMIENTO FLOTANTE CON TIPOGRAFÍA NÍTIDA Y ALTO CONTRASTE */}
                  <AnimatePresence>
                    {hoveredCategory && (() => {
                      const item = categoryExpenses.items.find((c) => c.name === hoveredCategory);
                      if (!item) return null;
                      const IconComp = getCategoryIcon(item.icon_name || item.name);
                      return (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, scale: 0.85, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -6 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                        >
                          <div className="relative bg-slate-900/95 dark:bg-black/95 text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-white/25 backdrop-blur-xl flex items-center gap-3 whitespace-nowrap">
                            {/* Cola de burbuja de pensamiento */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 dark:bg-black/95 border-r border-b border-white/25 rotate-45" />

                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                              style={{ backgroundColor: `${item.color}35`, color: item.color }}
                            >
                              <IconComp size={16} weight="bold" />
                            </div>

                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-black uppercase tracking-wider text-white">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black font-mono text-white">
                                  S/. {item.amount.toFixed(2)}
                                </span>
                                <span
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono"
                                  style={{ backgroundColor: `${item.color}40`, color: item.color }}
                                >
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>

                {/* Leyenda lateral con Iconos y Porcentajes, Auto-Scroll y Resaltado Nítido */}
                <div
                  ref={mainCategoryListRef}
                  className="flex flex-col gap-1.5 w-full md:w-[48%] lg:w-[45%] flex-1 h-full min-h-[280px] max-h-[360px] xl:max-h-[400px] overflow-y-auto overflow-x-hidden p-2 pr-1.5 scrollbar-thin"
                >
                  {categoryExpenses.items.map((cat, idx) => {
                    const IconComp = getCategoryIcon(cat.icon_name || cat.name);
                    const isHovered = hoveredCategory === cat.name;
                    const isAnyHovered = hoveredCategory !== null;

                    return (
                      <div
                        key={idx}
                        data-category={cat.name}
                        className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none ${
                          isHovered
                            ? 'border-l-4 shadow-lg translate-x-0.5 ring-1 ring-slate-900/10 dark:ring-white/10'
                            : isAnyHovered
                            ? 'border-transparent opacity-30'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                        style={{
                          borderLeftColor: isHovered ? cat.color : 'transparent',
                          backgroundColor: isHovered ? `${cat.color}15` : undefined,
                          boxShadow: isHovered ? `0 0 16px ${cat.color}35` : undefined,
                        }}
                        onMouseEnter={() => setHoveredCategory(cat.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          >
                            <IconComp size={15} weight="bold" />
                          </div>
                          <span
                            className={`text-xs truncate transition-colors ${
                              isHovered
                                ? 'font-black text-slate-950 dark:text-white scale-105'
                                : 'font-bold text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                          <span className={`font-black ${isHovered ? 'text-slate-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            S/. {cat.amount.toFixed(0)}
                          </span>
                          <span
                            className="text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono"
                            style={{
                              backgroundColor: isHovered ? `${cat.color}35` : undefined,
                              color: isHovered ? cat.color : undefined,
                            }}
                          >
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TiltCard>

        {/* COLUMNA DERECHA: PASTEL INGRESOS/GASTOS & EVOLUCIÓN DIARIA CURVADA */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 sm:gap-4">
          
          {/* PANEL 2: PASTEL SOLIDO DE INGRESOS Y GASTOS (CON TILT Y HOVER ANIMADO) */}
          <TiltCard
            className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 border border-slate-200/80 dark:border-white/[0.08] cursor-pointer"
            onClick={() => setExpandedModal('monthlyPie')}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/[0.08] mb-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <ChartPieSlice size={19} weight="bold" className="text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  INGRESOS Y GASTOS
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setExpandedModal('monthlyPie')}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] transition-colors cursor-pointer"
                title="Ampliar gráfico"
              >
                <ArrowsOutSimple size={12} weight="bold" />
              </button>
            </div>

            {/* Gráfico de Pastel Sólido e Interactivo */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
              <div className="relative flex items-center justify-center shrink-0 w-44 h-44">
                <svg width="176" height="176" viewBox="0 0 176 176" className="overflow-visible">
                  {(() => {
                    const total = monthlyTotals.total || 1;
                    const incAngle = (monthlyTotals.income / total) * 360;

                    const incHover = hoveredPieSlice === 'income';
                    const expHover = hoveredPieSlice === 'expense';

                    const incPath = describeArc(88, 88, 0, incHover ? 80 : 74, 0, incAngle);
                    const expPath = describeArc(88, 88, 0, expHover ? 80 : 74, incAngle, 360);

                    return (
                      <>
                        {monthlyTotals.income > 0 && (
                          <path
                            d={incPath}
                            fill="#10b981"
                            className="cursor-pointer transition-all duration-200"
                            style={{
                              filter: incHover ? 'drop-shadow(0 0 16px rgba(16,185,129,0.95))' : undefined,
                              transform: incHover ? 'scale(1.04)' : 'scale(1)',
                              transformOrigin: '88px 88px',
                            }}
                            onMouseEnter={() => setHoveredPieSlice('income')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                          />
                        )}
                        {monthlyTotals.expense > 0 && (
                          <path
                            d={expPath}
                            fill="#f43f5e"
                            className="cursor-pointer transition-all duration-200"
                            style={{
                              filter: expHover ? 'drop-shadow(0 0 16px rgba(244,63,94,0.95))' : undefined,
                              transform: expHover ? 'scale(1.04)' : 'scale(1)',
                              transformOrigin: '88px 88px',
                            }}
                            onMouseEnter={() => setHoveredPieSlice('expense')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Badges de Ingresos y Gastos con Resaltado Interactivo Sincronizado */}
              <div className="flex flex-col gap-2.5 w-full sm:w-auto flex-1">
                <div
                  onMouseEnter={() => setHoveredPieSlice('income')}
                  onMouseLeave={() => setHoveredPieSlice(null)}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer select-none ${
                    hoveredPieSlice === 'income'
                      ? 'bg-emerald-500/25 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20 scale-[1.03]'
                      : 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft size={16} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">Ingresos</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                      +S/. {monthlyTotals.income.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {monthlyTotals.incomePercent.toFixed(1)}% ({monthlyTotals.incomeCount} ops)
                    </span>
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredPieSlice('expense')}
                  onMouseLeave={() => setHoveredPieSlice(null)}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer select-none ${
                    hoveredPieSlice === 'expense'
                      ? 'bg-rose-500/25 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20 scale-[1.03]'
                      : 'bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight size={16} weight="bold" className="text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">Gastos</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 block">
                      -S/. {monthlyTotals.expense.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {monthlyTotals.expensePercent.toFixed(1)}% ({monthlyTotals.expenseCount} ops)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* PANEL 3: EVOLUCIÓN DIARIA CURVADA CON BARRAS DE INGRESO/GASTO Y BURBUJA INTERACTIVA */}
          <TiltCard
            allowOverflow={true}
            className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 border border-slate-200/80 dark:border-white/[0.08] cursor-pointer"
            onClick={() => setExpandedModal('evolution')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/[0.08] mb-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <ChartLineUp size={19} weight="bold" className="text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  EVOLUCIÓN DIARIA
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Leyenda visual de trayectoria */}
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Subida / Estable
                  </span>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Bajada
                  </span>
                </div>

                {/* Botón para comparar con mes anterior */}
                <button
                  type="button"
                  onClick={() => setComparePreviousMonth((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    comparePreviousMonth
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs font-black'
                      : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Comparar trayectoria con el mes anterior"
                >
                  <ArrowsLeftRight size={12} weight="bold" />
                  <span className="hidden md:inline">Comparar mes ant.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedModal('evolution')}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Ampliar gráfico y ver tabla día a día"
                >
                  <ArrowsOutSimple size={12} weight="bold" />
                </button>
              </div>
            </div>

            {/* Gráfico de Líneas Curvas SVG con Alto Contraste (Sin barras distractoras) */}
            <div className="w-full relative py-1 overflow-visible">
              <div className="relative w-full h-40">
                <svg
                  viewBox={`0 0 ${svgTimelineCoords.width} ${svgTimelineCoords.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                  onMouseLeave={() => setHoveredDayPoint(null)}
                >
                  {/* Línea horizontal de referencia cero */}
                  <line
                    x1="20"
                    y1={svgTimelineCoords.zeroY}
                    x2={svgTimelineCoords.width - 20}
                    y2={svgTimelineCoords.zeroY}
                    stroke="currentColor"
                    className="text-slate-300 dark:text-white/15"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />

                  {/* Línea curva del Mes Anterior (si está activa la comparativa) */}
                  {comparePreviousMonth && svgTimelineCoords.prevPoints.length > 0 && (
                    <path
                      d={getCurvedPath(svgTimelineCoords.prevPoints)}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.2"
                      strokeDasharray="5 5"
                      className="opacity-70"
                    />
                  )}

                  {/* Segmentos Curvos Coloreados: Verde para Subida / Estable, Rojo para Bajada */}
                  {getCurvedSegments(svgTimelineCoords.currentPoints).map((seg, idx) => (
                    <path
                      key={`seg-${idx}`}
                      d={seg.d}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-xs"
                    />
                  ))}

                  {/* Líneas guía verticales en hover */}
                  {svgTimelineCoords.currentPoints.map((pt, i) => {
                    const isHovered = hoveredDayPoint === pt.day;
                    if (!isHovered) return null;
                    return (
                      <line
                        key={`line-${i}`}
                        x1={pt.x}
                        y1={0}
                        x2={pt.x}
                        y2={svgTimelineCoords.height - 18}
                        stroke="#6366f1"
                        strokeWidth="1.8"
                        strokeDasharray="3 3"
                        className="opacity-80"
                      />
                    );
                  })}

                  {/* Columnas transparentes de área de interacción completa (evita pixel hunting) */}
                  {svgTimelineCoords.currentPoints.map((pt, i) => {
                    const colWidth = (svgTimelineCoords.width - 40) / Math.max(1, svgTimelineCoords.currentPoints.length - 1);
                    return (
                      <rect
                        key={`hit-${i}`}
                        x={pt.x - colWidth / 2}
                        y={0}
                        width={colWidth}
                        height={svgTimelineCoords.height}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayPoint(pt.day)}
                      />
                    );
                  })}
                </svg>

                {/* Puntos 100% Redondos sin distorsión de aspecto */}
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {svgTimelineCoords.currentPoints.map((pt, i) => {
                    const isHovered = hoveredDayPoint === pt.day;
                    const prevPt = i > 0 ? svgTimelineCoords.currentPoints[i - 1] : null;
                    const delta = prevPt ? pt.cumNet - prevPt.cumNet : 0;
                    const ptColor = delta < -0.001 ? '#f43f5e' : '#10b981';
                    const size = isHovered ? 12 : pt.isPeak ? 9.5 : 7;

                    return (
                      <div
                        key={`dot-card-${i}`}
                        className="absolute rounded-full border border-slate-900 dark:border-white transition-all duration-150"
                        style={{
                          left: `${(pt.x / svgTimelineCoords.width) * 100}%`,
                          top: `${(pt.y / svgTimelineCoords.height) * 100}%`,
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: ptColor,
                          transform: 'translate(-50%, -50%)',
                          boxShadow: isHovered ? `0 0 10px ${ptColor}` : undefined,
                          zIndex: isHovered ? 25 : 10,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* BURBUJA TIPO PENSAMIENTO FLOTANTE SOBREPUESTA: VISIBLE, NÍTIDA, DE ALTO CONTRASTE Y ALINEADA EXACTAMENTE AL DÍA */}
              <AnimatePresence>
                {hoveredDayPoint !== null && (() => {
                  const pt = svgTimelineCoords.currentPoints.find((p) => p.day === hoveredDayPoint);
                  if (!pt) return null;
                  const xPct = (pt.x / svgTimelineCoords.width) * 100;
                  // Mantener el cuerpo de la burbuja visible dentro de los márgenes sin cortarse
                  const bubbleLeft = Math.max(18, Math.min(82, xPct));
                  // Desplazar la flecha/cola para que apunte con 100% de precisión matemática al punto real (ej. día 6 o día 18)
                  const tailOffsetPct = Math.max(12, Math.min(88, 50 + (xPct - bubbleLeft) * 2.2));

                  return (
                    <motion.div
                      key={pt.day}
                      initial={{ opacity: 0, scale: 0.9, y: -6, x: '-50%' }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, scale: 0.9, y: -6, x: '-50%' }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                      style={{
                        left: `${bubbleLeft}%`,
                        top: '-30px',
                      }}
                      className="absolute z-50 pointer-events-none"
                    >
                      <div className="relative bg-white/98 dark:bg-[#0c0d14]/98 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.7)] border border-slate-200 dark:border-white/20 backdrop-blur-2xl flex flex-col gap-1.5 min-w-[200px] text-left">
                        {/* Puntero / Flecha apuntando exactamente hacia abajo hacia la línea vertical guía */}
                        <div
                          className="absolute -bottom-1.5 w-3 h-3 bg-white/98 dark:bg-[#0c0d14]/98 border-r border-b border-slate-200 dark:border-white/20 rotate-45 shadow-xs"
                          style={{
                            left: `${tailOffsetPct}%`,
                            transform: 'translateX(-50%) rotate(45deg)',
                          }}
                        />

                        {/* Cabecera del día con Badge de Superávit / Déficit */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-1.5 gap-2">
                          <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            Día {pt.day} • {selectedPeriod.shortLabel}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                              pt.net >= 0
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {pt.net >= 0 ? '+' : ''}S/. {pt.net.toFixed(2)}
                          </span>
                        </div>

                        {/* Detalle de Movimientos del Día con Tipografía de Alto Contraste y Colores Vivos */}
                        {pt.income > 0 && (
                          <div className="flex items-center justify-between text-xs font-mono py-0.5">
                            <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                              Ingreso:
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              +S/. {pt.income.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {pt.expense > 0 && (
                          <div className="flex items-center justify-between text-xs font-mono py-0.5">
                            <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
                              Gasto:
                            </span>
                            <span className="font-black text-rose-600 dark:text-rose-400">
                              -S/. {pt.expense.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {pt.income === 0 && pt.expense === 0 && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic py-0.5">
                            Sin movimientos directos
                          </div>
                        )}

                        {/* Saldo Acumulado */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-white/10">
                          <span className="text-[10px] font-bold">Saldo acumulado:</span>
                          <span
                            className={`font-black ${
                              pt.cumNet >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {pt.cumNet >= 0 ? '+' : ''}S/. {pt.cumNet.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Leyenda y Estadísticas de la trayectoria */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1.5 border-t border-slate-100 dark:border-white/[0.04]">
                <span className="font-mono">
                  Acumulado: <strong className={dailyTimelineData.latestCumNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {dailyTimelineData.latestCumNet >= 0 ? '+' : ''}S/. {dailyTimelineData.latestCumNet.toFixed(1)}
                  </strong>
                </span>

                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <FireSimple size={12} weight="fill" className="text-rose-500" />
                  Pico: Día {dailyTimelineData.peakExpenseDay.day} (S/. {dailyTimelineData.peakExpenseDay.amount.toFixed(0)})
                </span>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>

      {/* 3. MODALES AMPLIADOS EN ALTA RESOLUCIÓN Y PANTALLA DIVIDIDA (MASTER-DETAIL) */}
      {typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <AnimatePresence>
            {expandedModal && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
                onClick={() => setExpandedModal(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-6xl bg-white dark:bg-[#12141a] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto space-y-6 my-auto"
                >
                  {/* Cabecera del Modal */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-md shrink-0">
                        {expandedModal === 'categoryBars' && <ChartBar size={22} weight="bold" />}
                        {expandedModal === 'monthlyPie' && <ChartPieSlice size={22} weight="bold" />}
                        {expandedModal === 'evolution' && <ChartLineUp size={22} weight="bold" />}
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          {expandedModal === 'categoryBars' && `Desglose de Gastos por Categoría – ${selectedPeriod.label}`}
                          {expandedModal === 'monthlyPie' && `Balance de Ingresos vs Gastos & Tasa de Superávit – ${selectedPeriod.label}`}
                          {expandedModal === 'evolution' && `Evolución Diaria del Mes – ${selectedPeriod.label}`}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {expandedModal === 'categoryBars' && (
                        <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setCategoryViewMode('bars')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              categoryViewMode === 'bars'
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Barras
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryViewMode('pie')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              categoryViewMode === 'pie'
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Pastel
                          </button>
                        </div>
                      )}

                      {expandedModal === 'evolution' && (
                        <div className="flex items-center gap-2">
                          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Subida / Estable
                            </span>
                            <span className="text-slate-300 dark:text-white/20">•</span>
                            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Bajada
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setComparePreviousMonth((prev) => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              comparePreviousMonth
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs font-black'
                                : 'bg-slate-100 dark:bg-white/[0.06] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                            }`}
                          >
                            <ArrowsLeftRight size={13} weight="bold" />
                            <span>{comparePreviousMonth ? 'Ocultar comparativa' : 'Comparar con mes anterior'}</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedModal(null)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <X size={20} weight="bold" />
                      </button>
                    </div>
                  </div>

                  {/* MODAL 1: GASTOS POR CATEGORÍA (MASTER-DETAIL PANTALLA DIVIDIDA FIEL A IMAGEN 1) */}
                  {expandedModal === 'categoryBars' && (
                    <div className="space-y-5">
                      {/* Fila Superior de Métricas Clave (Fiel a Imagen 1) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                        <div className="lg:col-span-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                          <span className="text-xs font-bold text-slate-400 block mb-1">Gasto Total del Período</span>
                          <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                            S/. {categoryExpenses.total.toFixed(2)}
                          </span>
                        </div>

                        <div className="lg:col-span-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                          <span className="text-xs font-bold text-slate-400 block mb-1">Operaciones de Gasto</span>
                          <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                            {categoryExpenses.totalCount} registros
                          </span>
                        </div>

                        <div className="lg:col-span-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">Mayor Categoría de Gasto</span>
                          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-0.5">
                            {categoryExpenses.topCategory?.name || 'Ninguna'}
                          </span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            S/. {categoryExpenses.topCategory?.amount.toFixed(2)} ({categoryExpenses.topCategory?.percentage}% del gasto total)
                          </span>
                        </div>
                      </div>

                      {/* 2 Columnas: Gráfico a la izquierda y Lista a la derecha */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Lado Izquierdo: Gráfica Amplia (Barras o Pastel) */}
                        <div className="lg:col-span-7">
                          {categoryViewMode === 'bars' ? (
                            <div className="relative p-4 sm:p-5 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-200/80 dark:border-white/10 min-h-[340px]">
                              {/* Barras completas ampliadas (25% más compactas para visualización óptima) */}
                              <div className="relative w-full space-y-2.5 sm:space-y-3 pr-2">
                                {categoryExpenses.items.map((cat, idx) => {
                                  const IconComp = getCategoryIcon(cat.icon_name || cat.name);
                                  const barWidth = Math.max(4, Math.min(100, (cat.amount / barScale.max) * 100));
                                  const isHovered = hoveredCategory === cat.name;
                                  const isAnyHovered = hoveredCategory !== null;

                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-2 group cursor-pointer transition-all duration-200 ${
                                        isHovered
                                          ? 'scale-[1.01]'
                                          : isAnyHovered
                                          ? 'opacity-40'
                                          : 'opacity-100'
                                      }`}
                                      onMouseEnter={() => setHoveredCategory(cat.name)}
                                      onMouseLeave={() => setHoveredCategory(null)}
                                    >
                                      <div className="w-28 sm:w-36 flex items-center justify-end gap-2 shrink-0 text-right pr-2">
                                        <span
                                          className={`text-[11px] sm:text-xs truncate transition-colors ${
                                            isHovered
                                              ? 'font-black text-slate-950 dark:text-white'
                                              : 'font-black text-slate-700 dark:text-slate-200'
                                          }`}
                                          title={cat.name}
                                        >
                                          {cat.name}
                                        </span>
                                        <div
                                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                            isHovered ? 'scale-110 shadow-md ring-2 ring-white/50' : 'shadow-2xs'
                                          }`}
                                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                                        >
                                          <IconComp size={15} weight="bold" />
                                        </div>
                                      </div>

                                      <div className="flex-1 flex items-center relative pr-2 min-w-0">
                                        <div className="w-full flex items-center relative h-8 sm:h-9">
                                          <div
                                            className={`h-full rounded-r-xl transition-all duration-200 flex items-center justify-end pr-2.5 min-w-[8px] shrink-0 ${
                                              isHovered
                                                ? 'brightness-125 scale-y-105 drop-shadow-xl ring-2 ring-white/60'
                                                : 'hover:brightness-110'
                                            }`}
                                            style={{
                                              width: `${barWidth}%`,
                                              backgroundColor: cat.color,
                                              boxShadow: isHovered ? `0 0 16px ${cat.color}95` : undefined,
                                            }}
                                          >
                                            {barWidth >= 38 && (
                                              <span className="text-[10px] sm:text-[11px] font-mono font-black text-white drop-shadow-md whitespace-nowrap">
                                                S/. {cat.amount.toFixed(2)} ({cat.percentage}%)
                                              </span>
                                            )}
                                          </div>

                                          {barWidth < 38 && (
                                            <span className={`ml-2 text-[10px] sm:text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors ${
                                              isHovered ? 'font-black text-slate-950 dark:text-white' : 'font-black text-slate-800 dark:text-slate-100'
                                            }`}>
                                              S/. {cat.amount.toFixed(2)} ({cat.percentage}%)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* Pastel amplio ampliado 100% relleno con burbuja tipo pensamiento */
                            <div className="relative flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-200/80 dark:border-white/10 min-h-[380px]">
                              {/* BURBUJA TIPO PENSAMIENTO EN MODAL */}
                              <AnimatePresence>
                                {hoveredCategory && (() => {
                                  const item = categoryExpenses.items.find((c) => c.name === hoveredCategory);
                                  if (!item) return null;
                                  const IconComp = getCategoryIcon(item.icon_name || item.name);
                                  return (
                                    <motion.div
                                      key={item.name}
                                      initial={{ opacity: 0, scale: 0.85, y: -6 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.85, y: -6 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                                    >
                                      <div className="relative bg-slate-900/95 dark:bg-black/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/25 backdrop-blur-xl flex items-center gap-3 whitespace-nowrap">
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-900/95 dark:bg-black/95 border-r border-b border-white/25 rotate-45" />

                                        <div
                                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                                          style={{ backgroundColor: `${item.color}35`, color: item.color }}
                                        >
                                          <IconComp size={18} weight="bold" />
                                        </div>

                                        <div className="flex flex-col text-left">
                                          <span className="text-xs font-black uppercase tracking-wider text-white">
                                            {item.name}
                                          </span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm font-black font-mono text-white">
                                              S/. {item.amount.toFixed(2)}
                                            </span>
                                            <span
                                              className="text-[10px] font-black px-2 py-0.5 rounded-md font-mono"
                                              style={{ backgroundColor: `${item.color}40`, color: item.color }}
                                            >
                                              {item.percentage}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })()}
                              </AnimatePresence>

                              <svg width="340" height="340" viewBox="0 0 340 340" className="overflow-visible">
                                {(() => {
                                  let currentAngle = 0;
                                  const total = categoryExpenses.total || 1;
                                  return categoryExpenses.items.map((cat, idx) => {
                                    const sliceAngle = (cat.amount / total) * 360;
                                    const startAngle = currentAngle;
                                    const endAngle = currentAngle + sliceAngle;
                                    currentAngle += sliceAngle;

                                    const isHovered = hoveredCategory === cat.name;
                                    const isAnyHovered = hoveredCategory !== null;

                                    const midAngle = startAngle + sliceAngle / 2;
                                    const midRad = ((midAngle - 90) * Math.PI) / 180;
                                    const shiftX = isHovered ? Math.cos(midRad) * 9 : 0;
                                    const shiftY = isHovered ? Math.sin(midRad) * 9 : 0;

                                    // Relleno sólido: innerRadius = 0, centro 170,170
                                    const pathD = describeArc(170, 170, 0, isHovered ? 158 : 148, startAngle, endAngle);

                                    return (
                                      <g
                                        key={idx}
                                        style={{
                                          transform: `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px)`,
                                          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        }}
                                      >
                                        {sliceAngle >= 359.9 ? (
                                          <circle
                                            cx={170}
                                            cy={170}
                                            r={isHovered ? 158 : 148}
                                            fill={cat.color}
                                            className="cursor-pointer"
                                            style={{
                                              filter: isHovered ? `drop-shadow(0 0 18px ${cat.color}95)` : undefined,
                                            }}
                                            onMouseEnter={() => setHoveredCategory(cat.name)}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                          />
                                        ) : (
                                          <path
                                            d={pathD}
                                            fill={cat.color}
                                            className="cursor-pointer"
                                            style={{
                                              filter: isHovered
                                                ? `drop-shadow(0 0 18px ${cat.color}95)`
                                                : undefined,
                                              opacity: isHovered ? 1 : isAnyHovered ? 0.32 : 1,
                                              transition: 'filter 0.22s ease, opacity 0.22s ease',
                                            }}
                                            onMouseEnter={() => setHoveredCategory(cat.name)}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                          />
                                        )}
                                      </g>
                                    );
                                  });
                                })()}
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Lado Derecho: Lista de Categorías con Auto-Scroll y Resaltado Nítido */}
                        <div
                          ref={modalCategoryListRef}
                          className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto overflow-x-hidden p-1 pr-1.5 scrollbar-thin"
                        >
                          {categoryExpenses.items.map((cat, idx) => {
                            const IconComp = getCategoryIcon(cat.icon_name || cat.name);
                            const isHovered = hoveredCategory === cat.name;
                            const isAnyHovered = hoveredCategory !== null;

                            return (
                              <div
                                key={idx}
                                data-category={cat.name}
                                onMouseEnter={() => setHoveredCategory(cat.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                  isHovered
                                    ? 'border-l-4 shadow-lg translate-x-1 ring-1 ring-slate-900/10 dark:ring-white/10'
                                    : isAnyHovered
                                    ? 'border-transparent opacity-30'
                                    : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]'
                                }`}
                                style={{
                                  borderLeftColor: isHovered ? cat.color : undefined,
                                  backgroundColor: isHovered ? `${cat.color}15` : undefined,
                                  boxShadow: isHovered ? `0 0 16px ${cat.color}35` : undefined,
                                }}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                                  >
                                    <IconComp size={18} weight="bold" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-xs sm:text-[13px] truncate block ${isHovered ? 'font-black text-slate-950 dark:text-white scale-105' : 'font-bold'}`}>
                                      {cat.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{cat.count} compras</span>
                                  </div>
                                </div>

                                <div className="text-right font-mono">
                                  <span className={`text-xs sm:text-[13px] block ${isHovered ? 'font-black text-slate-950 dark:text-white' : 'font-black'}`}>
                                    S/. {cat.amount.toFixed(2)}
                                  </span>
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: isHovered ? `${cat.color}35` : undefined,
                                      color: isHovered ? cat.color : undefined,
                                    }}
                                  >
                                    {cat.percentage}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL 2: PASTEL INGRESOS VS GASTOS & TASA DE SUPERÁVIT (MASTER-DETAIL) */}
                  {expandedModal === 'monthlyPie' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Lado Izquierdo: Gráfico de Pastel Sólido e Interactivo */}
                      <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-200/80 dark:border-white/10">
                        <div className="relative flex items-center justify-center w-64 h-64">
                          <svg width="256" height="256" viewBox="0 0 256 256" className="overflow-visible">
                            {(() => {
                              const total = monthlyTotals.total || 1;
                              const incAngle = (monthlyTotals.income / total) * 360;

                              const incHover = hoveredPieSlice === 'income';
                              const expHover = hoveredPieSlice === 'expense';
                              const isAnyPieHovered = hoveredPieSlice !== null;

                              const incPath = describeArc(128, 128, 30, incHover ? 116 : 108, 0, incAngle);
                              const expPath = describeArc(128, 128, 30, expHover ? 116 : 108, incAngle, 360);

                              return (
                                <>
                                  {monthlyTotals.income > 0 && (
                                    <path
                                      d={incPath}
                                      fill="#10b981"
                                      className="cursor-pointer"
                                      style={{
                                        opacity: incHover ? 1 : isAnyPieHovered ? 0.35 : 1,
                                        filter: incHover ? 'drop-shadow(0 0 22px rgba(16,185,129,0.95)) brightness(1.15)' : undefined,
                                        transform: incHover ? 'scale(1.035)' : 'scale(1)',
                                        transformOrigin: '128px 128px',
                                        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                      }}
                                      onMouseEnter={() => setHoveredPieSlice('income')}
                                      onMouseLeave={() => setHoveredPieSlice(null)}
                                    />
                                  )}
                                  {monthlyTotals.expense > 0 && (
                                    <path
                                      d={expPath}
                                      fill="#f43f5e"
                                      className="cursor-pointer"
                                      style={{
                                        opacity: expHover ? 1 : isAnyPieHovered ? 0.35 : 1,
                                        filter: expHover ? 'drop-shadow(0 0 22px rgba(244,63,94,0.95)) brightness(1.15)' : undefined,
                                        transform: expHover ? 'scale(1.035)' : 'scale(1)',
                                        transformOrigin: '128px 128px',
                                        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                      }}
                                      onMouseEnter={() => setHoveredPieSlice('expense')}
                                      onMouseLeave={() => setHoveredPieSlice(null)}
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </svg>
                        </div>

                        <div className="flex items-center gap-6 mt-4">
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredPieSlice('income')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                            className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                              hoveredPieSlice === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400 scale-105 font-black'
                                : hoveredPieSlice !== null
                                ? 'opacity-40 text-slate-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full bg-emerald-500 transition-all shadow-xs"
                              style={{ boxShadow: hoveredPieSlice === 'income' ? '0 0 12px #10b981' : undefined }}
                            />
                            Ingresos ({monthlyTotals.incomePercent.toFixed(1)}%)
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredPieSlice('expense')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                            className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                              hoveredPieSlice === 'expense'
                                ? 'text-rose-600 dark:text-rose-400 scale-105 font-black'
                                : hoveredPieSlice !== null
                                ? 'opacity-40 text-slate-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full bg-rose-500 transition-all shadow-xs"
                              style={{ boxShadow: hoveredPieSlice === 'expense' ? '0 0 12px #f43f5e' : undefined }}
                            />
                            Gastos ({monthlyTotals.expensePercent.toFixed(1)}%)
                          </button>
                        </div>
                      </div>

                      {/* Lado Derecho: Detalles de Salud Financiera y Tasa de Superávit */}
                      <motion.div
                        initial={{ opacity: 0, x: 25 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 }}
                        className="lg:col-span-6 space-y-4"
                      >
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkle size={20} weight="bold" className="text-amber-500" />
                              <span className="font-black text-sm text-slate-900 dark:text-white">
                                Tasa de Superávit / Ahorro Potencial
                              </span>
                            </div>
                            <span className={`font-mono font-black text-xl ${monthlyTotals.superavitRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {monthlyTotals.income > 0 ? `${monthlyTotals.superavitRate.toFixed(1)}%` : '0%'}
                            </span>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                monthlyTotals.superavitRate >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, Math.abs(monthlyTotals.superavitRate)))}%` }}
                            />
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {monthlyTotals.superavitRate >= 20
                              ? 'Excelente retención: Estás ahorrando más de la quinta parte de tus ingresos.'
                              : monthlyTotals.superavitRate > 0
                              ? 'Superávit positivo: Tus ingresos cubren tus gastos y dejan margen para ahorro.'
                              : monthlyTotals.superavitRate < 0
                              ? `Déficit de S/. ${Math.abs(monthlyTotals.net).toFixed(2)}: Tus gastos superaron los ingresos del mes.`
                              : 'Presupuesto en equilibrio exacto.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div
                            onMouseEnter={() => setHoveredPieSlice('income')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                            className={`p-4 rounded-2xl bg-emerald-500/10 border transition-all cursor-pointer ${
                              hoveredPieSlice === 'income'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02] shadow-lg shadow-emerald-500/15'
                                : hoveredPieSlice !== null
                                ? 'border-emerald-500/10 opacity-50'
                                : 'border-emerald-500/20'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-500 block mb-1">Total Ingresos</span>
                            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                              +S/. {monthlyTotals.income.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">{monthlyTotals.incomeCount} operaciones</span>
                          </div>

                          <div
                            onMouseEnter={() => setHoveredPieSlice('expense')}
                            onMouseLeave={() => setHoveredPieSlice(null)}
                            className={`p-4 rounded-2xl bg-rose-500/10 border transition-all cursor-pointer ${
                              hoveredPieSlice === 'expense'
                                ? 'border-rose-500 ring-2 ring-rose-500/30 scale-[1.02] shadow-lg shadow-rose-500/15'
                                : hoveredPieSlice !== null
                                ? 'border-rose-500/10 opacity-50'
                                : 'border-rose-500/20'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-500 block mb-1">Total Gastos</span>
                            <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 block">
                              -S/. {monthlyTotals.expense.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">{monthlyTotals.expenseCount} operaciones</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-400 block">Balance Neto del Período</span>
                            <span className="text-xs text-slate-500">Ingresos menos egresos directos</span>
                          </div>
                          <span className={`text-xl font-black font-mono ${monthlyTotals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {monthlyTotals.net >= 0 ? '+' : '-'}S/. {Math.abs(monthlyTotals.net).toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* MODAL 3: EVOLUCIÓN DIARIA CURVADA & TABLA DÍA A DÍA (MASTER-DETAIL) */}
                  {expandedModal === 'evolution' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Lado Izquierdo: Gráfica de Líneas Curvas Ampliada */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* Fila Superior de Métricas: Pico de Gasto y Gasto Promedio (Fiel a Imagen 3) */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                            <span className="text-xs font-bold text-slate-400 block mb-1">Pico de Gasto</span>
                            <span className="text-base sm:text-lg font-black font-mono flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <FireSimple size={18} weight="fill" className="text-rose-500" />
                              Día {dailyTimelineData.peakExpenseDay.day}: S/. {dailyTimelineData.peakExpenseDay.amount.toFixed(0)}
                            </span>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                            <span className="text-xs font-bold text-slate-400 block mb-1">Gasto Promedio</span>
                            <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                              S/. {dailyTimelineData.dailyAvg.toFixed(1)} / día
                            </span>
                          </div>
                        </div>

                        <div className="relative p-5 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 overflow-visible">
                          <div className="relative w-full h-64">
                            <svg
                              viewBox={`0 0 ${svgTimelineCoords.width} ${svgTimelineCoords.height}`}
                              preserveAspectRatio="none"
                              className="w-full h-full overflow-visible"
                              onMouseLeave={() => setHoveredDayPoint(null)}
                            >
                              <line
                                x1="20"
                                y1={svgTimelineCoords.zeroY}
                                x2={svgTimelineCoords.width - 20}
                                y2={svgTimelineCoords.zeroY}
                                stroke="currentColor"
                                className="text-slate-300 dark:text-white/15"
                                strokeDasharray="4 4"
                                strokeWidth="1.2"
                              />

                              {/* Puntos Nítidos con Borde de Alto Contraste en Modal (Sin barras distractoras) */}
                              {comparePreviousMonth && svgTimelineCoords.prevPoints.length > 0 && (
                                <path
                                  d={getCurvedPath(svgTimelineCoords.prevPoints)}
                                  fill="none"
                                  stroke="#94a3b8"
                                  strokeWidth="2.5"
                                  strokeDasharray="5 5"
                                  className="opacity-70"
                                />
                              )}

                              {/* Segmentos Curvos Coloreados en Modal: Verde para Subida / Estable, Rojo para Bajada */}
                              {getCurvedSegments(svgTimelineCoords.currentPoints).map((seg, idx) => (
                                <path
                                  key={`modal-seg-${idx}`}
                                  d={seg.d}
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth="3.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="drop-shadow-xs"
                                />
                              ))}

                              {/* Líneas guía verticales en hover */}
                              {svgTimelineCoords.currentPoints.map((pt, i) => {
                                const isHovered = hoveredDayPoint === pt.day;
                                if (!isHovered) return null;
                                return (
                                  <line
                                    key={`modal-line-${i}`}
                                    x1={pt.x}
                                    y1={0}
                                    x2={pt.x}
                                    y2={svgTimelineCoords.height - 18}
                                    stroke="#6366f1"
                                    strokeWidth="1.8"
                                    strokeDasharray="3 3"
                                    className="opacity-80"
                                  />
                                );
                              })}

                              {/* Columnas transparentes de interacción completa en Modal 3 (sin pixel hunting) */}
                              {svgTimelineCoords.currentPoints.map((pt, i) => {
                                const colWidth = (svgTimelineCoords.width - 40) / Math.max(1, svgTimelineCoords.currentPoints.length - 1);
                                return (
                                  <rect
                                    key={`modal-hit-${i}`}
                                    x={pt.x - colWidth / 2}
                                    y={0}
                                    width={colWidth}
                                    height={svgTimelineCoords.height}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredDayPoint(pt.day)}
                                  />
                                );
                              })}
                            </svg>

                            {/* Puntos Nítidos 100% Redondos sin distorsión de aspecto ni alargamiento horizontal */}
                            <div className="absolute inset-0 pointer-events-none overflow-visible">
                              {svgTimelineCoords.currentPoints.map((pt, i) => {
                                const isHovered = hoveredDayPoint === pt.day;
                                const prevPt = i > 0 ? svgTimelineCoords.currentPoints[i - 1] : null;
                                const delta = prevPt ? pt.cumNet - prevPt.cumNet : 0;
                                const ptColor = delta < -0.001 ? '#f43f5e' : '#10b981';
                                const size = isHovered ? 15 : pt.isPeak ? 12 : 9;

                                return (
                                  <div
                                    key={`modal-circle-${i}`}
                                    className="absolute rounded-full border-2 border-slate-900 dark:border-white transition-all duration-150"
                                    style={{
                                      left: `${(pt.x / svgTimelineCoords.width) * 100}%`,
                                      top: `${(pt.y / svgTimelineCoords.height) * 100}%`,
                                      width: `${size}px`,
                                      height: `${size}px`,
                                      backgroundColor: ptColor,
                                      transform: 'translate(-50%, -50%)',
                                      boxShadow: isHovered ? `0 0 14px ${ptColor}` : undefined,
                                      zIndex: isHovered ? 25 : 10,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* BURBUJA TIPO PENSAMIENTO EN MODAL: SOBREPUESTA, NÍTIDA, DE ALTO CONTRASTE Y ALINEADA EXACTAMENTE AL DÍA */}
                          <AnimatePresence>
                            {hoveredDayPoint !== null && (() => {
                              const pt = svgTimelineCoords.currentPoints.find((p) => p.day === hoveredDayPoint);
                              if (!pt) return null;
                              const xPct = (pt.x / svgTimelineCoords.width) * 100;
                              const bubbleLeft = Math.max(16, Math.min(84, xPct));
                              const tailOffsetPct = Math.max(12, Math.min(88, 50 + (xPct - bubbleLeft) * 2.2));

                              return (
                                <motion.div
                                  key={pt.day}
                                  initial={{ opacity: 0, scale: 0.9, y: -6, x: '-50%' }}
                                  animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                                  exit={{ opacity: 0, scale: 0.9, y: -6, x: '-50%' }}
                                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                                  style={{
                                    left: `${bubbleLeft}%`,
                                    top: '-24px',
                                  }}
                                  className="absolute z-50 pointer-events-none"
                                >
                                  <div className="relative bg-white/98 dark:bg-[#0c0d14]/98 text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.7)] border border-slate-200 dark:border-white/20 backdrop-blur-2xl flex flex-col gap-1.5 min-w-[210px] text-left">
                                    <div
                                      className="absolute -bottom-1.5 w-3.5 h-3.5 bg-white/98 dark:bg-[#0c0d14]/98 border-r border-b border-slate-200 dark:border-white/20 rotate-45 shadow-xs"
                                      style={{
                                        left: `${tailOffsetPct}%`,
                                        transform: 'translateX(-50%) rotate(45deg)',
                                      }}
                                    />

                                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-1.5 gap-2">
                                      <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Día {pt.day} • {selectedPeriod.shortLabel}
                                      </span>
                                      <span
                                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                          pt.net >= 0
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                        }`}
                                      >
                                        {pt.net >= 0 ? '+' : ''}S/. {pt.net.toFixed(2)}
                                      </span>
                                    </div>

                                    {pt.income > 0 && (
                                      <div className="flex items-center justify-between text-xs font-mono py-0.5">
                                        <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                                          Ingreso:
                                        </span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                                          +S/. {pt.income.toFixed(2)}
                                        </span>
                                      </div>
                                    )}

                                    {pt.expense > 0 && (
                                      <div className="flex items-center justify-between text-xs font-mono py-0.5">
                                        <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
                                          Gasto:
                                        </span>
                                        <span className="font-black text-rose-600 dark:text-rose-400">
                                          -S/. {pt.expense.toFixed(2)}
                                        </span>
                                      </div>
                                    )}

                                    {pt.income === 0 && pt.expense === 0 && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic py-0.5">
                                        Sin movimientos directos
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-white/10">
                                      <span className="text-[10px] font-bold">Saldo acumulado:</span>
                                      <span
                                        className={`font-black ${
                                          pt.cumNet >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {pt.cumNet >= 0 ? '+' : ''}S/. {pt.cumNet.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })()}
                          </AnimatePresence>

                          <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-3 border-t border-slate-200 dark:border-white/10">
                            <span className="flex items-center gap-1.5 text-emerald-500">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Trayectoria Mes Actual
                            </span>
                            {comparePreviousMonth && (
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Mes Anterior ({previousPeriod.label})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Derecho: Tabla Día a Día y Métricas Clave */}
                      <motion.div
                        initial={{ opacity: 0, x: 25 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 }}
                        className="lg:col-span-5 space-y-4"
                      >
                        <span className="text-xs font-black uppercase text-slate-400 block pb-1 border-b border-slate-100 dark:border-white/[0.06]">
                          Tabla Día a Día y Métricas
                        </span>

                        {/* Tabla Día a Día */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 max-h-[380px] overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="sticky top-0 bg-slate-100 dark:bg-[#1a1d26] text-slate-500 font-bold uppercase text-[10px] z-10">
                              <tr>
                                <th className="py-2.5 px-3">Día</th>
                                <th className="py-2.5 px-3 text-right">Ingreso</th>
                                <th className="py-2.5 px-3 text-right">Gasto</th>
                                <th className="py-2.5 px-3 text-right">Acumulado</th>
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
                                      isPeak ? 'bg-rose-500/[0.07]' : ''
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-mono font-bold flex items-center gap-1">
                                      <span>D{d.day}</span>
                                      {isPeak && <FireSimple size={13} weight="fill" className="text-rose-500" />}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {d.income > 0 ? `+${d.income.toFixed(0)}` : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                      {d.expense > 0 ? `-${d.expense.toFixed(0)}` : '-'}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${d.cumNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      S/. {d.cumNet.toFixed(0)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span
                                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                          d.net > 0
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                            : d.net < 0
                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                        }`}
                                      >
                                        {d.net > 0 ? 'Superávit' : d.net < 0 ? 'Déficit' : 'Neutro'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
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

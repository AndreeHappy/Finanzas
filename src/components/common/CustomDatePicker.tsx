import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ArrowClockwise,
} from '@phosphor-icons/react';

interface CustomDatePickerProps {
  value: string; // formato "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS_ES = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

// Parse seguro de YYYY-MM-DD a partes numéricas locales
const parseDateParts = (str: string) => {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      isValid: false,
    };
  }
  const [y, m, d] = str.split('-').map(Number);
  return {
    year: y,
    month: m - 1, // 0-indexed
    day: d,
    isValid: true,
  };
};

const formatDateStr = (y: number, m: number, d: number) => {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
};

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  className = '',
  placeholder = 'Seleccionar fecha',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Fecha seleccionada actual
  const parsedValue = useMemo(() => parseDateParts(value), [value]);

  // Mes y Año que se están visualizando en el calendario
  const [viewYear, setViewYear] = useState<number>(() => parsedValue.year);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue.month);

  // Sincronizar vista si el valor externo cambia y se abre
  useEffect(() => {
    if (parsedValue.isValid) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value, parsedValue.isValid, isOpen]);

  // Cálculo de coordenadas flotantes (sin clipping ni scrolls internos)
  useEffect(() => {
    if (!isOpen) return;

    const updateCoords = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 350;

      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      if (left < 12) left = 12;

      let top = rect.bottom + 6;
      if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 20) {
        top = Math.max(10, rect.top - popoverHeight - 6);
      }

      setCoords({ top, left });
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  // Cierre al hacer clic fuera del componente (tanto botón como popover flotante)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Cierre con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Navegación de meses
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Cálculo de la cuadrícula mensual
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Domingo
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const now = new Date();
    const todayStr = formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());

    // Días del mes anterior para rellenar la primera fila
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = formatDateStr(y, m, d);
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === value,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = formatDateStr(viewYear, viewMonth, d);
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === value,
      });
    }

    // Días del siguiente mes para completar las 5 o 6 filas (múltiplo de 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = formatDateStr(y, m, d);
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === value,
      });
    }

    return days;
  }, [viewYear, viewMonth, value]);

  // Selección de fecha
  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  // Ir a hoy
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const todayStr = formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(todayStr);
    setIsOpen(false);
  };

  // Formato visual legible para el botón disparador
  const formattedDisplay = useMemo(() => {
    if (!parsedValue.isValid) return placeholder;
    const { year, month, day } = parsedValue;
    return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
  }, [parsedValue, placeholder]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <CalendarBlank size={13} weight="bold" />
          <span>{label}</span>
        </label>
      )}

      {/* Botón Disparador Estilizado */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer outline-none select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/5'
            : isOpen
            ? 'bg-white dark:bg-black/50 border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white shadow-sm'
            : 'bg-slate-50 hover:bg-white dark:bg-black/30 dark:hover:bg-black/40 border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarBlank
            size={16}
            weight={parsedValue.isValid ? 'bold' : 'regular'}
            className={parsedValue.isValid ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'}
          />
          <span className={`font-mono text-xs ${parsedValue.isValid ? 'font-bold text-slate-900 dark:text-white' : 'font-normal text-slate-400'}`}>
            {formattedDisplay}
          </span>
        </div>

        {parsedValue.isValid && (
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            {MONTH_NAMES_ES[parsedValue.month]?.slice(0, 3)} {parsedValue.year}
          </span>
        )}
      </button>

      {/* Popover Desplegable del Calendario renderizado en Portal Flotante sin clipping */}
      {typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  zIndex: 999999,
                }}
                className="w-72 sm:w-80 rounded-3xl bg-white dark:bg-[#181a26] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 backdrop-blur-2xl"
              >
                {/* Cabecera del Calendario: Mes, Año y Controles */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {MONTH_NAMES_ES[viewMonth]}
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-500 dark:text-slate-400">
                      {viewYear}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Mes anterior"
                    >
                      <CaretLeft size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Mes siguiente"
                    >
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Fila de Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {WEEKDAYS_ES.map((wd, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Cuadrícula de Días */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarDays.map((cd, idx) => {
                    const isSelected = cd.isSelected;
                    const isToday = cd.isToday;
                    const isCurrent = cd.isCurrentMonth;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDate(cd.dateStr)}
                        className={`h-8 sm:h-9 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center relative cursor-pointer active:scale-90 select-none ${
                          isSelected
                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md font-black z-10'
                            : isToday
                            ? 'border border-emerald-500/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : isCurrent
                            ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                            : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <span>{cd.day}</span>
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pie del Calendario: Acciones Rápidas */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className="px-2.5 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowClockwise size={12} weight="bold" />
                    <span>Hoy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

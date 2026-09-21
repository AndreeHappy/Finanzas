import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, Check } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  colorDot?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handleSelect = (optVal: string) => {
    onChange(optVal);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Botón Disparador Estilizado */}
      <button
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <div className="shrink-0 text-slate-600 dark:text-slate-300">
                  {selectedOption.icon}
                </div>
              )}
              {selectedOption.colorDot && (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedOption.colorDot }}
                />
              )}
              <span className="truncate text-slate-900 dark:text-white font-bold">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                  style={{
                    backgroundColor: selectedOption.badgeColor
                      ? `${selectedOption.badgeColor}20`
                      : 'rgba(16, 185, 129, 0.15)',
                    color: selectedOption.badgeColor || '#10b981',
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 shrink-0"
        >
          <CaretDown size={14} weight="bold" />
        </motion.div>
      </button>

      {/* Menú Desplegable Estilizado */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-1.5 z-50 rounded-2xl bg-white dark:bg-[#181a26] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-1.5 max-h-56 overflow-y-auto space-y-0.5 backdrop-blur-xl"
          >
            {options.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-slate-400">
                No hay opciones disponibles
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer text-left select-none ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <div className="shrink-0 text-slate-500 dark:text-slate-400">
                          {opt.icon}
                        </div>
                      )}
                      {opt.colorDot && (
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: opt.colorDot }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                          style={{
                            backgroundColor: opt.badgeColor
                              ? `${opt.badgeColor}20`
                              : 'rgba(16, 185, 129, 0.15)',
                            color: opt.badgeColor || '#10b981',
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          ({opt.sublabel})
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} weight="bold" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

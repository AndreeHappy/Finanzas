import React from 'react';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const getCompactPages = (current: number, total: number): (number | string)[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  // Primeras páginas: 1, 2, 3 ... [último]
  if (current <= 2) {
    return [1, 2, 3, '...', total];
  }
  // Últimas páginas: 1 ... total - 2, total - 1, total
  if (current >= total - 1) {
    return [1, '...', total - 2, total - 1, total];
  }
  // Páginas intermedias: 1 ... actual ... total
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const CompactPagination: React.FC<CompactPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const pages = getCompactPages(currentPage, totalPages);

  return (
    <div
      className={`inline-flex items-center justify-center gap-0.5 sm:gap-1 bg-slate-200/80 dark:bg-white/[0.06] p-0.5 sm:p-1 rounded-xl select-none ${className}`}
    >
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default select-none outline-none focus:outline-none"
        title="Página anterior"
      >
        <CaretLeft size={14} weight="bold" />
      </motion.button>

      {pages.map((item, idx) => {
        if (item === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="w-5 sm:w-6 h-6 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-400 select-none tracking-widest pointer-events-none"
            >
              ...
            </span>
          );
        }

        const pg = item as number;
        const isCurrent = currentPage === pg;
        return (
          <motion.button
            key={pg}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onPageChange(pg)}
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none outline-none focus:outline-none ${
              isCurrent
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {pg}
          </motion.button>
        );
      })}

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default select-none outline-none focus:outline-none"
        title="Página siguiente"
      >
        <CaretRight size={14} weight="bold" />
      </motion.button>
    </div>
  );
};

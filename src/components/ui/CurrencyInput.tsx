import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string | number; // e.g. "15.00" or 15.00
  onChange: (val: any) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
  required?: boolean;
}

export const CurrencyInput: React.FC<Props> = ({
  value,
  onChange,
  className = '',
  autoFocus = false,
  id,
  required = false,
}) => {
  const isNumberMode = typeof value === 'number';

  const parseToCents = (val: string | number): number => {
    if (typeof val === 'number') {
      return Math.round(val * 100);
    }
    if (!val) return 0;
    const clean = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  };

  const [cents, setCents] = useState<number>(() => parseToCents(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parsed = parseToCents(value);
    if (parsed !== cents) {
      setCents(parsed);
    }
  }, [value]);

  const formatDisplay = (centsVal: number): string => {
    return (centsVal / 100).toFixed(2);
  };

  const emitChange = (nextCents: number) => {
    if (isNumberMode) {
      onChange(nextCents / 100);
    } else {
      onChange(nextCents === 0 ? '0.00' : (nextCents / 100).toFixed(2));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const digit = parseInt(e.key, 10);
      if (cents < 99999999) {
        const nextCents = cents * 10 + digit;
        setCents(nextCents);
        emitChange(nextCents);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const nextCents = Math.floor(cents / 10);
      setCents(nextCents);
      emitChange(nextCents);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      setCents(0);
      emitChange(0);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') {
      // Permitir navegación
    } else {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const clean = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num) && num >= 0) {
      const nextCents = Math.min(99999999, Math.round(num * 100));
      setCents(nextCents);
      emitChange(nextCents);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-mono text-xs select-none pointer-events-none">
        S/.
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={formatDisplay(cents)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {}}
        autoFocus={autoFocus}
        required={required}
        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] focus:border-emerald-500 font-mono text-sm text-slate-900 dark:text-white outline-none transition-colors select-all ${className}`}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  X,
  PencilSimple,
  FloppyDisk,
  WarningCircle,
  CalendarBlank,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Money,
  Tag,
} from '@phosphor-icons/react';
import type { Transaction, WalletCard, Category, MovementType } from '../../types';
import { CustomSelect, type SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { getCategoryIcon } from '../../constants/iconMap';
import { parseLocalDateParts } from '../../utils/date';

interface EditMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  movementNumber?: number;
  wallets: WalletCard[];
  categories: Category[];
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export const EditMovementModal: React.FC<EditMovementModalProps> = ({
  isOpen,
  onClose,
  transaction,
  movementNumber,
  wallets = [],
  categories = [],
  onSave,
}) => {
  const lastTxRef = React.useRef<Transaction | null>(transaction);
  if (transaction) {
    lastTxRef.current = transaction;
  }
  const activeTx = transaction || lastTxRef.current;

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('expense');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animación interactiva 3D instantánea que sigue al mouse sin lag
  const cardMouseX = useMotionValue(0);
  const cardMouseY = useMotionValue(0);
  const cardRotateX = useTransform(cardMouseY, [-0.5, 0.5], [14, -14]);
  const cardRotateY = useTransform(cardMouseX, [-0.5, 0.5], [-14, 14]);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cardMouseX.set((x / rect.width) - 0.5);
    cardMouseY.set((y / rect.height) - 0.5);
  };

  const handleCardMouseLeave = () => {
    animate(cardMouseX, 0, { type: 'spring', stiffness: 600, damping: 30 });
    animate(cardMouseY, 0, { type: 'spring', stiffness: 600, damping: 30 });
    setIsCardHovered(false);
  };

  // Inicializar campos cuando se abre el modal con una transacción de forma 100% segura
  useEffect(() => {
    if (transaction && isOpen) {
      setConcept(transaction.concept || '');
      setAmount(String(Math.abs(Number(transaction.amount) || 0)));
      setMovementType(transaction.type || 'expense');
      
      const safeWallets = Array.isArray(wallets) ? wallets : [];
      const initialWalletId = transaction.wallet_id || safeWallets[0]?.id || '';
      setWalletId(initialWalletId);

      const initialCatName = transaction.category_name || 'General';
      setCategoryName(initialCatName);

      const safeCats = Array.isArray(categories) ? categories : [];
      const foundCat = safeCats.find(
        (c) =>
          (transaction.category_id && c && c.id === transaction.category_id) ||
          (c && c.name && c.name.toLowerCase().trim() === initialCatName.toLowerCase().trim())
      );
      setCategoryId(foundCat ? foundCat.id : (transaction.category_id || ''));

      // Usar parseLocalDateParts para evitar RangeError: Invalid time value
      const dateParts = parseLocalDateParts(transaction.date);
      const formattedDate = `${dateParts.year}-${String(dateParts.month + 1).padStart(2, '0')}-${String(dateParts.day).padStart(2, '0')}`;
      setDate(formattedDate);

      setNotes(transaction.notes || '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [transaction, isOpen, wallets, categories]);

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const safeCats = Array.isArray(categories) ? categories : [];
  const filteredCategories = safeCats.filter((c) => {
    if (!c) return false;
    if (movementType === 'income') {
      return c.type === 'income';
    }
    if (movementType === 'savings_deposit' || movementType === 'savings_withdrawal') {
      return true;
    }
    return c.type === 'expense';
  });

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const walletOptions = React.useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = safeWallets.map((w) => ({
      value: w.id,
      label: w.type === 'savings' ? 'Ahorro' : w.type === 'cash' ? 'Efectivo' : 'Digital',
      badge: w.type === 'savings' ? 'Ahorro' : w.type === 'cash' ? 'Efectivo' : 'Digital',
      badgeColor: w.type === 'savings' ? '#f59e0b' : w.type === 'cash' ? '#10b981' : '#3b82f6',
      badgeOnly: true,
      icon:
        w.type === 'savings' ? (
          <PiggyBank size={15} weight="bold" />
        ) : w.type === 'cash' ? (
          <Money size={15} weight="bold" />
        ) : (
          <CreditCard size={15} weight="bold" />
        ),
    }));

    if (walletId && !opts.some((o) => o.value === walletId)) {
      opts.unshift({
        value: walletId,
        label: 'Digital',
        badge: 'Digital',
        badgeColor: '#3b82f6',
        badgeOnly: true,
        icon: <CreditCard size={15} weight="bold" />,
      });
    }

    return opts;
  }, [safeWallets, walletId]);

  const categoryOptions = React.useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    const seen = new Set<string>();

    filteredCategories.forEach((c) => {
      if (!c) return;
      const key = (c.id || c.name).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        const IconComp = getCategoryIcon(c.icon_name);
        opts.push({
          value: c.id,
          label: c.name,
          colorDot: c.color,
          icon: <IconComp size={15} weight="bold" />,
        });
      }
    });

    const hasCurrent = opts.some(
      (o) =>
        (categoryId && o.value === categoryId) ||
        (categoryName && o.label.toLowerCase().trim() === categoryName.toLowerCase().trim())
    );

    if (!hasCurrent && categoryName) {
      opts.unshift({
        value: categoryId || 'current-cat',
        label: categoryName,
        colorDot: '#64748B',
        icon: <Tag size={15} weight="bold" />,
      });
    }

    return opts;
  }, [filteredCategories, categoryId, categoryName]);

  // Retorno condicional estricto para SSR/DOM
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTx = transaction || activeTx;
    if (!currentTx) return;
    const parsedAmount = Math.abs(parseFloat(amount) || 0);

    if (parsedAmount <= 0) {
      setError('El monto debe ser superior a cero.');
      return;
    }
    if (!concept.trim()) {
      setError('El concepto o detalle no puede estar vacío.');
      return;
    }
    if (!walletId) {
      setError('Debes seleccionar una tarjeta o billetera asociada.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedCat = safeCats.find((c) => c && c.id === categoryId);
      const finalCatName = selectedCat ? selectedCat.name : (categoryName.trim() || 'General');

      let targetDate = currentTx.date;
      if (date) {
        const [y, m, d] = date.split('-').map(Number);
        const now = new Date();
        const localD = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        targetDate = localD.toISOString();
      }

      await onSave(currentTx.id, {
        concept: concept.trim(),
        amount: parsedAmount,
        type: movementType,
        wallet_id: walletId,
        category_id: (selectedCat?.id || categoryId) || undefined,
        category_name: finalCatName,
        date: targetDate,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSavingsDeposit = movementType === 'savings_deposit';
  const isSavingsWithdrawal = movementType === 'savings_withdrawal';
  const isIncomeType = movementType === 'income';

  let previewBorderClass = 'border-rose-500 shadow-rose-500/20';
  let previewAmountColor = 'text-rose-600 dark:text-rose-400';

  if (isSavingsDeposit || isSavingsWithdrawal) {
    previewBorderClass = 'border-amber-500 shadow-amber-500/20';
    previewAmountColor = 'text-amber-600 dark:text-amber-400';
  } else if (isIncomeType) {
    previewBorderClass = 'border-emerald-500 shadow-emerald-500/20';
    previewAmountColor = 'text-emerald-600 dark:text-emerald-400';
  }

  const selectedWalletObj = safeWallets.find((w) => w.id === walletId) || safeWallets[0];
  const isCash = selectedWalletObj?.type === 'cash';
  const isSavings = selectedWalletObj?.type === 'savings';
  const paymentLabel = isCash
    ? 'Efectivo'
    : isSavings
    ? 'Ahorro'
    : selectedWalletObj?.name || 'Tarjeta Digital';
  const PaymentIcon = isCash ? Money : isSavings ? PiggyBank : CreditCard;
  const paymentColorStyle = isCash
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25'
    : isSavings
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/25'
    : 'text-blue-500 bg-blue-500/10 border-blue-500/25';

  const selectedCatObj = safeCats.find((c) => c.id === categoryId) || 
    safeCats.find((c) => c.name?.toLowerCase().trim() === categoryName?.toLowerCase().trim());
  const previewCatColor = selectedCatObj?.color || (isSavingsDeposit ? '#f59e0b' : isIncomeType ? '#10b981' : '#f43f5e');
  const PreviewCatIcon = getCategoryIcon(selectedCatObj?.icon_name || selectedCatObj?.name || categoryName || 'Tag');
  const previewDateParts = parseLocalDateParts(date || activeTx?.date || new Date().toISOString());

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && activeTx && (
        <motion.div
          key="edit-movement-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-8 my-auto">
            {/* LADO IZQUIERDO: TARJETA MAGNIFICADA (SOLO EN LG+ PARA NO EMPUJAR EL FORMULARIO EN MÓVIL) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="hidden lg:block w-full max-w-[340px] sm:max-w-[370px] shrink-0"
            >
              <motion.div
                layoutId={`movement-card-${activeTx.id}`}
                transition={{
                  type: 'spring',
                  stiffness: 460,
                  damping: 32,
                  mass: 0.22,
                }}
                onMouseMove={handleCardMouseMove}
                onMouseEnter={() => setIsCardHovered(true)}
                onMouseLeave={handleCardMouseLeave}
                style={{
                  rotateX: isCardHovered ? cardRotateX : 0,
                  rotateY: isCardHovered ? cardRotateY : 0,
                  transformPerspective: 950,
                  transformStyle: 'preserve-3d',
                }}
                className={`relative w-full rounded-3xl p-6 sm:p-7 border-2 ${previewBorderClass} bg-white dark:bg-[#11131a] shadow-2xl flex flex-col justify-between min-h-[220px] sm:min-h-[240px] select-none cursor-pointer overflow-hidden transition-colors duration-150`}
              >
                {/* Top Row: Concepto (sin la etiqueta 'CONCEPTO') y N° Registro */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4
                      className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-2"
                      title={concept}
                    >
                      {concept || 'MOVIMIENTO'}
                    </h4>
                  </div>

                  <span className="text-xs font-mono font-black text-slate-400 dark:text-zinc-500 shrink-0">
                    #{movementNumber || 1}
                  </span>
                </div>

                {/* Second Row: Detalles enriquecidos (Fecha + Tipo) a la izquierda y SOLO ICONO DE CATEGORÍA a la derecha */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      <CalendarBlank size={14} weight="bold" />
                      <span>{previewDateParts.formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isIncomeType
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isSavingsDeposit
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : isSavingsWithdrawal
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {movementType === 'expense'
                          ? 'Gasto'
                          : movementType === 'income'
                          ? 'Ingreso'
                          : movementType === 'savings_deposit'
                          ? 'Aporte Ahorro'
                          : 'Retiro Ahorro'}
                      </span>
                    </div>
                  </div>

                  {/* SOLO ICONO DE CATEGORÍA CON SU COLOR (Mismo tamaño w-9 h-9 que método de pago, sin texto) */}
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs"
                    style={{
                      backgroundColor: `${previewCatColor}18`,
                      borderColor: `${previewCatColor}35`,
                      color: previewCatColor,
                    }}
                    title={`Categoría: ${selectedCatObj?.name || categoryName || 'General'}`}
                  >
                    <PreviewCatIcon size={18} weight="bold" />
                  </div>
                </div>

                {/* Notas / Observaciones opcionales en la tarjeta con más detalle */}
                {notes && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-zinc-400 italic line-clamp-2">
                    "{notes}"
                  </div>
                )}

                {/* Third Row: Monto Magnificado y Método de Pago (Icono Único con su Color) */}
                <div className="flex items-end justify-between gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.08] min-w-0">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`whitespace-nowrap inline-flex items-baseline font-mono font-black tracking-tight leading-none ${previewAmountColor}`}
                    >
                      <span className="text-xl sm:text-2xl font-black mr-1 shrink-0 select-none tracking-tight">
                        {isIncomeType || isSavingsDeposit ? '+' : '-'}S/.
                      </span>
                      <span className="text-2xl sm:text-[30px] font-black tracking-tight">
                        {Number(amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Badge: SOLO ICONO CON SU COLOR DISTINTIVO (w-9 h-9) */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${paymentColorStyle}`}
                    title={paymentLabel}
                  >
                    <PaymentIcon size={18} weight="bold" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* LADO DERECHO: FORMULARIO DE EDICIÓN FLUIDO Y SUAVE */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, x: 26, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 460,
                damping: 32,
                mass: 0.22,
              }}
              className={`w-full max-w-lg shrink-0 rounded-3xl bg-white dark:bg-[#151622] border-2 ${previewBorderClass} shadow-2xl flex flex-col max-h-[88vh] transition-colors duration-300`}
            >
              {/* Cabecera con Icono de Lápiz en Tema Unificado (Negro en claro / Blanco en oscuro) */}
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md flex items-center justify-center shrink-0">
                    <PencilSimple size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Editar Movimiento
                    </h3>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                {/* Alerta de Error */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <WarningCircle size={16} weight="bold" className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Concepto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Concepto / Detalle
                  </label>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ej. Almuerzo, Salario, Pago de Luz..."
                    required
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Monto y Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Monto (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <CalendarBlank size={13} weight="bold" /> Fecha
                    </label>
                    <CustomDatePicker
                      value={date}
                      onChange={setDate}
                    />
                  </div>
                </div>

                {/* Selector de Tipo de Movimiento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementType('expense')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        movementType === 'expense'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <ArrowUpRight size={14} weight="bold" />
                      <span>Gasto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType('income')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        movementType === 'income'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <ArrowDownLeft size={14} weight="bold" />
                      <span>Ingreso</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType('savings_deposit')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        movementType === 'savings_deposit'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <PiggyBank size={14} weight="bold" />
                      <span>Aporte Ahorro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType('savings_withdrawal')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        movementType === 'savings_withdrawal'
                          ? 'bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <ArrowUpRight size={14} weight="bold" />
                      <span>Retiro Ahorro</span>
                    </button>
                  </div>
                </div>

                {/* Tarjeta y Categoría con Selectores Estilizados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label="Tarjeta / Cuenta"
                    value={walletId}
                    onChange={setWalletId}
                    options={walletOptions}
                    placeholder="Selecciona una tarjeta..."
                  />

                  <CustomSelect
                    label="Categoría"
                    value={categoryId}
                    onChange={(selId) => {
                      setCategoryId(selId);
                      const found = categories.find((c) => c.id === selId);
                      if (found) setCategoryName(found.name);
                    }}
                    options={categoryOptions}
                    placeholder="Selecciona una categoría..."
                  />
                </div>

                {/* Notas Adicionales */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Notas / Observaciones (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles adicionales sobre este movimiento..."
                    rows={2}
                    maxLength={300}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Botones de Acción */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-black/10 dark:shadow-black/30 cursor-pointer disabled:opacity-50"
                  >
                    <FloppyDisk size={16} weight="bold" />
                    <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

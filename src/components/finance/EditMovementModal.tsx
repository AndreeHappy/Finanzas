import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  PencilSimple,
  FloppyDisk,
  WarningCircle,
  CalendarBlank,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
} from '@phosphor-icons/react';
import type { Transaction, WalletCard, Category, MovementType } from '../../types';

interface EditMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  wallets: WalletCard[];
  categories: Category[];
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export const EditMovementModal: React.FC<EditMovementModalProps> = ({
  isOpen,
  onClose,
  transaction,
  wallets,
  categories,
  onSave,
}) => {
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

  // Inicializar campos cuando se abre el modal con una transacción
  useEffect(() => {
    if (transaction && isOpen) {
      setConcept(transaction.concept || '');
      setAmount(String(Math.abs(Number(transaction.amount) || 0)));
      setMovementType(transaction.type || 'expense');
      setWalletId(transaction.wallet_id || wallets[0]?.id || '');
      setCategoryId(transaction.category_id || '');
      setCategoryName(transaction.category_name || 'General');

      const formattedDate = transaction.date
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setDate(formattedDate);

      setNotes(transaction.notes || '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [transaction, isOpen, wallets]);

  if (!isOpen || !transaction) return null;

  // Filtrar categorías según tipo de movimiento si aplica
  const filteredCategories = categories.filter((c) => {
    if (movementType === 'income') {
      return c.type === 'income';
    }
    if (movementType === 'savings_deposit' || movementType === 'savings_withdrawal') {
      return true;
    }
    return c.type === 'expense';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const selectedCat = categories.find((c) => c.id === categoryId);
      const finalCatName = selectedCat ? selectedCat.name : (categoryName.trim() || 'General');
      const targetDate = date ? new Date(`${date}T12:00:00`).toISOString() : transaction.date;

      await onSave(transaction.id, {
        concept: concept.trim(),
        amount: parsedAmount,
        type: movementType,
        wallet_id: walletId,
        category_id: categoryId || undefined,
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

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#151622] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Cabecera */}
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <PencilSimple size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Editar Movimiento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Corrige los datos del registro seleccionado
                </p>
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
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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

            {/* Tarjeta y Categoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tarjeta Asociada */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Tarjeta / Cuenta
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  required
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type === 'savings' ? 'Ahorro' : w.type === 'cash' ? 'Efectivo' : 'Digital'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setCategoryId(selId);
                    const found = categories.find((c) => c.id === selId);
                    if (found) setCategoryName(found.name);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">{categoryName || 'General'}</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
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
    </AnimatePresence>,
    document.body
  );
};

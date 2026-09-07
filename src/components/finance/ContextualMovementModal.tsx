import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  CalendarBlank,
  WarningCircle,
  CreditCard,
  Money,
  CaretDown,
  Check,
} from '@phosphor-icons/react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { getCategoryIcon } from '../../constants/iconMap';
import type { WalletCard, Category, MovementType } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeWallet: WalletCard | undefined;
  wallets: WalletCard[];
  categories: Category[];
  onAddTransaction: (tx: {
    wallet_id: string;
    category_id?: string;
    category_name?: string;
    type: MovementType;
    amount: number;
    concept: string;
    notes?: string;
    date: string;
  }) => Promise<void>;
}

export const ContextualMovementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeWallet,
  wallets,
  categories,
  onAddTransaction,
}) => {
  const [targetWalletId, setTargetWalletId] = useState<string>(activeWallet?.id || '');
  const currentWallet = wallets.find((w) => w.id === targetWalletId) || activeWallet;

  const isSavings = currentWallet?.type === 'savings';

  // Modal type state
  const [movementType, setMovementType] = useState<MovementType>('income');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferDestinationId, setTransferDestinationId] = useState<string>('');
  const [transferSourceId, setTransferSourceId] = useState<string>('');
  const [isWalletSelectOpen, setIsWalletSelectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cuentas de gasto disponibles (digital y efectivo) para financiar o recibir ahorros
  const spendingWallets = wallets.filter((w) => w.type !== 'savings');

  useEffect(() => {
    if (spendingWallets.length > 0) {
      if (!transferDestinationId) setTransferDestinationId(spendingWallets[0].id);
      if (!transferSourceId) setTransferSourceId(spendingWallets[0].id);
    }
  }, [spendingWallets, transferDestinationId, transferSourceId]);

  // Ref para evitar que re-renders o cambios de pestaña reseteen el formulario mientras está abierto
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    // Solo inicializar cuando el modal pasa de cerrado a abierto
    if (isOpen && !prevIsOpenRef.current) {
      const initialWallet = activeWallet || wallets[0];
      if (initialWallet) {
        setTargetWalletId(initialWallet.id);
        if (initialWallet.type === 'savings') {
          setMovementType('savings_deposit');
        } else {
          setMovementType('income');
        }
      }
      setError(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Filtrar categorías según tipo
  const filteredCategories = categories.filter((c) => {
    if (movementType === 'expense') return c.type === 'expense';
    if (movementType === 'income') return c.type === 'income';
    return true;
  });

  useEffect(() => {
    if (filteredCategories.length > 0 && !categoryId) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wallets.length === 0) {
      setError('Debes tener al menos una tarjeta activa para registrar movimientos.');
      return;
    }
    if (!concept.trim()) {
      setError('Ingresa un concepto o descripción para el movimiento.');
      return;
    }
    if (amount <= 0) {
      setError('El monto debe ser superior a cero.');
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);

    try {
      setIsSubmitting(true);
      setError(null);

      // Construir la fecha exacta en la zona horaria local para evitar el desfase de 1 día (UTC midnight)
      const [y, m, d] = date.split('-').map(Number);
      const now = new Date();
      const localTxDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());

      // 1. Caso Ahorro - Depósito (Aporte al Ahorro): Se incrementa ahorro y se deduce de la cuenta de origen elegida
      if (isSavings && movementType === 'savings_deposit') {
        // Registrar depósito en la bóveda de ahorros
        await onAddTransaction({
          wallet_id: currentWallet?.id || targetWalletId,
          category_name: 'Depósito Ahorro',
          type: 'savings_deposit',
          amount,
          concept: concept.trim(),
          notes: notes.trim() || undefined,
          date: localTxDate.toISOString(),
        });

        // Registrar deducción automática en la tarjeta digital o efectivo seleccionada
        if (transferSourceId) {
          await onAddTransaction({
            wallet_id: transferSourceId,
            category_name: 'Reposición de Ahorro',
            type: 'expense',
            amount,
            concept: `Aporte a Ahorro: ${concept.trim()}`,
            notes: 'Deducción automática para fondo de ahorro protegido',
            date: localTxDate.toISOString(),
          });
        }
      } else if (isSavings && movementType === 'savings_withdrawal') {
        // 2. Caso Ahorro - Retiro: Se disminuye ahorro y se inyecta en la cuenta receptora seleccionada
        await onAddTransaction({
          wallet_id: currentWallet?.id || targetWalletId,
          category_name: 'Retiro Ahorro',
          type: 'savings_withdrawal',
          amount,
          concept: concept.trim(),
          notes: notes.trim() || undefined,
          date: localTxDate.toISOString(),
        });

        if (transferDestinationId) {
          await onAddTransaction({
            wallet_id: transferDestinationId,
            category_name: 'Retiro de Ahorro',
            type: 'income',
            amount,
            concept: `Retiro desde Ahorro: ${concept.trim()}`,
            notes: 'Inyección de liquidez desde fondo de ahorro',
            date: localTxDate.toISOString(),
          });
        }
      } else {
        // 3. Movimiento regular en cuenta libre (Digital o Efectivo)
        await onAddTransaction({
          wallet_id: currentWallet?.id || targetWalletId,
          category_id: categoryId || undefined,
          category_name: selectedCat?.name || 'General',
          type: movementType,
          amount,
          concept: concept.trim(),
          notes: notes.trim() || undefined,
          date: localTxDate.toISOString(),
        });
      }

      // Limpiar y cerrar
      setAmount(0);
      setConcept('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white/95 dark:bg-[#13141c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isSavings
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : movementType === 'income'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isSavings ? (
                  <PiggyBank size={22} weight="bold" />
                ) : movementType === 'income' ? (
                  <ArrowDownRight size={22} weight="bold" />
                ) : (
                  <ArrowUpRight size={22} weight="bold" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {isSavings ? 'Movimiento de Ahorro' : 'Registrar Movimiento'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentWallet?.name || 'Selecciona una cuenta'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Selector de Cuenta Personalizado sin Emojis */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                CUENTA SELECCIONADA
              </label>
              
              <button
                type="button"
                onClick={() => setIsWalletSelectOpen((prev) => !prev)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                      currentWallet?.type === 'cash'
                        ? 'bg-emerald-600'
                        : currentWallet?.type === 'savings'
                        ? 'bg-amber-600'
                        : 'bg-indigo-600'
                    }`}
                  >
                    {currentWallet?.type === 'cash' ? (
                      <Money size={18} weight="bold" />
                    ) : currentWallet?.type === 'savings' ? (
                      <PiggyBank size={18} weight="bold" />
                    ) : (
                      <CreditCard size={18} weight="bold" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      {currentWallet?.name || 'Seleccionar cuenta'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Saldo: S/. {(currentWallet?.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <CaretDown
                  size={16}
                  className={`text-slate-400 transition-transform ${
                    isWalletSelectOpen ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>

              {/* Menú Desplegable Estilizado */}
              <AnimatePresence>
                {isWalletSelectOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full inset-x-0 mt-1 z-30 bg-white dark:bg-[#151622] border border-slate-200 dark:border-white/[0.12] rounded-2xl shadow-2xl p-1.5 space-y-1"
                  >
                    {wallets.map((w) => {
                      const isSel = w.id === targetWalletId;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setTargetWalletId(w.id);
                            setIsWalletSelectOpen(false);
                            if (w.type === 'savings') {
                              setMovementType('savings_deposit');
                            } else {
                              setMovementType('income');
                            }
                          }}
                          className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between text-left ${
                            isSel
                              ? 'bg-slate-100 dark:bg-white/[0.08] ring-1 ring-emerald-500'
                              : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                                w.type === 'cash'
                                  ? 'bg-emerald-600'
                                  : w.type === 'savings'
                                  ? 'bg-amber-600'
                                  : 'bg-indigo-600'
                              }`}
                            >
                              {w.type === 'cash' ? (
                                <Money size={15} weight="bold" />
                              ) : w.type === 'savings' ? (
                                <PiggyBank size={15} weight="bold" />
                              ) : (
                                <CreditCard size={15} weight="bold" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {w.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Saldo: S/. {(w.balance || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {isSel && (
                            <Check size={16} weight="bold" className="text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tipo de movimiento: INGRESO PRIMERO, GASTO DESPUÉS */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                TIPO DE ACCIÓN
              </label>
              {isSavings ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('savings_deposit')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      movementType === 'savings_deposit'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownRight size={16} weight="bold" />
                    Aporte al Ahorro
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('savings_withdrawal')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      movementType === 'savings_withdrawal'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight size={16} weight="bold" />
                    Retiro de Ahorro
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Registrar Ingreso PRIMERO */}
                  <button
                    type="button"
                    onClick={() => setMovementType('income')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      movementType === 'income'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownRight size={16} weight="bold" />
                    Registrar Ingreso
                  </button>

                  {/* 2. Registrar Gasto SEGUNDO */}
                  <button
                    type="button"
                    onClick={() => setMovementType('expense')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      movementType === 'expense'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight size={16} weight="bold" />
                    Registrar Gasto
                  </button>
                </div>
              )}
            </div>

            {/* En aporte al ahorro: SELECCIONAR OBLIGATORIAMENTE ORIGEN (Tarjeta Digital o Efectivo) */}
            {isSavings && movementType === 'savings_deposit' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <PiggyBank size={17} weight="bold" />
                    ¿De dónde se extraerán los fondos para guardar?
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    Origen
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {spendingWallets.map((sw) => {
                    const isSelected = transferSourceId === sw.id;
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => setTransferSourceId(sw.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-start gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                            : 'border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-white/[0.03] hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          {sw.type === 'cash' ? <Money size={16} /> : <CreditCard size={16} />}
                          <span className="truncate">{sw.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          Saldo: S/. {(sw.balance || 0).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* En retiro de ahorro: seleccionar cuenta receptora de gasto libre */}
            {isSavings && movementType === 'savings_withdrawal' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <WarningCircle size={17} weight="bold" />
                    ¿A qué cuenta transferir el dinero retirado?
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    Destino
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {spendingWallets.map((sw) => {
                    const isSelected = transferDestinationId === sw.id;
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => setTransferDestinationId(sw.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-start gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                            : 'border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-white/[0.03] hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          {sw.type === 'cash' ? <Money size={16} /> : <CreditCard size={16} />}
                          <span className="truncate">{sw.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          Saldo: S/. {(sw.balance || 0).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                MONTO (S/.)
              </label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
              />
            </div>

            {/* Categoría: SOLO ICONOS SVG (Sin textos para máxima limpieza visual) */}
            {!isSavings && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  CATEGORÍA (ELIGE EL ICONO)
                </label>
                <div className="flex flex-wrap gap-2.5 p-2.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/[0.08] max-h-32 overflow-y-auto">
                  {filteredCategories.map((c) => {
                    const IconComp = getCategoryIcon(c.icon_name);
                    const isSelected = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.name}
                        onClick={() => setCategoryId(c.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-[#13141c] scale-110 shadow-md'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.color, color: '#ffffff' }}
                      >
                        <IconComp size={18} weight="bold" />
                      </button>
                    );
                  })}
                </div>
                {/* Nombre de la categoría activa como feedback sutil */}
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  Categoría seleccionada: {categories.find((c) => c.id === categoryId)?.name || 'General'}
                </span>
              </div>
            )}

            {/* Concepto */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isSavings
                  ? movementType === 'savings_withdrawal'
                    ? 'MOTIVO O URGENCIA DEL RETIRO'
                    : 'CONCEPTO DEL APORTE'
                  : 'DETALLE O CONCEPTO'}
              </label>
              <input
                type="text"
                placeholder={
                  isSavings
                    ? 'Ej. Reparación de emergencia'
                    : movementType === 'expense'
                    ? 'Ej. Almuerzo o compra semanal'
                    : 'Ej. Ingreso o cobro'
                }
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CalendarBlank size={14} /> FECHA
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-unified flex-1 py-2.5 px-4 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-lg shadow-black/10 dark:shadow-black/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

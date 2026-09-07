import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Money, PiggyBank } from '@phosphor-icons/react';
import { CurrencyInput } from '../ui/CurrencyInput';
import type { WalletType } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (card: {
    name: string;
    type: WalletType;
    color_gradient: string;
    card_number_suffix?: string;
    initial_balance: number;
  }) => Promise<any>;
}

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Esmeralda', bg: 'from-emerald-600 to-teal-800' },
  { id: 'cyan', label: 'Cian Océano', bg: 'from-cyan-600 to-blue-800' },
  { id: 'sapphire', label: 'Zafiro', bg: 'from-blue-700 to-indigo-900' },
  { id: 'violet', label: 'Amatista', bg: 'from-purple-600 to-violet-900' },
  { id: 'rose', label: 'Rosa Rubí', bg: 'from-rose-600 to-pink-800' },
  { id: 'amber', label: 'Ámbar Dorado', bg: 'from-amber-600 to-yellow-800' },
  { id: 'mint', label: 'Menta Billete', bg: 'from-teal-600 to-emerald-900' },
  { id: 'slate', label: 'Obsidiana Grafito', bg: 'from-zinc-700 to-zinc-900' },
];

export const AddCardModal: React.FC<Props> = ({ isOpen, onClose, onAddCard }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('digital');
  const [colorGradient, setColorGradient] = useState('emerald');
  const [initialBalance, setInitialBalance] = useState(0);
  const [suffix, setSuffix] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa un nombre para la tarjeta.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAddCard({
        name: name.trim(),
        type,
        color_gradient: colorGradient,
        card_number_suffix: type === 'digital' && suffix.trim() ? suffix.slice(-4) : undefined,
        initial_balance: initialBalance,
      });
      setName('');
      setInitialBalance(0);
      setSuffix('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarjeta.');
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
          className="relative w-full max-w-md bg-white dark:bg-[#0b0c12] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nueva Tarjeta o Billetera
            </h3>
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

            {/* Tipo de Fondo */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                TIPO DE CUENTA O FONDO
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('digital')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    type === 'digital'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <CreditCard size={22} weight={type === 'digital' ? 'bold' : 'regular'} />
                  Tarjeta Digital
                </button>

                <button
                  type="button"
                  onClick={() => setType('cash')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    type === 'cash'
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400'
                      : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <Money size={22} weight={type === 'cash' ? 'bold' : 'regular'} />
                  Billete Efectivo
                </button>

                <button
                  type="button"
                  onClick={() => setType('savings')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    type === 'savings'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <PiggyBank size={22} weight={type === 'savings' ? 'bold' : 'regular'} />
                  Bóveda Ahorro
                </button>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                NOMBRE DE LA TARJETA
              </label>
              <input
                type="text"
                placeholder={type === 'cash' ? 'Ej. Billetera de Bolsillo' : type === 'savings' ? 'Ej. Fondo de Reserva' : 'Ej. Tarjeta BCP Débito'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Terminación 4 dígitos (solo digital) */}
            {type === 'digital' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  ÚLTIMOS 4 DÍGITOS (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="4821"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest"
                />
              </div>
            )}

            {/* Saldo Inicial */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                SALDO INICIAL
              </label>
              <CurrencyInput
                value={initialBalance}
                onChange={setInitialBalance}
              />
            </div>

            {/* Paleta de Color */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                ESTILO / COLOR
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorGradient(c.id)}
                    className={`h-9 rounded-xl bg-gradient-to-r ${c.bg} transition-all relative ${
                      colorGradient === c.id
                        ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-[#0b0c12] scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Crear Tarjeta'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

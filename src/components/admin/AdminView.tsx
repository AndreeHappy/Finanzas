import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CreditCard,
  Receipt,
  Trash,
  Database,
  MagnifyingGlass,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  ShieldCheck,
  User,
  Crown,
  Money,
  PiggyBank,
  PencilSimple,
  CaretDown,
  Check,
  FloppyDisk,
  X,
  Plus,
} from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import type { UserProfile, WalletCard, Transaction } from '../../types';

interface Props {
  onBack: () => void;
}

type AdminTab = 'users' | 'wallets' | 'transactions' | 'overview';

export const AdminView: React.FC<Props> = ({ onBack }) => {
  const { user: currentUser, isAdmin, updateUserRole } = useAuth();
  const { refreshData: refreshFinanceData } = useFinance();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allWallets, setAllWallets] = useState<WalletCard[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado para el Dropdown estilizado de selección de usuarios
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mapa de usuarios por ID para lookup instantáneo de nombres y correos
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  // Mapa de tarjetas por ID para lookup instantáneo
  const walletMap = useMemo(() => {
    const map = new Map<string, WalletCard>();
    allWallets.forEach((w) => map.set(w.id, w));
    return map;
  }, [allWallets]);

  // CÁLCULO DINÁMICO DE SALDO REAL POR TARJETA SEGÚN MOVIMIENTOS
  const walletCalculatedData = useMemo(() => {
    const map = new Map<
      string,
      { currentBalance: number; txCount: number; totalIncome: number; totalExpense: number }
    >();

    allWallets.forEach((w) => {
      const wTxs = allTransactions.filter((t) => t.wallet_id === w.id);
      let currentBalance = Number(w.initial_balance) || 0;
      let totalIncome = 0;
      let totalExpense = 0;

      for (const tx of wTxs) {
        const amt = Number(tx.amount) || 0;
        if (w.type === 'savings') {
          if (tx.type === 'savings_deposit' || tx.type === 'income') {
            currentBalance += amt;
            totalIncome += amt;
          } else if (tx.type === 'savings_withdrawal' || tx.type === 'expense') {
            currentBalance -= amt;
            totalExpense += amt;
          }
        } else {
          if (tx.type === 'income') {
            currentBalance += amt;
            totalIncome += amt;
          } else if (tx.type === 'expense' || tx.type === 'savings_deposit') {
            currentBalance -= amt;
            totalExpense += amt;
          }
        }
      }

      map.set(w.id, {
        currentBalance: Math.max(0, currentBalance),
        txCount: wTxs.length,
        totalIncome,
        totalExpense,
      });
    });

    return map;
  }, [allWallets, allTransactions]);

  // Modales de Edición
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

  const [editingWallet, setEditingWallet] = useState<WalletCard | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletType, setEditWalletType] = useState<'digital' | 'cash' | 'savings'>('digital');
  const [editWalletInitialBalance, setEditWalletInitialBalance] = useState('0.00');
  const [editWalletColor, setEditWalletColor] = useState('emerald');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTxConcept, setEditTxConcept] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('0.00');
  const [editTxType, setEditTxType] = useState<Transaction['type']>('expense');
  const [editTxCategory, setEditTxCategory] = useState('General');
  const [editTxWalletId, setEditTxWalletId] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estado para Registrar Movimiento desde el Panel de Admin
  const [isCreatingTx, setIsCreatingTx] = useState(false);
  const [newTxUserId, setNewTxUserId] = useState('');
  const [newTxWalletId, setNewTxWalletId] = useState('');
  const [newTxConcept, setNewTxConcept] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxType, setNewTxType] = useState<Transaction['type']>('expense');
  const [newTxCategory, setNewTxCategory] = useState('General');
  const [newTxDate, setNewTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTxNotes, setNewTxNotes] = useState('');
  const [isSubmittingNewTx, setIsSubmittingNewTx] = useState(false);

  // Modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'wallet' | 'transaction';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar todos los datos desde Supabase
  const loadDatabaseData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    if (!isSupabaseConfigured || !supabase) {
      // Modo Mock
      const localUser = localStorage.getItem('app_finanzas_user_profile_v1');
      const parsedUser = localUser ? [JSON.parse(localUser)] : [];
      setUsers(parsedUser);

      const localWallets = localStorage.getItem('app_finanzas_wallets_v2');
      setAllWallets(localWallets ? JSON.parse(localWallets) : []);

      const localTx = localStorage.getItem('app_finanzas_transactions_v2');
      setAllTransactions(localTx ? JSON.parse(localTx) : []);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Usuarios / Profiles
      const { data: profilesData, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) throw pError;
      setUsers(profilesData || []);

      // 2. Todas las Tarjetas / Wallets (RPC admin primero para omitir RLS, fallback directo)
      let finalWallets: WalletCard[] = [];
      const { data: rpcWallets, error: rpcWErr } = await supabase.rpc('admin_get_all_wallets');
      if (!rpcWErr && Array.isArray(rpcWallets)) {
        finalWallets = rpcWallets;
      } else {
        const { data: directWallets, error: wError } = await supabase
          .from('wallets_cards')
          .select('*')
          .order('created_at', { ascending: false });
        if (wError) throw wError;
        finalWallets = directWallets || [];
      }
      setAllWallets(finalWallets);

      // 3. Todas las Transacciones (RPC admin primero para omitir RLS, fallback directo)
      let finalTx: Transaction[] = [];
      const { data: rpcTx, error: rpcTxErr } = await supabase.rpc('admin_get_all_transactions');
      if (!rpcTxErr && Array.isArray(rpcTx)) {
        finalTx = rpcTx;
      } else {
        const { data: directTx, error: tError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(500);
        if (tError) throw tError;
        finalTx = directTx || [];
      }
      setAllTransactions(finalTx);
    } catch (err: any) {
      console.error('Error al cargar datos en panel de administración:', err);
      setFeedback({
        type: 'error',
        message: `Error al conectar con la base de datos: ${err?.message || 'Fallo de consulta'}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Handlers para abrir modales de edición
  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditFullName(u.full_name || '');
    setEditPhone(u.phone_number || '');
    setEditRole(u.role === 'admin' || u.is_admin ? 'admin' : 'user');
  };

  const handleOpenEditWallet = (w: WalletCard) => {
    const calc = walletCalculatedData.get(w.id);
    setEditingWallet(w);
    setEditWalletName(w.name);
    setEditWalletType(w.type);
    setEditWalletInitialBalance(
      calc?.currentBalance !== undefined
        ? calc.currentBalance.toFixed(2)
        : Number(w.initial_balance || 0).toFixed(2)
    );
    setEditWalletColor(w.color_gradient || 'emerald');
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditTxConcept(tx.concept);
    setEditTxAmount(Number(tx.amount || 0).toFixed(2));
    setEditTxType(tx.type);
    setEditTxCategory(tx.category_name || 'General');
    setEditTxWalletId(tx.wallet_id);
    const txDate = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
    setEditTxDate(txDate);
    setEditTxNotes(tx.notes || '');
  };

  // Guardar edición de Usuario
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: editFullName.trim(),
            phone_number: editPhone.trim() || null,
            role: editRole,
            is_admin: editRole === 'admin',
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                full_name: editFullName.trim(),
                phone_number: editPhone.trim() || undefined,
                role: editRole,
                is_admin: editRole === 'admin',
              }
            : u
        )
      );

      setFeedback({
        type: 'success',
        message: `Perfil de "${editFullName.trim() || editingUser.email}" actualizado correctamente.`,
      });
      setEditingUser(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error actualizando usuario: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Guardar edición de Tarjeta
  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet) return;
    setIsSavingEdit(true);

    try {
      const parsedBalance = parseFloat(editWalletInitialBalance) || 0;

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('wallets_cards')
          .update({
            name: editWalletName.trim(),
            type: editWalletType,
            initial_balance: parsedBalance,
            color_gradient: editWalletColor,
          })
          .eq('id', editingWallet.id);

        if (error) throw error;
      }

      setAllWallets((prev) =>
        prev.map((w) =>
          w.id === editingWallet.id
            ? {
                ...w,
                name: editWalletName.trim(),
                type: editWalletType,
                initial_balance: parsedBalance,
                color_gradient: editWalletColor,
              }
            : w
        )
      );

      await refreshFinanceData();

      setFeedback({
        type: 'success',
        message: `Tarjeta "${editWalletName.trim()}" actualizada en base de datos.`,
      });
      setEditingWallet(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error actualizando tarjeta: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Sincronizar saldo actual calculado directamente al balance base en BD
  const handleSyncWalletBalance = async (wallet: WalletCard, currentBalance: number) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('wallets_cards')
          .update({
            initial_balance: currentBalance,
          })
          .eq('id', wallet.id);

        if (error) throw error;
      }

      setAllWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, initial_balance: currentBalance } : w))
      );

      await refreshFinanceData();

      setFeedback({
        type: 'success',
        message: `Saldo de "${wallet.name}" sincronizado en base de datos: S/. ${currentBalance.toFixed(2)}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al sincronizar saldo: ${err?.message || 'Error en base de datos'}`,
      });
    }
  };

  // Guardar edición de Transacción
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setIsSavingEdit(true);

    try {
      const parsedAmount = parseFloat(editTxAmount) || 0;
      const targetDate = editTxDate ? new Date(`${editTxDate}T12:00:00`).toISOString() : editingTransaction.date;

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('transactions')
          .update({
            concept: editTxConcept.trim(),
            amount: parsedAmount,
            type: editTxType,
            category_name: editTxCategory.trim() || 'General',
            wallet_id: editTxWalletId,
            date: targetDate,
            notes: editTxNotes.trim() || null,
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;
      }

      setAllTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? {
                ...t,
                concept: editTxConcept.trim(),
                amount: parsedAmount,
                type: editTxType,
                category_name: editTxCategory.trim() || 'General',
                wallet_id: editTxWalletId,
                date: targetDate,
                notes: editTxNotes.trim() || undefined,
              }
            : t
        )
      );

      await refreshFinanceData();

      setFeedback({
        type: 'success',
        message: `Movimiento "${editTxConcept.trim()}" actualizado correctamente.`,
      });
      setEditingTransaction(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error actualizando movimiento: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Abrir modal de Registro de Movimiento desde Admin
  const handleOpenCreateTx = (presetUserId?: string) => {
    const targetUid = presetUserId || (selectedUserFilter !== 'all' ? selectedUserFilter : users[0]?.id || '');
    setNewTxUserId(targetUid);
    const userWallets = allWallets.filter((w) => w.user_id === targetUid);
    setNewTxWalletId(userWallets[0]?.id || '');
    setNewTxConcept('');
    setNewTxAmount('');
    setNewTxType('expense');
    setNewTxCategory('General');
    setNewTxDate(new Date().toISOString().split('T')[0]);
    setNewTxNotes('');
    setIsCreatingTx(true);
  };

  // Guardar nuevo Movimiento registrado por Admin
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxUserId || !newTxWalletId || !newTxConcept.trim() || !newTxAmount) {
      setFeedback({ type: 'error', message: 'Por favor complete todos los campos obligatorios.' });
      return;
    }
    setIsSubmittingNewTx(true);

    try {
      const parsedAmount = parseFloat(newTxAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('El monto ingresado no es válido.');
      }

      const txDateIso = newTxDate ? new Date(`${newTxDate}T12:00:00`).toISOString() : new Date().toISOString();

      const newRecord = {
        user_id: newTxUserId,
        wallet_id: newTxWalletId,
        concept: newTxConcept.trim(),
        amount: parsedAmount,
        type: newTxType,
        category_name: newTxCategory.trim() || 'General',
        date: txDateIso,
        notes: newTxNotes.trim() || null,
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('transactions').insert(newRecord).select().single();
        if (error) throw error;
        if (data) {
          setAllTransactions((prev) => [data, ...prev]);
        }
      }

      await refreshFinanceData();
      await loadDatabaseData();

      setFeedback({
        type: 'success',
        message: `Movimiento "${newTxConcept.trim()}" registrado correctamente en la base de datos.`,
      });
      setIsCreatingTx(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al registrar movimiento: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSubmittingNewTx(false);
    }
  };

  // Ejecutar eliminación confirmada
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);

    try {
      if (deleteConfirm.type === 'user') {
        const targetUserId = deleteConfirm.id;

        if (isSupabaseConfigured && supabase) {
          // 1. Intentar borrado atómico total en Postgres (incluye auth.users, tarjetas, movimientos y categorías)
          const { error: rpcError } = await supabase.rpc('admin_delete_user', { target_user_id: targetUserId });

          if (rpcError) {
            // 2. Fallback secuencial tabla por tabla
            await supabase.from('transactions').delete().eq('user_id', targetUserId);
            await supabase.from('wallets_cards').delete().eq('user_id', targetUserId);
            await supabase.from('categories').delete().eq('user_id', targetUserId);
            const { error: pError } = await supabase.from('profiles').delete().eq('id', targetUserId);
            if (pError) throw pError;
          }
        }

        setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
        setAllWallets((prev) => prev.filter((w) => w.user_id !== targetUserId));
        setAllTransactions((prev) => prev.filter((t) => t.user_id !== targetUserId));

        setFeedback({
          type: 'success',
          message: `Usuario "${deleteConfirm.name}" y todos sus registros fueron eliminados de la base de datos.`,
        });
      } else if (deleteConfirm.type === 'wallet') {
        const targetWalletId = deleteConfirm.id;

        if (isSupabaseConfigured && supabase) {
          // Eliminar transacciones de esta tarjeta primero
          await supabase.from('transactions').delete().eq('wallet_id', targetWalletId);
          // Eliminar tarjeta
          const { error } = await supabase.from('wallets_cards').delete().eq('id', targetWalletId);
          if (error) throw error;
        }

        setAllWallets((prev) => prev.filter((w) => w.id !== targetWalletId));
        setAllTransactions((prev) => prev.filter((t) => t.wallet_id !== targetWalletId));

        setFeedback({
          type: 'success',
          message: `Tarjeta "${deleteConfirm.name}" y sus movimientos asociados fueron eliminados.`,
        });
      } else if (deleteConfirm.type === 'transaction') {
        const targetTxId = deleteConfirm.id;

        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.from('transactions').delete().eq('id', targetTxId);
          if (error) throw error;
        }

        setAllTransactions((prev) => prev.filter((t) => t.id !== targetTxId));

        setFeedback({
          type: 'success',
          message: `Movimiento eliminado correctamente.`,
        });
      }

      await refreshFinanceData();
    } catch (err: any) {
      console.error('Error al eliminar elemento:', err);
      setFeedback({
        type: 'error',
        message: `No se pudo completar la eliminación: ${err?.message || 'Error en Supabase'}`,
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Filtrados
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.nickname && u.nickname.toLowerCase().includes(term)) ||
        (u.phone_number && u.phone_number.includes(term))
    );
  }, [users, searchTerm]);

  const filteredWallets = useMemo(() => {
    let list = allWallets;
    if (selectedUserFilter !== 'all') {
      list = list.filter((w) => w.user_id === selectedUserFilter);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((w) => {
      const u = userMap.get(w.user_id);
      return (
        w.name.toLowerCase().includes(term) ||
        w.type.toLowerCase().includes(term) ||
        w.user_id.toLowerCase().includes(term) ||
        (u?.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u?.email && u.email.toLowerCase().includes(term))
      );
    });
  }, [allWallets, selectedUserFilter, searchTerm, userMap]);

  const filteredTransactions = useMemo(() => {
    let list = allTransactions;
    if (selectedUserFilter !== 'all') {
      list = list.filter((t) => t.user_id === selectedUserFilter);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((t) => {
      const u = userMap.get(t.user_id);
      const w = walletMap.get(t.wallet_id);
      return (
        (t.concept && t.concept.toLowerCase().includes(term)) ||
        (t.category_name && t.category_name.toLowerCase().includes(term)) ||
        t.type.toLowerCase().includes(term) ||
        t.user_id.toLowerCase().includes(term) ||
        (u?.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u?.email && u.email.toLowerCase().includes(term)) ||
        (w?.name && w.name.toLowerCase().includes(term))
      );
    });
  }, [allTransactions, selectedUserFilter, searchTerm, userMap, walletMap]);

  // Totales
  const totalVolume = useMemo(() => {
    return allTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [allTransactions]);

  // Cambiar rol de usuario (Admin / Usuario)
  const handleToggleRole = async (targetUser: UserProfile) => {
    if (!updateUserRole) return;
    const currentIsAdmin = targetUser.role === 'admin' || targetUser.is_admin === true;
    const nextRole: 'admin' | 'user' = currentIsAdmin ? 'user' : 'admin';
    const res = await updateUserRole(targetUser.id, nextRole);
    if (res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({
        type: 'success',
        message: `El usuario ${targetUser.full_name || targetUser.email} ahora tiene rol de ${nextRole === 'admin' ? 'Administrador' : 'Usuario'}.`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole, is_admin: nextRole === 'admin' } : u))
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl glass-panel text-center flex flex-col items-center gap-4 border border-rose-500/30 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center">
          <ShieldCheck size={36} weight="bold" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Acceso Denegado</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Esta área está restringida exclusivamente a usuarios con rol de Administrador.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="btn-unified py-2.5 px-6 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold cursor-pointer"
        >
          Regresar al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-28">
      {/* Barra Superior / Cabecera */}
      <div className="glass-panel rounded-3xl p-6 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Volver a Finanzas"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Database size={22} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Panel de Administración de Base de Datos
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Gestión directa de usuarios, cuentas y registros de Supabase sin salir de la aplicación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <span
            className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
            }`}
          >
            <ShieldCheck size={14} weight="bold" />
            {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local'}
          </span>

          <button
            type="button"
            onClick={loadDatabaseData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Recargar datos de la base de datos"
          >
            <ArrowsClockwise size={16} weight="bold" className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar BD</span>
          </button>
        </div>
      </div>

      {/* Alerta de Éxito / Error */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
              ) : (
                <WarningCircle size={18} weight="fill" className="text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards de Base de Datos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Usuarios Registrados</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{users.length}</span>
        </div>
        <div className="glass-panel rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tarjetas en Sistema</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{allWallets.length}</span>
        </div>
        <div className="glass-panel rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Movimientos Totales</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{allTransactions.length}</span>
        </div>
        <div className="glass-panel rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Volumen Procesado</span>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            S/. {totalVolume.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Selector de Pestaña y Buscador */}
      <div className="glass-panel rounded-3xl p-5 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] w-full sm:w-auto gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users size={16} weight="bold" />
              <span>Usuarios ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wallets')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'wallets'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard size={16} weight="bold" />
              <span>Tarjetas ({allWallets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt size={16} weight="bold" />
              <span>Movimientos ({allTransactions.length})</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* DROPDOWN ESTILIZADO DE SELECCIÓN DE USUARIO (REEMPLAZA AL SELECT NATIVO) */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users size={15} weight="bold" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[190px]">
                    {selectedUserFilter === 'all'
                      ? `Todos los Usuarios (${users.length})`
                      : userMap.get(selectedUserFilter)?.full_name ||
                        userMap.get(selectedUserFilter)?.email ||
                        'Usuario'}
                  </span>
                </div>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`text-slate-400 transition-transform duration-200 ${
                    isUserDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isUserDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-2xl bg-white/95 dark:bg-[#151722]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-1.5 z-50 divide-y divide-slate-100 dark:divide-white/[0.06]"
                  >
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserFilter('all');
                          setIsUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedUserFilter === 'all'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={16} weight="bold" />
                          <span>Todos los Usuarios</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10">
                          {users.length}
                        </span>
                      </button>
                    </div>

                    <div className="py-1 space-y-1">
                      {users.map((u) => {
                        const isSel = selectedUserFilter === u.id;
                        const isAdm = u.role === 'admin' || u.is_admin;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserFilter(u.id);
                              setIsUserDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                              isSel
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <span className="block truncate font-bold text-slate-900 dark:text-white">
                                  {u.full_name || 'Sin nombre'}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono truncate">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {isAdm && (
                                <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400" title="Administrador">
                                  <Crown size={13} weight="fill" />
                                </span>
                              )}
                              {isSel && <Check size={14} weight="bold" className="text-emerald-500" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative w-full sm:w-60">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en la tabla..."
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: USUARIOS */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Jerarquía / Rol</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Tarjetas</th>
                  <th className="py-3 px-4">Movimientos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const isUserAdmin = u.role === 'admin' || u.is_admin === true;
                    const userWalletsCount = allWallets.filter((w) => w.user_id === u.id).length;
                    const userTxsCount = allTransactions.filter((t) => t.user_id === u.id).length;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                              {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {u.full_name || 'Sin nombre'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${
                              isUserAdmin
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isUserAdmin ? (
                              <>
                                <Crown size={12} weight="fill" /> Admin
                              </>
                            ) : (
                              <>
                                <User size={12} weight="bold" /> Usuario
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {u.phone_number || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {userWalletsCount === 0 ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                              0 (Auto al ingresar)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserFilter(u.id);
                                setActiveTab('wallets');
                              }}
                              className="hover:underline text-emerald-600 dark:text-emerald-400 cursor-pointer"
                              title="Ver tarjetas de este usuario"
                            >
                              {userWalletsCount} tarjetas
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserFilter(u.id);
                              setActiveTab('transactions');
                            }}
                            className="hover:underline text-emerald-600 dark:text-emerald-400 cursor-pointer"
                            title="Ver movimientos de este usuario"
                          >
                            {userTxsCount} mov.
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver Tarjetas de este usuario */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserFilter(u.id);
                                setActiveTab('wallets');
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              title="Ver tarjetas de este usuario"
                            >
                              <CreditCard size={16} weight="bold" />
                            </button>

                            {/* Ver Movimientos de este usuario */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserFilter(u.id);
                                setActiveTab('transactions');
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Ver movimientos de este usuario"
                            >
                              <Receipt size={16} weight="bold" />
                            </button>

                            {/* Registrar Movimiento para este usuario */}
                            <button
                              type="button"
                              onClick={() => handleOpenCreateTx(u.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Registrar nuevo movimiento para este usuario"
                            >
                              <Plus size={16} weight="bold" />
                            </button>

                            {/* Botón Editar Usuario */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Editar datos del usuario"
                            >
                              <PencilSimple size={16} weight="bold" />
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleToggleRole(u)}
                                className={`px-2 py-1 rounded-xl text-[10px] font-black border transition-colors flex items-center gap-1 cursor-pointer ${
                                  isUserAdmin
                                    ? 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                    : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                }`}
                                title={isUserAdmin ? 'Quitar privilegios de Administrador' : 'Promover a Administrador'}
                              >
                                <Crown size={12} weight="bold" />
                                <span>{isUserAdmin ? 'Hacer Usuario' : 'Hacer Admin'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'user',
                                  id: u.id,
                                  name: u.full_name || u.email || 'Usuario',
                                })
                              }
                              className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar usuario y todos sus datos"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: TARJETAS (CON SALDO ACTUAL REAL SEGÚN MOVIMIENTOS) */}
        {activeTab === 'wallets' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/[0.06]">
                <tr>
                  <th className="py-3.5 px-4">Tarjeta</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Saldo Actual (Real)</th>
                  <th className="py-3.5 px-4">Movimientos</th>
                  <th className="py-3.5 px-4">Usuario Propietario</th>
                  <th className="py-3.5 px-4 text-right">Acciones Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {filteredWallets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No se encontraron tarjetas registradas.
                    </td>
                  </tr>
                ) : (
                  filteredWallets.map((w) => {
                    const owner = userMap.get(w.user_id);
                    const calc = walletCalculatedData.get(w.id);
                    const realBalance = calc?.currentBalance ?? Number(w.initial_balance || 0);
                    const txCount = calc?.txCount ?? 0;

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200">
                              {w.type === 'cash' ? (
                                <Money size={16} className="text-emerald-500" />
                              ) : w.type === 'savings' ? (
                                <PiggyBank size={16} className="text-amber-500" />
                              ) : (
                                <CreditCard size={16} className="text-indigo-500" />
                              )}
                            </div>
                            <span>{w.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                            {w.type === 'savings' ? 'Bóveda / Ahorro' : w.type === 'cash' ? 'Efectivo' : 'Digital'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 block">
                            S/. {realBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            según movimientos
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {txCount} mov.
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(owner?.full_name || owner?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[170px]">
                                {owner?.full_name || owner?.email || 'Usuario'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[170px]">
                                {owner?.email || w.user_id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Sincronizar saldo actual a BD */}
                            <button
                              type="button"
                              onClick={() => handleSyncWalletBalance(w, realBalance)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Sincronizar saldo real en la base de datos de Supabase"
                            >
                              <FloppyDisk size={16} weight="bold" />
                            </button>

                            {/* Editar Tarjeta */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditWallet(w)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              title="Editar nombre, tipo y saldo base de la tarjeta"
                            >
                              <PencilSimple size={16} weight="bold" />
                            </button>

                            {/* Eliminar Tarjeta */}
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'wallet',
                                  id: w.id,
                                  name: w.name,
                                })
                              }
                              className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar tarjeta"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MOVIMIENTOS (CON EDICIÓN Y REGISTRO DE MOVIMIENTOS) */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Total: </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{filteredTransactions.length}</span>{' '}
                movimiento(s)
                {selectedUserFilter !== 'all' && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    filtrados para {userMap.get(selectedUserFilter)?.full_name || userMap.get(selectedUserFilter)?.email}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateTx()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
              >
                <Plus size={15} weight="bold" />
                <span>Registrar Movimiento</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/[0.06]">
                  <tr>
                    <th className="py-3.5 px-4">Usuario & Cuenta</th>
                    <th className="py-3.5 px-4">Concepto / Categoría</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Monto</th>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4 text-right">Acciones Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium space-y-2">
                        <p>No se encontraron movimientos registrados con este filtro.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateTx()}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-black text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus size={14} weight="bold" />
                          <span>+ Registrar Primer Movimiento</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                  filteredTransactions.map((t) => {
                    const owner = userMap.get(t.user_id);
                    const wallet = walletMap.get(t.wallet_id);

                    const typeLabel =
                      t.type === 'income'
                        ? 'Ingreso'
                        : t.type === 'expense'
                        ? 'Gasto'
                        : t.type === 'savings_deposit'
                        ? 'Aporte Ahorro'
                        : 'Retiro Ahorro';

                    const isPositive = t.type === 'income';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(owner?.full_name || owner?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[140px]">
                                {owner?.full_name || owner?.email || 'Usuario'}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block truncate max-w-[140px]">
                                {wallet?.name || 'Tarjeta'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {t.concept || 'Sin concepto'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.category_name || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              t.type === 'savings_deposit'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : isPositive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isPositive ? '+' : '-'}S/. {Number(t.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(t.date).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Editar Movimiento */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditTransaction(t)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Editar este movimiento"
                            >
                              <PencilSimple size={16} weight="bold" />
                            </button>

                            {/* Eliminar Movimiento */}
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'transaction',
                                  id: t.id,
                                  name: t.concept || 'Movimiento',
                                })
                              }
                              className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar movimiento"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* MODAL 1: EDITAR USUARIO */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <User size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Modificar Perfil de Usuario
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {editingUser.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Nombre completo del usuario"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Ej. 920662684"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Rol / Jerarquía en Sistema
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole('user')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editRole === 'user'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <User size={14} weight="bold" />
                      <span>Usuario Estándar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('admin')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editRole === 'admin'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Crown size={14} weight="bold" />
                      <span>Administrador</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDITAR TARJETA */}
      <AnimatePresence>
        {editingWallet && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                    <CreditCard size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Modificar Tarjeta / Cuenta
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      ID: {editingWallet.id.substring(0, 10)}...
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveWallet} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Nombre de la Tarjeta / Billetera
                  </label>
                  <input
                    type="text"
                    value={editWalletName}
                    onChange={(e) => setEditWalletName(e.target.value)}
                    placeholder="Ej. Tarjeta Digital Principal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Tipo de Cuenta
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditWalletType('digital')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        editWalletType === 'digital'
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <CreditCard size={16} weight="bold" />
                      <span>Digital</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWalletType('cash')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        editWalletType === 'cash'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Money size={16} weight="bold" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWalletType('savings')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        editWalletType === 'savings'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <PiggyBank size={16} weight="bold" />
                      <span>Ahorro</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Balance Base Inicial (S/.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editWalletInitialBalance}
                    onChange={(e) => setEditWalletInitialBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Este monto se registra en Supabase como base para el cálculo de saldos.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingWallet(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDITAR MOVIMIENTO */}
      <AnimatePresence>
        {editingTransaction && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <Receipt size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Modificar Movimiento
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      ID: {editingTransaction.id.substring(0, 10)}...
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Concepto / Detalle
                  </label>
                  <input
                    type="text"
                    value={editTxConcept}
                    onChange={(e) => setEditTxConcept(e.target.value)}
                    placeholder="Ej. Almuerzo, LootBar, Pasajes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Monto (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editTxAmount}
                      onChange={(e) => setEditTxAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Fecha del Registro
                    </label>
                    <input
                      type="date"
                      value={editTxDate}
                      onChange={(e) => setEditTxDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTxType('expense')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        editTxType === 'expense'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTxType('income')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        editTxType === 'income'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTxType('savings_deposit')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        editTxType === 'savings_deposit'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Aporte Ahorro
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTxType('savings_withdrawal')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        editTxType === 'savings_withdrawal'
                          ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Retiro Ahorro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={editTxCategory}
                      onChange={(e) => setEditTxCategory(e.target.value)}
                      placeholder="Ej. Alimentación, Entretenimiento..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Tarjeta / Cuenta Asociada
                    </label>
                    <select
                      value={editTxWalletId}
                      onChange={(e) => setEditTxWalletId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      required
                    >
                      {allWallets
                        .filter(
                          (w) =>
                            w.user_id === editingTransaction.user_id ||
                            selectedUserFilter === 'all'
                        )
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.type})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Notas Adicionales
                  </label>
                  <textarea
                    rows={2}
                    value={editTxNotes}
                    onChange={(e) => setEditTxNotes(e.target.value)}
                    placeholder="Detalles u observaciones..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: CONFIRMACIÓN DE ELIMINACIÓN */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <Trash size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Confirmar Eliminación en Base de Datos
                  </h3>
                  <span className="text-xs text-slate-400">Esta acción es irreversible</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{deleteConfirm.name}"
                </strong>
                ?{' '}
                {deleteConfirm.type === 'user' &&
                  'Se borrarán también todas las tarjetas, categorías y movimientos asociados a este usuario en Supabase.'}
                {deleteConfirm.type === 'wallet' &&
                  'Se borrarán también todos los movimientos vinculados a esta tarjeta.'}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Definitivamente'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: REGISTRAR MOVIMIENTO (ADMIN) */}
      <AnimatePresence>
        {isCreatingTx && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <Plus size={22} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Registrar Movimiento (Admin)
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      Inserción directa en base de datos
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingTx(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-3.5">
                {/* Seleccionar Usuario */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Usuario Destino
                  </label>
                  <select
                    value={newTxUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setNewTxUserId(uid);
                      const uWallets = allWallets.filter((w) => w.user_id === uid);
                      setNewTxWalletId(uWallets[0]?.id || '');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Sin nombre'} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleccionar Tarjeta o Aviso si no tiene */}
                {(() => {
                  const targetUserWallets = allWallets.filter((w) => w.user_id === newTxUserId);

                  if (targetUserWallets.length === 0) {
                    return (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                        <p className="font-bold">Este usuario aún no cuenta con tarjetas en el sistema.</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                          Las 3 tarjetas base oficiales se crean de forma 100% automática en cuanto el usuario inicia sesión.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                        Tarjeta / Cuenta Asociada
                      </label>
                      <select
                        value={newTxWalletId}
                        onChange={(e) => setNewTxWalletId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        required
                      >
                        {targetUserWallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.type === 'savings' ? 'Ahorro' : w.type === 'cash' ? 'Efectivo' : 'Digital'})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Concepto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Concepto / Detalle
                  </label>
                  <input
                    type="text"
                    value={newTxConcept}
                    onChange={(e) => setNewTxConcept(e.target.value)}
                    placeholder="Ej. Depósito inicial, Pago de servicios, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Monto (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newTxAmount}
                      onChange={(e) => setNewTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                      Fecha del Registro
                    </label>
                    <input
                      type="date"
                      value={newTxDate}
                      onChange={(e) => setNewTxDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTxType('expense')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        newTxType === 'expense'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTxType('income')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        newTxType === 'income'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTxType('savings_deposit')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        newTxType === 'savings_deposit'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Aporte Ahorro
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTxType('savings_withdrawal')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        newTxType === 'savings_withdrawal'
                          ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Retiro Ahorro
                    </button>
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={newTxCategory}
                    onChange={(e) => setNewTxCategory(e.target.value)}
                    placeholder="Ej. Alimentación, Sueldo, General..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Notas Adicionales (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newTxNotes}
                    onChange={(e) => setNewTxNotes(e.target.value)}
                    placeholder="Observaciones de administración..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTx(false)}
                    disabled={isSubmittingNewTx}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewTx || !newTxWalletId}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNewTx ? 'Registrando...' : 'Registrar en BD'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


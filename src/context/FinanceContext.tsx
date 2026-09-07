import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { parseLocalDateParts } from '../utils/date';
import type {
  WalletCard,
  Category,
  Transaction,
  PeriodSummary,
  GlobalFinanceSummary,
} from '../types';

interface FinanceContextType {
  wallets: WalletCard[];
  selectedWalletId: string;
  selectedWallet: WalletCard | undefined;
  setSelectedWalletId: (id: string) => void;
  addWalletCard: (card: Omit<WalletCard, 'id' | 'user_id' | 'created_at' | 'balance'>) => Promise<WalletCard>;
  updateWalletCard: (id: string, updates: Partial<WalletCard>) => Promise<void>;
  deleteWalletCard: (id: string) => Promise<void>;

  categories: Category[];
  addCategory: (cat: Omit<Category, 'id' | 'user_id' | 'created_at'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  summary: GlobalFinanceSummary;
  getWalletSummary: (walletId: string) => {
    daily: PeriodSummary;
    monthly: PeriodSummary;
    yearly: PeriodSummary;
  };
  isLoading: boolean;
  refreshData: (overrideUserId?: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Claves de persistencia local (fallback seguro)
const LOCAL_WALLETS_KEY = 'app_finanzas_wallets_v2';
const LOCAL_CATEGORIES_KEY = 'app_finanzas_categories_v2';
const LOCAL_TRANSACTIONS_KEY = 'app_finanzas_transactions_v2';

const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const INITIAL_WALLETS: WalletCard[] = [
  {
    id: 'wallet-digital-1',
    user_id: 'local',
    name: 'Tarjeta Digital Principal',
    type: 'digital',
    color_gradient: 'emerald',
    card_number_suffix: '4821',
    initial_balance: 1450.00,
  },
  {
    id: 'wallet-cash-1',
    user_id: 'local',
    name: 'Billetera Efectivo',
    type: 'cash',
    color_gradient: 'mint',
    initial_balance: 320.00,
  },
  {
    id: 'wallet-savings-1',
    user_id: 'local',
    name: 'Bóveda de Ahorros',
    type: 'savings',
    color_gradient: 'sapphire',
    initial_balance: 950.00,
  },
];

const INITIAL_MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    user_id: 'local',
    wallet_id: 'wallet-digital-1',
    category_id: 'cat-inc-1',
    category_name: 'Salario / Nómina',
    type: 'income',
    amount: 2800.00,
    concept: 'Pago Quincena Empresa',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx-2',
    user_id: 'local',
    wallet_id: 'wallet-digital-1',
    category_id: 'cat-exp-1',
    category_name: 'Alimentación',
    type: 'expense',
    amount: 145.50,
    concept: 'Supermercado Mensual',
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tx-3',
    user_id: 'local',
    wallet_id: 'wallet-cash-1',
    category_id: 'cat-exp-2',
    category_name: 'Transporte',
    type: 'expense',
    amount: 25.00,
    concept: 'Combustible / Pasaje',
    date: new Date().toISOString(),
  },
  {
    id: 'tx-4',
    user_id: 'local',
    wallet_id: 'wallet-digital-1',
    category_id: 'cat-exp-4',
    category_name: 'Entretenimiento',
    type: 'expense',
    amount: 60.00,
    concept: 'Cine y Salida Fin de Semana',
    date: new Date().toISOString(),
  },
  {
    id: 'tx-5',
    user_id: 'local',
    wallet_id: 'wallet-savings-1',
    category_name: 'Ahorro Programado',
    type: 'savings_deposit',
    amount: 300.00,
    concept: 'Aporte fondo de emergencia',
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Wallets / Cards
  const [wallets, setWallets] = useState<WalletCard[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_WALLETS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_WALLETS;
    } catch {
      return INITIAL_WALLETS;
    }
  });

  const [selectedWalletId, setSelectedWalletId] = useState<string>(() => {
    return wallets[0]?.id || 'wallet-digital-1';
  });

  // 2. Categories
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  // 3. Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MOCK_TRANSACTIONS;
    } catch {
      return INITIAL_MOCK_TRANSACTIONS;
    }
  });

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_WALLETS_KEY, JSON.stringify(wallets));
    } catch (e) {
      console.error('Error guardando wallets en storage:', e);
    }
  }, [wallets]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Error guardando categories en storage:', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error guardando transactions en storage:', e);
    }
  }, [transactions]);

  // Carga sincronizada con Supabase si está disponible y autenticado
  const refreshData = useCallback(async (overrideUserId?: string) => {
    const targetUserId = overrideUserId || user?.id;
    if (!targetUserId || !isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 1. Cargar wallets_cards con reintento automático anti-race condition
      let remoteWallets: WalletCard[] | null = null;
      let wError: any = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, attempt * 200));
        }

        const res = await supabase
          .from('wallets_cards')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: true });

        if (!res.error && res.data && res.data.length > 0) {
          remoteWallets = res.data;
          wError = null;
          break;
        } else if (res.error) {
          wError = res.error;
        } else if (res.data) {
          remoteWallets = res.data;
        }
      }

      if (!wError && remoteWallets) {
        if (remoteWallets.length > 0) {
          setWallets(remoteWallets);
          setSelectedWalletId((prev) => (remoteWallets!.some((w) => w.id === prev) ? prev : remoteWallets![0].id));
        } else {
          // Si el usuario verdaderamente es nuevo y no tiene tarjetas en Supabase, crearlas automáticamente
          const defaultWalletsToInsert = [
            {
              user_id: targetUserId,
              name: 'Tarjeta Digital Principal',
              type: 'digital',
              color_gradient: 'emerald',
              card_number_suffix: '4821',
              initial_balance: 0.00,
            },
            {
              user_id: targetUserId,
              name: 'Billetera Efectivo',
              type: 'cash',
              color_gradient: 'mint',
              initial_balance: 0.00,
            },
            {
              user_id: targetUserId,
              name: 'Bóveda de Ahorros',
              type: 'savings',
              color_gradient: 'sapphire',
              initial_balance: 0.00,
            },
          ];

          const { data: createdWallets, error: insertWalletsErr } = await supabase
            .from('wallets_cards')
            .insert(defaultWalletsToInsert)
            .select();

          if (!insertWalletsErr && createdWallets && createdWallets.length > 0) {
            setWallets(createdWallets);
            setSelectedWalletId(createdWallets[0].id);
          }
        }
      }

      // 2. Cargar categories con reintento automático
      let remoteCategories: Category[] | null = null;
      let cError: any = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, attempt * 200));
        }

        const res = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: true });

        if (!res.error && res.data && res.data.length > 0) {
          remoteCategories = res.data;
          cError = null;
          break;
        } else if (res.error) {
          cError = res.error;
        } else if (res.data) {
          remoteCategories = res.data;
        }
      }

      if (!cError && remoteCategories) {
        if (remoteCategories.length > 0) {
          setCategories(remoteCategories);
        } else {
          // Si el usuario no tiene categorías creadas en Supabase, insertar las 10 oficiales automáticamente
          const defaultCategoriesToInsert = [
            { user_id: targetUserId, name: 'Alimentación', type: 'expense', icon_name: 'ForkKnife', color: '#f59e0b', is_system: false },
            { user_id: targetUserId, name: 'Transporte', type: 'expense', icon_name: 'Car', color: '#3b82f6', is_system: false },
            { user_id: targetUserId, name: 'Entretenimiento', type: 'expense', icon_name: 'GameController', color: '#ec4899', is_system: false },
            { user_id: targetUserId, name: 'Reposición de Ahorro', type: 'expense', icon_name: 'PiggyBank', color: '#06b6d4', is_system: false },
            { user_id: targetUserId, name: 'Otros Gastos', type: 'expense', icon_name: 'DotsThreeOutline', color: '#64748b', is_system: false },
            { user_id: targetUserId, name: 'Otros', type: 'income', icon_name: 'Tag', color: '#10b981', is_system: false },
            { user_id: targetUserId, name: 'Regalo', type: 'income', icon_name: 'Gift', color: '#8b5cf6', is_system: false },
            { user_id: targetUserId, name: 'Bonos', type: 'income', icon_name: 'TrendUp', color: '#f97316', is_system: false },
            { user_id: targetUserId, name: 'Retiro de Ahorro', type: 'income', icon_name: 'ArrowDownLeft', color: '#06b6d4', is_system: false },
            { user_id: targetUserId, name: 'Otros Ingresos', type: 'income', icon_name: 'Coins', color: '#14b8a6', is_system: false },
          ];

          const { data: createdCats, error: insertCatsErr } = await supabase
            .from('categories')
            .insert(defaultCategoriesToInsert)
            .select();

          if (!insertCatsErr && createdCats && createdCats.length > 0) {
            setCategories(createdCats);
          }
        }
      }

      // 3. Cargar transactions con reintento automático
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, attempt * 200));
        }

        const { data: remoteTx, error: tError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', targetUserId)
          .order('date', { ascending: false });

        if (!tError && remoteTx) {
          setTransactions(remoteTx);
          break;
        }
      }
    } catch (err) {
      console.warn('Operando en modo resiliente con datos locales:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Ejecutar carga al cambiar de usuario
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    if (user?.id) {
      refreshData(user.id);
    }
  }, [user?.id, refreshData]);

  // Escuchar eventos de autenticación de Supabase para recargar datos en cuanto haya sesión
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Verificar sesión existente en el cliente de Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        refreshData(data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
        refreshData(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshData]);

  // Calcular balances dinámicos por cada tarjeta
  const computedWallets = useMemo(() => {
    return wallets.map((wallet) => {
      const walletTxs = transactions.filter((t) => t.wallet_id === wallet.id);

      let currentBalance = Number(wallet.initial_balance) || 0;

      for (const tx of walletTxs) {
        const amt = Number(tx.amount) || 0;
        if (wallet.type === 'savings') {
          if (tx.type === 'savings_deposit' || tx.type === 'income') {
            currentBalance += amt;
          } else if (tx.type === 'savings_withdrawal' || tx.type === 'expense') {
            currentBalance -= amt;
          }
        } else {
          if (tx.type === 'income') {
            currentBalance += amt;
          } else if (tx.type === 'expense') {
            currentBalance -= amt;
          }
        }
      }

      return {
        ...wallet,
        balance: Math.max(0, currentBalance),
      };
    });
  }, [wallets, transactions]);

  const selectedWallet = useMemo(() => {
    return computedWallets.find((w) => w.id === selectedWalletId) || computedWallets[0];
  }, [computedWallets, selectedWalletId]);

  // Agregar nueva tarjeta
  const addWalletCard = async (
    cardData: Omit<WalletCard, 'id' | 'user_id' | 'created_at' | 'balance'>
  ): Promise<WalletCard> => {
    const newCard: WalletCard = {
      ...cardData,
      id: `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: user?.id || 'local',
      created_at: new Date().toISOString(),
    };

    if (user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('wallets_cards')
          .insert({
            user_id: user.id,
            name: cardData.name.trim(),
            type: cardData.type,
            color_gradient: cardData.color_gradient,
            card_number_suffix: cardData.card_number_suffix || null,
            initial_balance: cardData.initial_balance || 0,
          })
          .select()
          .single();

        if (!error && data) {
          setWallets((prev) => [...prev, data]);
          setSelectedWalletId(data.id);
          return data;
        }
      } catch (err) {
        console.warn('Error guardando en Supabase, guardando local:', err);
      }
    }

    setWallets((prev) => [...prev, newCard]);
    setSelectedWalletId(newCard.id);
    return newCard;
  };

  // Actualizar tarjeta
  const updateWalletCard = async (id: string, updates: Partial<WalletCard>) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('wallets_cards').update(updates).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Error actualizando tarjeta en Supabase:', err);
      }
    }

    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  // Eliminar tarjeta
  const deleteWalletCard = async (id: string) => {
    if (wallets.length <= 1) {
      throw new Error('Debe mantener al menos una tarjeta o billetera activa.');
    }

    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('wallets_cards').delete().eq('id', id);
      } catch (err) {
        console.warn('Error eliminando en Supabase:', err);
      }
    }

    setWallets((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      if (selectedWalletId === id && filtered.length > 0) {
        setSelectedWalletId(filtered[0].id);
      }
      return filtered;
    });

    // Limpiar transacciones huérfanas de esa tarjeta
    setTransactions((prev) => prev.filter((t) => t.wallet_id !== id));
  };

  // Agregar categoría
  const addCategory = async (
    catData: Omit<Category, 'id' | 'user_id' | 'created_at'>
  ): Promise<Category> => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: user?.id || 'local',
      created_at: new Date().toISOString(),
      is_system: false,
    };

    if (user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: catData.name.trim(),
            type: catData.type,
            icon_name: catData.icon_name,
            color: catData.color,
            is_system: false,
          })
          .select()
          .single();

        if (!error && data) {
          setCategories((prev) => [...prev, data]);
          return data;
        }
      } catch (err) {
        console.warn('Error guardando categoría en Supabase:', err);
      }
    }

    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  // Actualizar categoría
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('categories').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Error actualizando en Supabase:', err);
      }
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Eliminar categoría (permite eliminar cualquier categoría, incluidas las creadas por defecto)
  const deleteCategory = async (id: string) => {
    if (user && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando categoría en Supabase:', error);
        throw new Error(error.message || 'No se pudo eliminar la categoría de la base de datos.');
      }
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Registrar movimiento
  const addTransaction = async (
    txData: Omit<Transaction, 'id' | 'user_id' | 'created_at'>
  ) => {
    const sanitizedAmount = Math.abs(Number(txData.amount) || 0);
    if (sanitizedAmount <= 0) {
      throw new Error('El monto debe ser superior a cero.');
    }

    // 1. Normalizar nombres heredados (Comida -> Alimentación, Pasajes -> Transporte, etc.)
    let finalCategoryName = (txData.category_name || 'General').trim();
    const catNameLower = finalCategoryName.toLowerCase();
    if (catNameLower === 'comida') finalCategoryName = 'Alimentación';
    if (catNameLower === 'pasajes') finalCategoryName = 'Transporte';
    if (catNameLower === 'depósito ahorro' || catNameLower === 'reposición al fondo de ahorro') {
      finalCategoryName = 'Reposición de Ahorro';
    }
    if (catNameLower === 'inyección de ahorro' || catNameLower === 'retiro ahorro') {
      finalCategoryName = 'Retiro de Ahorro';
    }

    // 2. Resolver wallet_id válido en Supabase
    let targetWalletId = txData.wallet_id;
    if (!isValidUUID(targetWalletId)) {
      const match = wallets.find((w) => isValidUUID(w.id));
      if (match) targetWalletId = match.id;
    }

    // 3. Resolver category_id válido en Supabase (evita fallos de foreign key o invalid UUID)
    let targetCategoryId: string | null = null;
    if (isValidUUID(txData.category_id)) {
      targetCategoryId = txData.category_id || null;
    } else {
      const catNorm = finalCategoryName.toLowerCase();
      const matchedCat = categories.find((c) => {
        if (!isValidUUID(c.id)) return false;
        const cn = c.name.toLowerCase().trim();
        return (
          cn === catNorm ||
          (catNorm === 'alimentación' && (cn === 'alimentación' || cn === 'comida')) ||
          (catNorm === 'transporte' && (cn === 'transporte' || cn === 'pasajes')) ||
          (catNorm === 'reposición de ahorro' && (cn === 'reposición de ahorro' || cn === 'depósito ahorro')) ||
          (catNorm === 'retiro de ahorro' && (cn === 'retiro de ahorro' || cn === 'inyección de ahorro' || cn === 'retiro ahorro'))
        );
      });
      if (matchedCat) {
        targetCategoryId = matchedCat.id;
      }
    }

    const newTx: Transaction = {
      ...txData,
      wallet_id: targetWalletId,
      category_id: targetCategoryId || undefined,
      category_name: finalCategoryName,
      amount: sanitizedAmount,
      concept: txData.concept.trim(),
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: user?.id || 'local',
      created_at: new Date().toISOString(),
    };

    if (user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            wallet_id: targetWalletId,
            category_id: targetCategoryId,
            category_name: finalCategoryName,
            type: txData.type,
            amount: sanitizedAmount,
            concept: txData.concept.trim(),
            notes: txData.notes?.trim() || null,
            date: txData.date || new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error al insertar transacción en Supabase:', error);
          throw new Error(error.message || 'Error al guardar en base de datos');
        }

        if (data) {
          setTransactions((prev) => [data, ...prev]);
          return;
        }
      } catch (err: any) {
        console.warn('Error guardando transacción en Supabase, guardando localmente:', err);
        setTransactions((prev) => [newTx, ...prev]);
        throw err;
      }
    }

    setTransactions((prev) => [newTx, ...prev]);
  };

  // Actualizar movimiento
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('transactions').update(updates).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Error actualizando transacción en Supabase:', err);
      }
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Eliminar movimiento
  const deleteTransaction = async (id: string) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('transactions').delete().eq('id', id);
      } catch (err) {
        console.warn('Error eliminando en Supabase:', err);
      }
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Cálculo de resúmenes por tarjeta
  const getWalletSummary = useCallback(
    (walletId: string) => {
      const txs = transactions.filter((t) => t.wallet_id === walletId);

      const res = {
        daily: { income: 0, expenses: 0, net: 0 },
        monthly: { income: 0, expenses: 0, net: 0 },
        yearly: { income: 0, expenses: 0, net: 0 },
      };

      for (const tx of txs) {
        const { isToday, isThisMonth, isThisYear } = parseLocalDateParts(tx.date);

        // Identificar transferencias internas hacia o desde ahorros (no son gastos de consumo ni ingresos externos)
        const isSavingsTransfer =
          !tx.concept?.toLowerCase().includes('7ds') &&
          (tx.type === 'savings_deposit' ||
            tx.type === 'savings_withdrawal' ||
            tx.category_name === 'Reposición de Ahorro' ||
            tx.category_name === 'Depósito Ahorro' ||
            tx.category_name === 'Retiro de Ahorro' ||
            tx.category_name === 'Inyección de Ahorro' ||
            tx.concept?.toLowerCase().includes('aporte a ahorro') ||
            tx.concept?.toLowerCase().includes('reposición al fondo de ahorro'));

        const isInc = tx.type === 'income' && !isSavingsTransfer;
        const isExp = tx.type === 'expense' && !isSavingsTransfer;
        const amt = Number(tx.amount) || 0;

        if (isToday) {
          if (isInc) res.daily.income += amt;
          if (isExp) res.daily.expenses += amt;
        }
        if (isThisMonth) {
          if (isInc) res.monthly.income += amt;
          if (isExp) res.monthly.expenses += amt;
        }
        if (isThisYear) {
          if (isInc) res.yearly.income += amt;
          if (isExp) res.yearly.expenses += amt;
        }
      }

      res.daily.net = res.daily.income - res.daily.expenses;
      res.monthly.net = res.monthly.income - res.monthly.expenses;
      res.yearly.net = res.yearly.income - res.yearly.expenses;

      return res;
    },
    [transactions]
  );

  // Resumen global consolidado
  const summary = useMemo<GlobalFinanceSummary>(() => {
    let totalNetWorth = 0;
    let totalFreeSpending = 0;
    let totalSavings = 0;

    for (const w of computedWallets) {
      const bal = w.balance || 0;
      totalNetWorth += bal;
      if (w.type === 'savings') {
        totalSavings += bal;
      } else {
        totalFreeSpending += bal;
      }
    }

    const daily: PeriodSummary = { income: 0, expenses: 0, net: 0 };
    const monthly: PeriodSummary = { income: 0, expenses: 0, net: 0 };
    const yearly: PeriodSummary = { income: 0, expenses: 0, net: 0 };

    for (const tx of transactions) {
      const { isToday, isThisMonth, isThisYear } = parseLocalDateParts(tx.date);

      // Identificar transferencias internas hacia o desde ahorros (no son gastos de consumo ni ingresos externos)
      const isSavingsTransfer =
        !tx.concept?.toLowerCase().includes('7ds') &&
        (tx.type === 'savings_deposit' ||
          tx.type === 'savings_withdrawal' ||
          tx.category_name === 'Reposición de Ahorro' ||
          tx.category_name === 'Depósito Ahorro' ||
          tx.category_name === 'Retiro de Ahorro' ||
          tx.category_name === 'Inyección de Ahorro' ||
          tx.concept?.toLowerCase().includes('aporte a ahorro') ||
          tx.concept?.toLowerCase().includes('reposición al fondo de ahorro'));

      const isInc = tx.type === 'income' && !isSavingsTransfer;
      const isExp = tx.type === 'expense' && !isSavingsTransfer;
      const amt = Number(tx.amount) || 0;

      if (isToday) {
        if (isInc) daily.income += amt;
        if (isExp) daily.expenses += amt;
      }
      if (isThisMonth) {
        if (isInc) monthly.income += amt;
        if (isExp) monthly.expenses += amt;
      }
      if (isThisYear) {
        if (isInc) yearly.income += amt;
        if (isExp) yearly.expenses += amt;
      }
    }

    daily.net = daily.income - daily.expenses;
    monthly.net = monthly.income - monthly.expenses;
    yearly.net = yearly.income - yearly.expenses;

    return {
      totalNetWorth,
      totalFreeSpending,
      totalSavings,
      daily,
      monthly,
      yearly,
    };
  }, [computedWallets, transactions]);

  return (
    <FinanceContext.Provider
      value={{
        wallets: computedWallets,
        selectedWalletId,
        selectedWallet,
        setSelectedWalletId,
        addWalletCard,
        updateWalletCard,
        deleteWalletCard,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        summary,
        getWalletSummary,
        isLoading,
        refreshData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe utilizarse dentro de FinanceProvider');
  }
  return context;
};

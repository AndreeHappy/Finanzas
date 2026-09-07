import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isMockMode: boolean;
  isPasswordRecovery: boolean;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  inactivitySecondsLeft: number | null;
  extendSession: () => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  logout: (reason?: string) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  updateUserPassword: (newPassword: string) => Promise<{ error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ error?: string }>;
  verifyEmailOtp: (email: string, token: string, type?: 'signup' | 'email' | 'recovery') => Promise<{ error?: string }>;
  updateProfile: (data: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    phoneNumber?: string;
    age?: number;
    country?: string;
    city?: string;
    occupation?: string;
    avatarUrl?: string;
  }) => Promise<{ error?: string }>;
  isAdmin: boolean;
  updateUserRole: (targetUserId: string, newRole: 'admin' | 'user') => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'app_finanzas_auth_user_v1';
const SESSION_EXPIRED_KEY = 'app_finanzas_session_expired_notice';

const DEFAULT_ADMIN_EMAILS = [
  'andreesosa4f@gmail.com',
];

export const isEmailAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  if (DEFAULT_ADMIN_EMAILS.includes(clean)) return true;
  const envAdmins = ((import.meta.env.VITE_ADMIN_EMAILS as string) || '')
    .toLowerCase()
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean);
  return envAdmins.includes(clean);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_EXPIRED_KEY) || null;
  });
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number | null>(null);

  const LAST_ACTIVE_KEY = 'app_finanzas_last_active_timestamp';
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes strictly for mobile and web
  const WARNING_THRESHOLD_MS = 9 * 60 * 1000; // 9 minutes: warning appears 60s before closing

  const lastActivityRef = useRef<number>(Date.now());

  const clearSessionExpiredNotice = () => {
    setSessionExpiredNotice(null);
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  };

  const logout = useCallback(async (reason?: string) => {
    setInactivitySecondsLeft(null);
    if (reason) {
      sessionStorage.setItem(SESSION_EXPIRED_KEY, reason);
      setSessionExpiredNotice(reason);
    } else {
      clearSessionExpiredNotice();
    }

    localStorage.removeItem(LAST_ACTIVE_KEY);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out of Supabase:', err);
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
    setUser(null);
    setProfile(null);
  }, []);

  // 1. Record user activity ONLY on actual user interaction
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVE_KEY, `${now}`);
  }, []);

  const extendSession = useCallback(() => {
    recordActivity();
    setInactivitySecondsLeft(null);
  }, [recordActivity]);

  // 2. Pure check function - checks idle time, activates 60s warning or triggers auto-logout
  const checkInactivity = useCallback((): boolean => {
    const saved = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!saved) return false;
    const lastActive = parseInt(saved, 10);
    if (isNaN(lastActive) || lastActive <= 0) return false;

    const timeIdle = Date.now() - lastActive;
    if (timeIdle >= INACTIVITY_TIMEOUT_MS) {
      setInactivitySecondsLeft(null);
      logout('Tu sesión se cerró automáticamente tras 10 minutos de inactividad para proteger tus finanzas.');
      return true;
    } else if (timeIdle >= WARNING_THRESHOLD_MS) {
      const remainingSec = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - timeIdle) / 1000));
      setInactivitySecondsLeft(remainingSec);
    } else {
      setInactivitySecondsLeft(null);
    }
    return false;
  }, [logout]);

  // Track User Activity for Inactivity Auto-Logout (10 min on mobile & web)
  useEffect(() => {
    if (!user) {
      setInactivitySecondsLeft(null);
      return;
    }

    // Check inactivity immediately
    if (checkInactivity()) return;

    // User interaction events that refresh the active timer
    const interactionEvents = [
      'mousedown',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'click',
    ];

    const handleUserInteraction = () => {
      // First verify if already expired
      if (checkInactivity()) return;
      recordActivity();
      setInactivitySecondsLeft(null);
    };

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // When tab becomes visible again or gains focus, check if 10 min elapsed
    const handleVisibility = () => {
      checkInactivity();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    // Periodic check every 1 second for smooth countdown
    const interval = setInterval(() => {
      checkInactivity();
    }, 1000);

    return () => {
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
      clearInterval(interval);
    };
  }, [user, checkInactivity, recordActivity]);

  // Initialize auth state with strict inactivity check
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Check if user was previously inactive for > 10 minutes BEFORE restoring session
            const savedActive = localStorage.getItem(LAST_ACTIVE_KEY);
            if (savedActive) {
              const lastActiveTime = parseInt(savedActive, 10);
              if (!isNaN(lastActiveTime) && Date.now() - lastActiveTime >= INACTIVITY_TIMEOUT_MS) {
                // Session expired while user was away / tab was closed!
                localStorage.removeItem(LAST_ACTIVE_KEY);
                localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
                sessionStorage.setItem(SESSION_EXPIRED_KEY, 'Tu sesión se cerró automáticamente por inactividad tras 10 minutos.');
                setSessionExpiredNotice('Tu sesión se cerró automáticamente por inactividad tras 10 minutos.');
                try {
                  await supabase.auth.signOut();
                } catch {
                  // ignore
                }
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
              }
            }

            setUser({ id: session.user.id, email: session.user.email || '' });
            await fetchProfile(session.user.id, session.user.email || '');
            recordActivity();
          } else {
            // No active session
            localStorage.removeItem(LAST_ACTIVE_KEY);
          }
        } catch (err) {
          console.error('Error fetching Supabase session:', err);
        } finally {
          setLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          }

          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            await fetchProfile(session.user.id, session.user.email || '');
            recordActivity();
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        });

        return () => subscription.unsubscribe();
      } else {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
            recordActivity();
          } catch {
            // ignored
          }
        }
        setLoading(false);
      }
    }

    initAuth();
  }, [recordActivity]);

  // Asegurar que el usuario tenga sus 3 tarjetas base y 10 categorías oficiales
  const ensureUserHasDefaultWalletsAndCategories = async (userId: string) => {
    if (!isSupabaseConfigured || !supabase || !userId) return;
    try {
      // 1. Verificar si ya tiene tarjetas en Supabase
      const { data: existingWallets } = await supabase
        .from('wallets_cards')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingWallets || existingWallets.length === 0) {
        const defaultWalletsToInsert = [
          {
            user_id: userId,
            name: 'Tarjeta Digital Principal',
            type: 'digital',
            color_gradient: 'emerald',
            card_number_suffix: '4821',
            initial_balance: 0.0,
          },
          {
            user_id: userId,
            name: 'Billetera Efectivo',
            type: 'cash',
            color_gradient: 'mint',
            initial_balance: 0.0,
          },
          {
            user_id: userId,
            name: 'Bóveda de Ahorros',
            type: 'savings',
            color_gradient: 'sapphire',
            initial_balance: 0.0,
          },
        ];
        await supabase.from('wallets_cards').insert(defaultWalletsToInsert);
      }

      // 2. Verificar si ya tiene categorías
      const { data: existingCats } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingCats || existingCats.length === 0) {
        const defaultCategoriesToInsert = [
          { user_id: userId, name: 'Alimentación', type: 'expense', icon_name: 'ForkKnife', color: '#f59e0b', is_system: false },
          { user_id: userId, name: 'Transporte', type: 'expense', icon_name: 'Car', color: '#3b82f6', is_system: false },
          { user_id: userId, name: 'Entretenimiento', type: 'expense', icon_name: 'GameController', color: '#ec4899', is_system: false },
          { user_id: userId, name: 'Reposición de Ahorro', type: 'expense', icon_name: 'PiggyBank', color: '#06b6d4', is_system: false },
          { user_id: userId, name: 'Otros Gastos', type: 'expense', icon_name: 'DotsThreeOutline', color: '#64748b', is_system: false },
          { user_id: userId, name: 'Otros', type: 'income', icon_name: 'Tag', color: '#10b981', is_system: false },
          { user_id: userId, name: 'Regalo', type: 'income', icon_name: 'Gift', color: '#8b5cf6', is_system: false },
          { user_id: userId, name: 'Bonos', type: 'income', icon_name: 'TrendUp', color: '#f97316', is_system: false },
          { user_id: userId, name: 'Retiro de Ahorro', type: 'income', icon_name: 'ArrowDownLeft', color: '#06b6d4', is_system: false },
          { user_id: userId, name: 'Otros Ingresos', type: 'income', icon_name: 'Coins', color: '#14b8a6', is_system: false },
        ];
        await supabase.from('categories').insert(defaultCategoriesToInsert);
      }
    } catch (err) {
      console.warn('Error inicializando tarjetas o categorías por defecto:', err);
    }
  };

  const fetchProfile = async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const prof = data as UserProfile;
        if (isEmailAdmin(email) && prof.role !== 'admin') {
          prof.role = 'admin';
          prof.is_admin = true;
          supabase.from('profiles').update({ role: 'admin', is_admin: true }).eq('id', userId).then();
        }
        setProfile(prof);
      } else {
        const isUserAdmin = isEmailAdmin(email);
        const defaultProf: UserProfile = {
          id: userId,
          email,
          full_name: email.split('@')[0],
          role: isUserAdmin ? 'admin' : 'user',
          is_admin: isUserAdmin,
          created_at: new Date().toISOString(),
        };
        await supabase.from('profiles').insert(defaultProf);
        setProfile(defaultProf);
      }

      // Auto-inicializar tarjetas y categorías si el usuario no las tiene
      await ensureUserHasDefaultWalletsAndCategories(userId);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  const login = async (email: string, pass: string): Promise<{ error?: string }> => {
    clearSessionExpiredNotice();
    recordActivity();
    setInactivitySecondsLeft(null);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { error: error.message };
      if (data.user) {
        recordActivity();
        setUser({ id: data.user.id, email: data.user.email || '' });
        await fetchProfile(data.user.id, data.user.email || '');
        await ensureUserHasDefaultWalletsAndCategories(data.user.id);
      }
      return {};
    } else {
      const mockProf: UserProfile = {
        id: 'mock-user-1',
        email,
        full_name: email.split('@')[0] || 'Usuario Demo',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockProf));
      recordActivity();
      setUser({ id: mockProf.id, email: mockProf.email });
      setProfile(mockProf);
      return {};
    }
  };

  const register = async (
    email: string,
    pass: string,
    fullName: string
  ): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    clearSessionExpiredNotice();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) return { error: error.message };

      if (data.user && !data.session) {
        return { requiresEmailConfirmation: true };
      }

      if (data.user) {
        const prof: UserProfile = {
          id: data.user.id,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        };
        await supabase.from('profiles').upsert(prof);
        // Crear inmediatamente las 3 tarjetas oficiales y las 10 categorías en Supabase
        await ensureUserHasDefaultWalletsAndCategories(data.user.id);
        setUser({ id: data.user.id, email: data.user.email || '' });
        setProfile(prof);
        recordActivity();
      }
      return {};
    } else {
      const mockProf: UserProfile = {
        id: 'mock-user-1',
        email,
        full_name: fullName || email.split('@')[0],
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockProf));
      setUser({ id: mockProf.id, email: mockProf.email });
      setProfile(mockProf);
      recordActivity();
      return {};
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) return { error: error.message };
      return {};
    }
    return { error: 'Supabase no está configurado para restablecer contraseñas.' };
  };

  const updateUserPassword = async (newPassword: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) return { error: error.message };
      setIsPasswordRecovery(false);
      return {};
    }
    return { error: 'Supabase no está configurado.' };
  };

  const resendVerificationEmail = async (email: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) return { error: error.message };
      return {};
    }
    return { error: 'Supabase no está conectado.' };
  };

  const verifyEmailOtp = async (
    email: string,
    token: string,
    type: 'signup' | 'email' | 'recovery' = 'signup'
  ): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const cleanToken = token.trim();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type,
      });

      if (error) {
        // Si falló como 'signup', intentar como 'email'
        if (type === 'signup') {
          const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
            email,
            token: cleanToken,
            type: 'email',
          });
          if (!retryError && retryData.user) {
            setUser({ id: retryData.user.id, email: retryData.user.email || '' });
            await fetchProfile(retryData.user.id, retryData.user.email || '');
            recordActivity();
            return {};
          }
        }
        return { error: error.message };
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        await fetchProfile(data.user.id, data.user.email || '');
        recordActivity();
      }
      return {};
    } else {
      // Modo Mock / Demo
      const mockProf: UserProfile = {
        id: 'mock-user-1',
        email,
        full_name: email.split('@')[0],
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockProf));
      setUser({ id: mockProf.id, email: mockProf.email });
      setProfile(mockProf);
      recordActivity();
      return {};
    }
  };

  const updateProfile = async (data: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    phoneNumber?: string;
    age?: number;
    country?: string;
    city?: string;
    occupation?: string;
    avatarUrl?: string;
  }): Promise<{ error?: string }> => {
    if (!profile) return { error: 'No hay perfil activo.' };

    const updated: UserProfile = {
      ...profile,
      full_name: data.fullName !== undefined ? data.fullName : profile.full_name,
      first_name: data.firstName !== undefined ? data.firstName : profile.first_name,
      last_name: data.lastName !== undefined ? data.lastName : profile.last_name,
      nickname: data.nickname !== undefined ? data.nickname : profile.nickname,
      phone_number: data.phoneNumber !== undefined ? data.phoneNumber : profile.phone_number,
      age: data.age !== undefined ? data.age : profile.age,
      country: data.country !== undefined ? data.country : profile.country,
      city: data.city !== undefined ? data.city : profile.city,
      occupation: data.occupation !== undefined ? data.occupation : profile.occupation,
      avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : profile.avatar_url,
    };

    setProfile(updated);

    if (isSupabaseConfigured && supabase && user) {
      try {
        const payload: any = {
          full_name: updated.full_name,
        };
        if (updated.first_name !== undefined) payload.first_name = updated.first_name;
        if (updated.last_name !== undefined) payload.last_name = updated.last_name;
        if (updated.nickname !== undefined) payload.nickname = updated.nickname;
        if (updated.phone_number !== undefined) payload.phone_number = updated.phone_number;
        if (updated.age !== undefined) payload.age = updated.age;
        if (updated.country !== undefined) payload.country = updated.country;
        if (updated.city !== undefined) payload.city = updated.city;
        if (updated.occupation !== undefined) payload.occupation = updated.occupation;
        if (updated.avatar_url !== undefined) payload.avatar_url = updated.avatar_url;

        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (error) {
          // If columns do not exist in DB yet, fallback to saving base columns
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
            await supabase
              .from('profiles')
              .update({
                full_name: updated.full_name,
              })
              .eq('id', user.id);
          } else {
            return { error: error.message };
          }
        }
      } catch (err: any) {
        console.error('Error updating profile in Supabase:', err);
        return { error: err?.message || 'Error al actualizar perfil en la nube.' };
      }
    } else {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
    }

    return {};
  };

  const isAdmin = Boolean(
    profile?.role === 'admin' ||
    profile?.is_admin === true ||
    isEmailAdmin(user?.email) ||
    isEmailAdmin(profile?.email)
  );

  const updateUserRole = async (targetUserId: string, newRole: 'admin' | 'user'): Promise<{ error?: string }> => {
    if (!isAdmin) return { error: 'No tienes permisos de Administrador.' };
    if (!supabase) return { error: 'Supabase no está configurado.' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, is_admin: newRole === 'admin' })
        .eq('id', targetUserId);

      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('column')) {
          const { error: errFallback } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', targetUserId);
          if (errFallback) return { error: errFallback.message };
        } else {
          return { error: error.message };
        }
      }

      if (targetUserId === user?.id && profile) {
        setProfile({ ...profile, role: newRole, is_admin: newRole === 'admin' });
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Error al cambiar rol del usuario.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        updateUserRole,
        isMockMode: !isSupabaseConfigured,
        isPasswordRecovery,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
        inactivitySecondsLeft,
        extendSession,
        login,
        register,
        logout,
        signOut: logout,
        resetPasswordForEmail,
        updateUserPassword,
        resendVerificationEmail,
        verifyEmailOtp,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

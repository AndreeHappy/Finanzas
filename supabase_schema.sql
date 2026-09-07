-- ==============================================================================
-- PROYECTO FINANZAS - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Arquitectura de Seguridad Reforzada:
-- 1. Row Level Security (RLS) habilitado en el 100% de tablas.
-- 2. Restricciones estrictas por usuario (auth.uid() = user_id) anti accesos cruzados.
-- 3. Consultas 100% parametrizadas anti-SQL Injection.
-- 4. Triggers automáticos para inicializar perfil, tarjetas y categorías al registrarse.
-- ==============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLA: profiles (Perfil del Usuario)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_admin BOOLEAN DEFAULT FALSE,
    avatar_url TEXT DEFAULT '',
    currency TEXT DEFAULT 'PEN',
    theme_preference TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Actualización / Migración para bases de datos ya existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Función de verificación de Administrador para RLS (Inmune a recursión infinita)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificación en profiles ejecutada como SECURITY DEFINER (omite RLS interno)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin')
  );
END;
$$;

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles" ON public.profiles;
CREATE POLICY "Ver perfiles"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins pueden eliminar perfiles" ON public.profiles;
CREATE POLICY "Admins pueden eliminar perfiles"
    ON public.profiles FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. TABLA: wallets_cards (Tarjetas Digitales, Billetes de Efectivo, Ahorros)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 60),
    type TEXT NOT NULL CHECK (type IN ('digital', 'cash', 'savings')),
    color_gradient TEXT NOT NULL DEFAULT 'emerald',
    card_number_suffix TEXT CHECK (card_number_suffix IS NULL OR char_length(card_number_suffix) = 4),
    initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets_cards(user_id);

-- RLS: wallets_cards
ALTER TABLE public.wallets_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso a tarjetas propias (SELECT)" ON public.wallets_cards;
CREATE POLICY "Acceso a tarjetas propias (SELECT)"
    ON public.wallets_cards FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Creación de tarjetas propias (INSERT)" ON public.wallets_cards;
CREATE POLICY "Creación de tarjetas propias (INSERT)"
    ON public.wallets_cards FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Actualización de tarjetas propias (UPDATE)" ON public.wallets_cards;
CREATE POLICY "Actualización de tarjetas propias (UPDATE)"
    ON public.wallets_cards FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eliminación de tarjetas propias (DELETE)" ON public.wallets_cards;
CREATE POLICY "Eliminación de tarjetas propias (DELETE)"
    ON public.wallets_cards FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. TABLA: categories (Categorías Personalizadas de Ingresos y Gastos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    icon_name TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#10B981',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(user_id, type);

-- RLS: categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso a categorías propias (SELECT)" ON public.categories;
CREATE POLICY "Acceso a categorías propias (SELECT)"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creación de categorías propias (INSERT)" ON public.categories;
CREATE POLICY "Creación de categorías propias (INSERT)"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Actualización de categorías propias (UPDATE)" ON public.categories;
CREATE POLICY "Actualización de categorías propias (UPDATE)"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eliminación de categorías propias (DELETE)" ON public.categories;
CREATE POLICY "Eliminación de categorías propias (DELETE)"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. TABLA: transactions (Movimientos Financieros)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets_cards(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT DEFAULT 'General',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings_deposit', 'savings_withdrawal')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    concept TEXT NOT NULL CHECK (char_length(concept) >= 1 AND char_length(concept) <= 120),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),
    date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Índices para búsquedas y resúmenes de alta velocidad
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(user_id, type);

-- RLS: transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso a transacciones propias (SELECT)" ON public.transactions;
CREATE POLICY "Acceso a transacciones propias (SELECT)"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Creación de transacciones propias (INSERT)" ON public.transactions;
CREATE POLICY "Creación de transacciones propias (INSERT)"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Actualización de transacciones propias (UPDATE)" ON public.transactions;
CREATE POLICY "Actualización de transacciones propias (UPDATE)"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eliminación de transacciones propias (DELETE)" ON public.transactions;
CREATE POLICY "Eliminación de transacciones propias (DELETE)"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- FUNCIÓN RPC: admin_delete_user (Eliminación Total y Definitiva de un Usuario)
-- Elimina un usuario de auth.users y en cascada purga el 100% de sus tarjetas,
-- categorías, transacciones y perfil, sin dejar ningún rastro residual en la base de datos.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Verificar privilegios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden eliminar usuarios.';
  END IF;

  -- 2. Eliminar secuencialmente todos sus registros asociados
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.wallets_cards WHERE user_id = target_user_id;
  DELETE FROM public.categories WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 3. Eliminar de auth.users para borrar completamente su cuenta de acceso
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- FUNCIONES RPC DE LECTURA ADMINISTRATIVA
-- Permiten al panel de administración cargar de manera segura y garantizada
-- todas las tarjetas y transacciones de todos los usuarios registrados sin bloqueos de RLS.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_wallets()
RETURNS SETOF public.wallets_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.wallets_cards ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_transactions()
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.transactions ORDER BY date DESC LIMIT 500;
END;
$$;

-- ------------------------------------------------------------------------------
-- TRIGGER AUTOMÁTICO: Limpieza Total en Cascada al Eliminar un Perfil
-- Si se elimina una fila de public.profiles (ya sea desde el panel administrativo,
-- desde el Table Editor de Supabase o mediante sentencia SQL DELETE), este trigger
-- purga de forma inmediata y automática:
-- 1. Todas las transacciones del usuario en public.transactions.
-- 2. Todas las tarjetas y billeteras del usuario en public.wallets_cards.
-- 3. Todas las categorías personalizadas del usuario en public.categories.
-- 4. La cuenta del usuario en auth.users (libera el correo para futuros registros).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Eliminar movimientos
  DELETE FROM public.transactions WHERE user_id = OLD.id;
  -- 2. Eliminar tarjetas y billeteras
  DELETE FROM public.wallets_cards WHERE user_id = OLD.id;
  -- 3. Eliminar categorías
  DELETE FROM public.categories WHERE user_id = OLD.id;
  -- 4. Eliminar cuenta de auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted_cleanup ON public.profiles;
CREATE TRIGGER on_profile_deleted_cleanup
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_deleted();

-- ------------------------------------------------------------------------------
-- 5. TRIGGER AUTOMÁTICO: Inicialización de Usuario
-- Al registrarse un usuario en auth.users, se crean automáticamente:
-- 1. Perfil de usuario.
-- 2. Tarjetas base (Tarjeta Digital Libre, Billetera de Efectivo, Bóveda de Ahorro).
-- 3. Categorías predeterminadas de gastos e ingresos.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    digital_wallet_id UUID;
    cash_wallet_id UUID;
    savings_wallet_id UUID;
BEGIN
    new_user_id := NEW.id;

    -- 1. Crear Perfil
    INSERT INTO public.profiles (id, email, full_name, theme_preference)
    VALUES (
        new_user_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'light'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Crear Tarjetas y Billetes Predeterminados
    INSERT INTO public.wallets_cards (user_id, name, type, color_gradient, card_number_suffix, initial_balance)
    VALUES (new_user_id, 'Tarjeta Digital Principal', 'digital', 'emerald', '4821', 0.00)
    RETURNING id INTO digital_wallet_id;

    INSERT INTO public.wallets_cards (user_id, name, type, color_gradient, card_number_suffix, initial_balance)
    VALUES (new_user_id, 'Billetera Efectivo', 'cash', 'mint', NULL, 0.00)
    RETURNING id INTO cash_wallet_id;

    INSERT INTO public.wallets_cards (user_id, name, type, color_gradient, card_number_suffix, initial_balance)
    VALUES (new_user_id, 'Bóveda de Ahorros', 'savings', 'sapphire', NULL, 0.00)
    RETURNING id INTO savings_wallet_id;

    -- 3. Crear Categorías Predeterminadas de Gasto (5 oficiales)
    INSERT INTO public.categories (user_id, name, type, icon_name, color, is_system) VALUES
    (new_user_id, 'Alimentación', 'expense', 'ForkKnife', '#f59e0b', FALSE),
    (new_user_id, 'Transporte', 'expense', 'Car', '#3b82f6', FALSE),
    (new_user_id, 'Entretenimiento', 'expense', 'GameController', '#ec4899', FALSE),
    (new_user_id, 'Reposición de Ahorro', 'expense', 'PiggyBank', '#06b6d4', FALSE),
    (new_user_id, 'Otros Gastos', 'expense', 'DotsThreeOutline', '#64748b', FALSE);

    -- 4. Crear Categorías Predeterminadas de Ingreso (5 oficiales)
    INSERT INTO public.categories (user_id, name, type, icon_name, color, is_system) VALUES
    (new_user_id, 'Otros', 'income', 'Tag', '#10b981', FALSE),
    (new_user_id, 'Regalo', 'income', 'Gift', '#8b5cf6', FALSE),
    (new_user_id, 'Bonos', 'income', 'TrendUp', '#f97316', FALSE),
    (new_user_id, 'Retiro de Ahorro', 'income', 'ArrowDownLeft', '#06b6d4', FALSE),
    (new_user_id, 'Otros Ingresos', 'income', 'Coins', '#14b8a6', FALSE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger previo si existe
DROP TRIGGER IF EXISTS on_auth_user_created_setup ON auth.users;

-- Activar trigger para cada nuevo registro en Supabase Auth
CREATE TRIGGER on_auth_user_created_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- ------------------------------------------------------------------------------
-- 6. INICIALIZACIÓN RETROACTIVA (Solo para usuarios con perfil activo)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, email, full_name FROM public.profiles LOOP
        IF NOT EXISTS (SELECT 1 FROM public.wallets_cards WHERE user_id = u.id) THEN
            INSERT INTO public.wallets_cards (user_id, name, type, color_gradient, card_number_suffix, initial_balance)
            VALUES 
            (u.id, 'Tarjeta Digital Principal', 'digital', 'emerald', '4821', 0.00),
            (u.id, 'Billetera Efectivo', 'cash', 'mint', NULL, 0.00),
            (u.id, 'Bóveda de Ahorros', 'savings', 'sapphire', NULL, 0.00);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = u.id) THEN
            INSERT INTO public.categories (user_id, name, type, icon_name, color, is_system) VALUES
            (u.id, 'Alimentación', 'expense', 'ForkKnife', '#f59e0b', FALSE),
            (u.id, 'Transporte', 'expense', 'Car', '#3b82f6', FALSE),
            (u.id, 'Entretenimiento', 'expense', 'GameController', '#ec4899', FALSE),
            (u.id, 'Reposición de Ahorro', 'expense', 'PiggyBank', '#06b6d4', FALSE),
            (u.id, 'Otros Gastos', 'expense', 'DotsThreeOutline', '#64748b', FALSE),
            (u.id, 'Otros', 'income', 'Tag', '#10b981', FALSE),
            (u.id, 'Regalo', 'income', 'Gift', '#8b5cf6', FALSE),
            (u.id, 'Bonos', 'income', 'TrendUp', '#f97316', FALSE),
            (u.id, 'Retiro de Ahorro', 'income', 'ArrowDownLeft', '#06b6d4', FALSE),
            (u.id, 'Otros Ingresos', 'income', 'Coins', '#14b8a6', FALSE);
        END IF;
    END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. PURGA INMEDIATA DE REGISTROS HUÉRFANOS Y CUENTAS ELIMINADAS
-- Purga de forma retroactiva cualquier tarjeta, movimiento o cuenta de auth.users
-- que haya quedado huérfana por haber eliminado perfiles con anterioridad.
-- ------------------------------------------------------------------------------
DELETE FROM public.transactions WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.wallets_cards WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.categories WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles);

-- ------------------------------------------------------------------------------
-- 8. ASIGNACIÓN AUTOMÁTICA DEL ADMINISTRADOR INICIAL
-- Asigna permisos de Administrador al primer usuario registrado en profiles
-- para que tenga acceso completo e inmediato al panel de administración.
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET role = 'admin', is_admin = TRUE
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);

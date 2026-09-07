# Gestor de Finanzas Personales

Aplicación web especializada en control de flujo de caja personal con fondos blindados de ahorro, registro de ingresos/egresos bimonetario (Efectivo y Digital/Bancos), gastos futuros programados y auditoría de retiros de urgencia.

Construida con una arquitectura reactiva basada en **React 19**, **TypeScript**, **Tailwind CSS v4**, **Vite** y **Supabase**.

---

## Características Principales

### 1. Control de Flujo de Caja Bimonetario
- Registro diferenciado entre dinero **Físico/Efectivo** y dinero **Digital/Bancos**.
- Cálculo en tiempo real de saldos individuales y saldo total neto.
- Prevención activa de sobregiro por tipo de fondo.

### 2. Protección de Fondo de Ahorro Blindado
- Reserva protegida configurable (por defecto S/. 950.00).
- Cálculo automático de **Saldo Libre Para Gastos** (dinero disponible sin tocar la reserva).
- Protocolo de Confirmación de Urgencia: si un egreso compromete el ahorro, exige justificación detallada y registra una auditoría inmutable.
- Modal unificado de **Gestión de Ahorro**:
  - Sacar dinero del ahorro con motivo.
  - Reponer fondos retirados (con cálculo automático de déficit).
  - Aumentar permanentemente la base de ahorro.

### 3. Gastos Pendientes Programados a Futuro
- Registro de compromisos de pago con fecha y hora exacta futura.
- Visualización de impacto previo en el saldo libre.
- Consumo y descuento automático cuando se cumple la fecha y hora programada, o ejecución manual inmediata.

### 4. Historial, Filtros y Exportación a Excel
- Filtros dinámicos por tipo (Ingreso / Egreso) y fondo (Efectivo / Digital).
- Buscador en tiempo real por concepto, categoría o notas.
- Paginación personalizable (5, 10, 20 o Ver Todos) y orden cronológico inmutable.
- Descarga directa en formato CSV compatible con Microsoft Excel (UTF-8 con BOM).

### 5. Seguridad y Perfil de Usuario
- Autenticación segura vía Supabase Auth (correo y contraseña, recuperación de clave).
- Cierre automático de sesión tras 10 minutos de inactividad por seguridad en dispositivos móviles y de escritorio.
- Perfil de usuario completo con nombres, teléfono, edad, país, ciudad, ocupación, avatar y meta de ahorro base.
- Modo Local automático de respaldo si no hay conexión a Supabase.

---

## Estructura del Proyecto

```
Finanzas/
├── src/
│   ├── components/
│   │   ├── auth/          # Login, registro y recuperación de contraseña
│   │   ├── finance/       # Dashboard, BalanceCards, historial, modales de transacción y ahorro
│   │   ├── navigation/    # LiquidNavigator flotante
│   │   ├── profile/       # Vista y modal de perfil de usuario
│   │   ├── settings/      # Ajustes de tema y fondo
│   │   └── ui/            # CurrencyInput (estilo cajero), CustomSelect, StatusBadge, InteractiveBackground
│   ├── constants/         # Categorías de ingresos, egresos y paleta de colores
│   ├── context/           # Providers de Auth, Finanzas y Tema
│   ├── lib/               # Cliente Supabase
│   ├── styles/            # Tokens de diseño Obsidian Dark
│   ├── types/             # Definiciones de TypeScript
│   ├── utils/             # Formato de fechas y utilidades
│   ├── App.tsx            # Enrutador principal
│   ├── index.css          # Tailwind CSS v4 y temas
│   └── main.tsx           # Punto de entrada React 19
├── index.html
├── INICIAR_FINANZAS.bat   # Script de arranque rápido con 1 clic
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Configuración de Base de Datos (Supabase)

Para desplegar o verificar la base de datos en Supabase, utiliza el siguiente script SQL en el **SQL Editor** de tu proyecto:

```sql
-- 1. Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT,
  phone_number TEXT,
  age INTEGER,
  country TEXT,
  city TEXT,
  occupation TEXT,
  avatar_url TEXT,
  protected_reserve_base NUMERIC(12, 2) DEFAULT 950.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Movimientos Financieros
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'pending_expense')),
  fund_type TEXT NOT NULL CHECK (fund_type IN ('physical', 'digital')),
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  counterparty_concept TEXT NOT NULL,
  notes TEXT,
  date DATE NOT NULL,
  scheduled_datetime TIMESTAMPTZ,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Retiros de Urgencia (Auditoría)
CREATE TABLE IF NOT EXISTS emergency_withdrawals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id TEXT,
  amount_withdrawn NUMERIC(12, 2) NOT NULL,
  urgency_reason TEXT NOT NULL,
  previous_reserve NUMERIC(12, 2) NOT NULL,
  new_reserve NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar Seguridad por Fila (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_withdrawals ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Aislamiento de Datos por Usuario
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can access own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own emergencies" ON emergency_withdrawals
  FOR ALL USING (auth.uid() = user_id);
```

---

## Ejecución Local

### Opción 1: Con 1 solo clic (Recomendada en Windows)
Haz doble clic sobre el archivo `INICIAR_FINANZAS.bat`. Instalará dependencias si es la primera vez y abrirá automáticamente la aplicación en tu navegador.

### Opción 2: Desde la terminal
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

# Sistema de Gestion Financiera Personal y Multibilletera

Plataforma web para el control de finanzas personales, gestion multibilletera, seguimiento de flujos de caja, boveda de ahorros y administracion centralizada de usuarios.

Desarrollado con una arquitectura moderna de cliente desacoplado (Single Page Application) sobre React 19, TypeScript, Tailwind CSS y backend como servicio (BaaS) en Supabase PostgreSQL con politicas estrictas de seguridad a nivel de fila (Row Level Security).

---

## Indice

1. Caracteristicas del Sistema
2. Arquitectura y Tecnologias
3. Estructura del Proyecto
4. Requisitos del Sistema
5. Guia de Instalacion y Ejecucion Local
6. Configuracion de la Base de Datos (Supabase)
7. Comandos y Scripts Disponibles
8. Despliegue en Produccion (Vercel)
9. Buenas Practicas de Seguridad

---

## 1. Caracteristicas del Sistema

### 1.1. Arquitectura Multibilletera y Tarjetas Dinamicas
- Creacion y gestion de tarjetas de debito/credito digitales, billeteras fisicas de efectivo y bovedas de ahorro blindadas.
- Provision automatica de billeteras base para nuevos usuarios tras el registro (Tarjeta Digital Principal, Billetera Efectivo, Boveda de Ahorros).
- Control individual de balance inicial, saldo computado en tiempo real y transacciones asociadas por instrumento financiero.

### 1.2. Registro y Flujo de Movimientos
- Registro categorizado de Ingresos, Gastos y Transferencias entre cuentas.
- Modal contextual de transacciones con seleccion directa de tarjeta origen/destino.
- Recalculo reactivo inmediato de balances globales y especificos sin requerir recargas de pagina.
- Prevencion activa contra saldos negativos o registros huerfanos.

### 1.3. Clasificacion y Categorias
- Catalogo de categorias personalizables para clasificacion de egresos e ingresos.
- Iconografia vectorial y esquemas de color personalizables.
- Insercion automatica de categorias esenciales durante el aprovisionamiento de cuenta.

### 1.4. Panel de Administracion Centralizada
- Vista administrativa con control de acceso basado en roles (Role-Based Access Control - RBAC).
- Supervision integral de usuarios registrados, estado de cuentas y fecha de registro.
- Visualizacion en tiempo real de tarjetas y movimientos por usuario bajo politicas de administrador.
- Eliminacion en cascada definitiva mediante procedimiento almacenado admin_delete_user con permisos SECURITY DEFINER.

### 1.5. Seguridad y Aislamiento de Datos
- Row Level Security (RLS) habilitado en el 100% de las tablas relacionales de PostgreSQL.
- Aislamiento estricto por identificador de usuario (auth.uid() = user_id) que previene cualquier intento de acceso no autorizado entre clientes.
- Cierre automatico de sesion por inactividad a los 10 minutos para prevencion de accesos indebidos en dispositivos compartidos.
- Anonimizacion de datos sensibles en el codigo fuente y configuracion basada estrictamente en variables de entorno.

---

## 2. Arquitectura y Tecnologias

El proyecto utiliza una arquitectura de componentes modulares y desacoplados:

- Lenguaje: TypeScript 5.x (Tipado estatico y seguro en toda la aplicacion).
- Biblioteca Principal: React 19 (Hooks modernos, Context API para estado global).
- Herramienta de Construccion: Vite 6.x (Compilacion rapida y empaquetado optimizado).
- Estilos y Diseno: Tailwind CSS v4 (Clases utilitarias y variables CSS).
- Iconografia: Lucide React y Phosphor Icons.
- Backend y Persistencia: Supabase (PostgreSQL, GoTrue Auth, Row Level Security, Triggers y Funciones PL/pgSQL).

---

## 3. Estructura del Proyecto

```
Finanzas/
|-- .env.example               # Plantilla de variables de entorno requeridas
|-- supabase_schema.sql        # Esquema DDL, funciones PL/pgSQL y politicas RLS
|-- package.json               # Dependencias del proyecto y scripts de ejecucion
|-- tsconfig.json              # Configuracion de compilacion de TypeScript
|-- vite.config.ts             # Configuracion de empaquetado y plugins de Vite
|-- src/
    |-- App.tsx                # Enrutador principal y control de sesion
    |-- main.tsx               # Punto de entrada de la aplicacion
    |-- components/
    |   |-- admin/             # Panel de gestion de usuarios y auditoria
    |   |-- auth/              # Formularios de inicio de sesion y registro
    |   |-- finance/           # Dashboard, modales de transaccion, billeteras e historial
    |   |-- navigation/        # Barra de navegacion principal
    |   |-- profile/           # Gestion del perfil de usuario y preferencias
    |   |-- settings/          # Ajustes generales de apariencia
    |   |-- ui/                # Componentes atomicos reutilizables (inputs, botones, tarjetas)
    |-- context/
    |   |-- AuthContext.tsx    # Contexto de autenticacion, roles y aprovisionamiento
    |   |-- FinanceContext.tsx # Estado financiero, transacciones y balance de cuentas
    |   |-- ThemeContext.tsx   # Manejo de tema visual (claro / oscuro)
    |-- lib/
    |   |-- supabase.ts        # Inicializacion del cliente de Supabase
    |-- types/                 # Interfaces y tipos de datos TypeScript
    |-- utils/                 # Funciones auxiliares de formateo monetario y fechas
```

---

## 4. Requisitos del Sistema

Antes de iniciar la instalacion, asegurese de contar con las siguientes herramientas en su entorno:

- Node.js: Version 18.18.0 o superior (Recomendado LTS v20.x o v22.x).
- Gestor de Paquetes: npm version 9.x o superior (o pnpm / yarn equivalente).
- Navegador Web: Google Chrome, Mozilla Firefox, Microsoft Edge o Safari en versiones recientes.
- Cuenta de Supabase: Proyecto activo en https://supabase.com.

---

## 5. Guia de Instalacion y Ejecucion Local

### Paso 1: Clonar el repositorio
Clone el repositorio desde GitHub a su maquina local:

```bash
git clone https://github.com/tu-usuario/Finanzas.git
cd Finanzas
```

### Paso 2: Instalar dependencias
Ejecute el comando de instalacion para descargar todos los modulos requeridos:

```bash
npm install
```

### Paso 3: Configurar variables de entorno
Cree un archivo .env en la raiz del proyecto copiando la plantilla provista:

En Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

En Linux / macOS:
```bash
cp .env.example .env
```

Abra el archivo .env y complete los valores con las credenciales de su proyecto Supabase:

```env
VITE_SUPABASE_URL=https://tu-id-de-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica-de-supabase
VITE_ADMIN_EMAILS=administrador@tudominio.com
```

### Paso 4: Iniciar el servidor de desarrollo
Ejecute el siguiente comando para levantar el servidor local:

```bash
npm run dev
```

La aplicacion estara disponible en la direccion indicada en la consola (usualmente http://localhost:5173).

---

## 6. Configuracion de la Base de Datos (Supabase)

El sistema requiere una base de datos PostgreSQL alojada en Supabase con las tablas, politicas de seguridad y triggers debidamente estructurados.

### Paso 1: Ejecutar el script SQL
1. Inicie sesion en el panel de control de Supabase (https://supabase.com/dashboard).
2. Seleccione su proyecto.
3. En el menu lateral izquierdo, dirijase a la seccion SQL Editor.
4. Cree una nueva consulta (New query).
5. Copie la totalidad del contenido del archivo supabase_schema.sql ubicado en la raiz de este repositorio.
6. Pegue el codigo en el editor y haga clic en el boton Run.
7. Verifique que la ejecucion termine con exito (Success. No rows returned).

Este script realiza de forma automatica:
- La creacion de las tablas profiles, wallets_cards, categories y transactions.
- La activacion de Row Level Security (RLS) en cada una de las tablas.
- La implementacion de politicas de aislamiento estricto por usuario y de administracion.
- La creacion de los triggers de inicializacion automatica de cuentas y tarjetas.
- El procedimiento almacenado admin_delete_user para eliminacion en cascada total.

### Paso 2: Designar el primer usuario Administrador
Una vez registrado el primer usuario desde la interfaz web, puede elevar sus privilegios a Administrador ejecutando la siguiente consulta en el SQL Editor de Supabase:

```sql
UPDATE public.profiles
SET role = 'admin', is_admin = TRUE
WHERE email = 'correo-del-usuario@dominio.com';
```

---

## 7. Comandos y Scripts Disponibles

El archivo package.json incluye los siguientes scripts de desarrollo y produccion:

- npm run dev: Inicia el servidor de desarrollo local con recarga en caliente (Hot Module Replacement).
- npm run build: Compila el codigo TypeScript y genera los archivos estaticos optimizados para produccion en la carpeta dist/.
- npm run preview: Levanta un servidor HTTP local para previsualizar los archivos de produccion generados en dist/.
- npm run lint: Analiza el codigo fuente en busca de inconsistencias o errores de sintaxis y tipado mediante ESLint.

---

## 8. Despliegue en Produccion (Vercel)

La aplicacion esta optimizada para ser desplegada en Vercel con integracion continua desde GitHub:

### Paso 1: Importar Proyecto
1. Inicie sesion en vercel.com.
2. Haga clic en Add New... -> Project.
3. Conecte su cuenta de GitHub y seleccione el repositorio del proyecto.

### Paso 2: Configuracion del Build
Vercel detectara de manera automatica el entorno Vite:
- Framework Preset: Vite
- Root Directory: ./
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

### Paso 3: Configurar Variables de Entorno en Vercel
En la seccion Environment Variables del formulario de despliegue en Vercel, agregue:

| Clave | Descripcion | Ejemplo |
| :--- | :--- | :--- |
| VITE_SUPABASE_URL | URL publica del proyecto Supabase | https://xyzcompany.supabase.co |
| VITE_SUPABASE_ANON_KEY | Clave API publica anonima | eyJhbGciOiJIUzI1... |
| VITE_ADMIN_EMAILS | (Opcional) Correos de administradores | admin@tudominio.com |

### Paso 4: Desplegar
Haga clic en el boton Deploy. Una vez completado el proceso de construccion, Vercel proporcionara una URL publica con certificado SSL activo (por ejemplo, https://finanzas-app.vercel.app).

---

## 9. Buenas Practicas de Seguridad

1. Nunca exponga la llave service_role de Supabase en el codigo frontend ni en variables de entorno con prefijo VITE_. Dicha llave omite todas las politicas RLS y solo debe usarse en entornos backend seguros.
2. Mantenga actualizado el repositorio y los paquetes de dependencias ejecutando npm audit periodicamente.
3. Asegurese de que las politicas RLS de Supabase permanezcan activas en produccion para garantizar el aislamiento criptografico entre cuentas de usuario.

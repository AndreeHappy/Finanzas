/**
 * UTILIDADES DE SEGURIDAD, VALIDACIÓN Y BLINDAJE AVANZADO
 * - Detección y bloqueo estricto de SQL Injection
 * - Normalización y protección contra spam de alias de Gmail / correos temporales
 * - Vinculación de dispositivo único (una cuenta por celular / dispositivo)
 * - Rate Limiter y protección anti-fuerza bruta / anti-DDoS
 * - Sanitización estricta de entradas y fórmulas CSV
 */

// Lista de dominios de correos temporales / desechables conocidos
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'trashmail.com',
  'getairmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'maildrop.cc',
  'mohmal.com',
  'burnermail.io',
  'mytemp.email',
  'crazymailing.com',
]);

const DEVICE_ID_KEY = 'app_finanzas_device_fingerprint_v1';
const BOUND_ACCOUNT_KEY = 'app_finanzas_device_bound_account_v1';
const REGISTRATION_COOLDOWN_KEY = 'app_finanzas_device_reg_cooldown_v1';
const RATE_LIMIT_PREFIX = 'app_finanzas_ratelimit_';

// 24 horas de cooldown por dispositivo para evitar spam masivo de creación de cuentas
const DEVICE_REGISTRATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Valida si una cadena cumple con el formato estándar de correo electrónico RFC 5322 simplificado.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Normaliza una dirección de correo para prevenir el truco de puntos y alias (+) de Gmail
 * Ejemplo: "usuario.prueba+spam@gmail.com" -> "usuarioprueba@gmail.com"
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return clean;

  let [localPart, domain] = parts;

  // Si es dominio de Google / Gmail
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    domain = 'gmail.com';
    // 1. Quitar alias posteriores a '+'
    const plusIdx = localPart.indexOf('+');
    if (plusIdx !== -1) {
      localPart = localPart.substring(0, plusIdx);
    }
    // 2. Quitar todos los puntos intercalados (Gmail los ignora)
    localPart = localPart.replace(/\./g, '');
  } else {
    // Para otros dominios, también limpiar alias de '+'
    const plusIdx = localPart.indexOf('+');
    if (plusIdx !== -1) {
      localPart = localPart.substring(0, plusIdx);
    }
  }

  return `${localPart}@${domain}`;
}

/**
 * Comprueba si el correo pertenece a un proveedor de correos temporales o desechables.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Detección avanzada de patrones de SQL Injection (SQLi)
 * Bloquea tautologías, UNION queries, comentarios maliciosos y payloads de inyección.
 */
export function hasSqlInjectionPattern(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const patterns = [
    // Tautologías booleanas típicas: ' OR '1'='1, " OR 1=1 --, ' OR ''='
    /(?:'|")\s*(?:or|and)\s+[\w"']+\s*=\s*[\w"']/i,
    /(?:'|")\s*(?:or|and)\s+\d+\s*=\s*\d+/i,
    /\b(?:or|and)\s+1\s*=\s*1\b/i,
    /\b(?:or|and)\s+'\w+'\s*=\s*'\w+'/i,
    // Comentarios SQL usados para anular consultas: --, /* */, #
    /(?:--|\/\*|\*\/|#)/,
    // UNION SELECT / UNION ALL SELECT
    /\bunion\s+(?:all\s+)?select\b/i,
    // Comandos de modificación DDL / DML en cascada
    /;\s*(?:drop|alter|truncate|delete|insert|update|create|grant|revoke)\b/i,
    // Funciones de retraso / benchmark para inyección a ciegas (Time-based Blind SQLi)
    /\b(?:waitfor\s+delay|benchmark\s*\(|sleep\s*\(|pg_sleep\s*\()/i,
    // Ejecución de comandos del sistema operativo desde la base de datos
    /\b(?:xp_cmdshell|exec\s*\(|execute\s*\()/i,
  ];

  return patterns.some((rx) => rx.test(input));
}

/**
 * Valida la robustez de una contraseña.
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'La contraseña es obligatoria.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  if (password.length > 72) {
    return { isValid: false, error: 'La contraseña no puede exceder 72 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Sanitiza y limpia entradas de texto para prevenir caracteres de control, scripts o payloads.
 */
export function sanitizeTextInput(text: unknown, maxLength = 250): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // Eliminar caracteres de control
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida y sanitiza una entrada de texto contra inyección SQL.
 * Devuelve error si contiene caracteres o sintaxis de exploit SQL.
 */
export function validateSafeTextInput(
  text: unknown,
  maxLength = 250,
  fieldName = 'El texto'
): { isValid: boolean; value: string; error?: string } {
  if (typeof text !== 'string') {
    return { isValid: false, value: '', error: `${fieldName} debe ser una cadena válida.` };
  }

  const cleaned = sanitizeTextInput(text, maxLength);

  if (hasSqlInjectionPattern(cleaned)) {
    return {
      isValid: false,
      value: cleaned,
      error: `${fieldName} contiene caracteres o patrones no permitidos por seguridad (SQL Injection detectado).`,
    };
  }

  return { isValid: true, value: cleaned };
}

/**
 * Valida y sanitiza montos numéricos asegurando que sean positivos, números reales y con un límite razonable.
 */
export function sanitizeAmount(
  value: unknown,
  maxAmount = 10_000_000
): { isValid: boolean; amount: number; error?: string } {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '.'));

  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, amount: 0, error: 'El monto ingresado no es un número válido.' };
  }
  if (num <= 0) {
    return { isValid: false, amount: 0, error: 'El monto debe ser superior a cero.' };
  }
  if (num > maxAmount) {
    return {
      isValid: false,
      amount: 0,
      error: `El monto no puede superar los S/. ${maxAmount.toLocaleString('es-PE')}.`,
    };
  }

  const rounded = Math.round(num * 100) / 100;
  return { isValid: true, amount: rounded };
}

/**
 * Previene la inyección de fórmulas CSV (CSV Formula Injection / DDE Injection).
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  let sanitized = str;
  if (dangerousPrefixes.some((prefix) => sanitized.startsWith(prefix))) {
    sanitized = `'${sanitized}`;
  }

  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * GESTIÓN DE IDENTIDAD DE DISPOSITIVO ("UNA CUENTA POR CELULAR / DISPOSITIVO")
 */

/**
 * Obtiene o genera un identificador único seguro y persistente para este dispositivo móvil o navegador.
 */
export function getDeviceFingerprint(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generar fingerprint con entropía del navegador/móvil
      const screenDetails = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
      const lang = navigator.language || 'es';
      const randomPart = Math.random().toString(36).substring(2, 12);
      const timestamp = Date.now().toString(36);
      deviceId = `dev-${randomPart}-${timestamp}-${btoa(screenDetails + lang).slice(0, 8)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev-ephemeral-session';
  }
}

/**
 * Obtiene la cuenta vinculada a este dispositivo (si existe).
 */
export function getBoundDeviceAccount(): { email: string; boundAt: number } | null {
  try {
    const raw = localStorage.getItem(BOUND_ACCOUNT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignorar
  }
  return null;
}

/**
 * Vincula este dispositivo al correo de la cuenta activa.
 */
export function bindDeviceToAccount(email: string): void {
  try {
    const norm = normalizeEmail(email);
    const data = {
      email: norm,
      boundAt: Date.now(),
      deviceId: getDeviceFingerprint(),
    };
    localStorage.setItem(BOUND_ACCOUNT_KEY, JSON.stringify(data));
  } catch {
    // Ignorar
  }
}

/**
 * Desvincula la cuenta de este dispositivo (usado en logout explícito si se desea permitir cambio de cuenta).
 */
export function unbindDeviceAccount(): void {
  try {
    localStorage.removeItem(BOUND_ACCOUNT_KEY);
  } catch {
    // Ignorar
  }
}

/**
 * Valida si el dispositivo puede crear una nueva cuenta o si ya tiene una cuenta registrada (Una cuenta por celular).
 */
export function verifyDeviceRegistrationPolicy(candidateEmail: string): {
  allowed: boolean;
  reason?: string;
  boundEmail?: string;
} {
  try {
    const normCandidate = normalizeEmail(candidateEmail);
    const bound = getBoundDeviceAccount();

    // 1. Si el dispositivo ya está vinculado a una cuenta diferente
    if (bound && bound.email && bound.email !== normCandidate) {
      return {
        allowed: false,
        reason: `Este celular o dispositivo ya está vinculado a la cuenta (${bound.email.slice(0, 3)}***@${bound.email.split('@')[1]}). Por política de seguridad estricta contra cuentas duplicadas y ataques, solo se permite una cuenta por dispositivo.`,
        boundEmail: bound.email,
      };
    }

    // 2. Cooldown de registro por dispositivo para prevenir spam masivo
    const lastRegRaw = localStorage.getItem(REGISTRATION_COOLDOWN_KEY);
    if (lastRegRaw) {
      const lastRegTime = parseInt(lastRegRaw, 10);
      const elapsed = Date.now() - lastRegTime;
      if (elapsed < DEVICE_REGISTRATION_COOLDOWN_MS) {
        const remainingHours = Math.ceil((DEVICE_REGISTRATION_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return {
          allowed: false,
          reason: `Se registró recientemente una cuenta en este celular. Por seguridad anti-spam, debes esperar ${remainingHours} horas para crear otra cuenta desde este equipo.`,
        };
      }
    }
  } catch {
    // En caso de fallo de storage, permitir
  }

  return { allowed: true };
}

/**
 * Registra que se ha creado una cuenta en este dispositivo para activar el cooldown y la vinculación.
 */
export function markDeviceRegistered(email: string): void {
  try {
    localStorage.setItem(REGISTRATION_COOLDOWN_KEY, `${Date.now()}`);
    bindDeviceToAccount(email);
  } catch {
    // Ignorar
  }
}

/**
 * RATE LIMITER DEL LADO DEL CLIENTE
 * Protege contra saturación y ataques continuos de peticiones
 */
export function checkClientRateLimit(
  actionKey: string,
  maxAttempts = 5,
  windowMs = 60000
): { allowed: boolean; waitSeconds: number } {
  try {
    const key = `${RATE_LIMIT_PREFIX}${actionKey}`;
    const raw = sessionStorage.getItem(key);
    const now = Date.now();

    let record: { attempts: number; firstAttempt: number; lockedUntil?: number } = raw
      ? JSON.parse(raw)
      : { attempts: 0, firstAttempt: now };

    // Si está bloqueado
    if (record.lockedUntil && record.lockedUntil > now) {
      const wait = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
      return { allowed: false, waitSeconds: wait };
    }

    // Si la ventana expiró, reiniciar
    if (now - record.firstAttempt > windowMs) {
      record = { attempts: 1, firstAttempt: now };
      sessionStorage.setItem(key, JSON.stringify(record));
      return { allowed: true, waitSeconds: 0 };
    }

    // Incrementar intentos
    record.attempts += 1;

    if (record.attempts > maxAttempts) {
      // Bloquear por 60 segundos
      record.lockedUntil = now + windowMs;
      sessionStorage.setItem(key, JSON.stringify(record));
      return { allowed: false, waitSeconds: Math.ceil(windowMs / 1000) };
    }

    sessionStorage.setItem(key, JSON.stringify(record));
    return { allowed: true, waitSeconds: 0 };
  } catch {
    return { allowed: true, waitSeconds: 0 };
  }
}

/**
 * Valida en tiempo de ejecución que la clave pública de Supabase no sea una clave de servicio secreta ('service_role').
 */
export function verifyPublicAnonKey(key: string): { isSafe: boolean; warning?: string } {
  if (!key) return { isSafe: false, warning: 'Clave ausente.' };

  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);

      if (parsed.role === 'service_role') {
        console.error(
          'CRITICAL SECURITY ALERT: Has configurado la SUPABASE_SERVICE_ROLE_KEY en el cliente. Reemplázala inmediatamente por la clave pública anon.'
        );
        return {
          isSafe: false,
          warning:
            'ALERTA CRÍTICA: Se detectó una clave service_role en el frontend. Usa únicamente la clave anon pública.',
        };
      }
    }
  } catch {
    // Ignorar
  }

  return { isSafe: true };
}

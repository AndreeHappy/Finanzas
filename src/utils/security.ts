/**
 * UTILIDADES DE SEGURIDAD Y VALIDACIÓN
 * Implementación de directrices de blindaje para Frontend y Base de Datos
 */

/**
 * Valida si una cadena cumple con el formato estándar de correo electrónico RFC 5322 simplificado.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Valida la robustez de una contraseña.
 * Mínimo 6 caracteres (requisito de Supabase), recomienda al menos 8 caracteres con letras y números.
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'La contraseña es obligatoria.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  if (password.length > 72) {
    // bcrypt trunca a 72 bytes
    return { isValid: false, error: 'La contraseña no puede exceder 72 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Sanitiza y limpia entradas de texto para prevenir caracteres de control no imprimibles o payloads peligrosos.
 */
export function sanitizeTextInput(text: unknown, maxLength = 250): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // Eliminar caracteres de control
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida y sanitiza montos numéricos asegurando que sean positivos, números reales y con un límite razonable.
 */
export function sanitizeAmount(value: unknown, maxAmount = 10_000_000): { isValid: boolean; amount: number; error?: string } {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '.'));
  
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, amount: 0, error: 'El monto ingresado no es un número válido.' };
  }
  if (num <= 0) {
    return { isValid: false, amount: 0, error: 'El monto debe ser superior a cero.' };
  }
  if (num > maxAmount) {
    return { isValid: false, amount: 0, error: `El monto no puede superar los S/. ${maxAmount.toLocaleString('es-PE')}.` };
  }

  // Redondear estrictamente a 2 decimales para precisión financiera
  const rounded = Math.round(num * 100) / 100;
  return { isValid: true, amount: rounded };
}

/**
 * Previene la inyección de fórmulas CSV (CSV Formula Injection / DDE Injection).
 * Si una celda comienza con '=', '+', '-', '@', tabulaciones o retornos, se le antepone una comilla simple "'".
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  let sanitized = str;
  if (dangerousPrefixes.some((prefix) => sanitized.startsWith(prefix))) {
    sanitized = `'${sanitized}`;
  }

  // Escapar comillas dobles para formato RFC 4180
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Valida en tiempo de ejecución que la clave pública de Supabase no sea una clave de servicio secreta ('service_role').
 * Examina de forma segura el payload del JWT sin exponer la firma.
 */
export function verifyPublicAnonKey(key: string): { isSafe: boolean; warning?: string } {
  if (!key) return { isSafe: false, warning: 'Clave ausente.' };
  
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      // Es un JWT
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
          'CRITICAL SECURITY ALERT: Has configurado la SUPABASE_SERVICE_ROLE_KEY en el cliente. Esto otorga acceso de superusuario sin RLS. Reemplázala inmediatamente por la clave pública anon.'
        );
        return {
          isSafe: false,
          warning: 'ALERTA CRÍTICA: Se detectó una clave service_role en el frontend. Usa únicamente la clave anon pública.',
        };
      }
    }
  } catch {
    // Si no se puede decodificar, no es un JWT estándar de Supabase o es un formato nuevo
  }

  return { isSafe: true };
}

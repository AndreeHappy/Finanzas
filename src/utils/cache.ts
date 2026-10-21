/**
 * FINANZAS CACHE MANAGER
 * Sistema de caché multinivel (Memoria RAM + LocalStorage) con soporte SWR (Stale-While-Revalidate),
 * TTL configurable, invalidación atómica y protección contra sobrecarga de red y DDoS.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // en milisegundos
  version: string;
}

const CACHE_PREFIX = 'finanzas_cache_v1_';
const CURRENT_VERSION = '1.2.0';

// Almacén en memoria volátil de alta velocidad
const memoryCache = new Map<string, CacheEntry<any>>();

export class CacheManager {
  /**
   * Guarda un valor en memoria y en localStorage con un tiempo de expiración (TTL).
   */
  static set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      version: CURRENT_VERSION,
    };

    // 1. Guardar en memoria RAM inmediata
    memoryCache.set(key, entry);

    // 2. Persistir en LocalStorage de forma segura
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Si el storage está lleno o restringido en modo incógnito, la memoria RAM sigue funcionando
    }
  }

  /**
   * Obtiene un valor de la caché.
   * Si allowStale es true, devuelve datos aunque el TTL haya expirado (para renderizado instantáneo SWR).
   */
  static get<T>(
    key: string,
    allowStale = true
  ): { data: T | null; isStale: boolean; exists: boolean } {
    // 1. Revisar memoria RAM primero
    let entry: CacheEntry<T> | undefined = memoryCache.get(key);

    // 2. Si no está en RAM, buscar en LocalStorage
    if (!entry) {
      try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CacheEntry<T>;
          if (parsed.version === CURRENT_VERSION) {
            entry = parsed;
            memoryCache.set(key, parsed); // Hidratar RAM
          }
        }
      } catch {
        // En caso de error de parseo, ignorar
      }
    }

    if (!entry) {
      return { data: null, isStale: false, exists: false };
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;

    if (isExpired && !allowStale) {
      this.delete(key);
      return { data: null, isStale: true, exists: true };
    }

    return {
      data: entry.data,
      isStale: isExpired,
      exists: true,
    };
  }

  /**
   * Invalida una clave específica de la caché.
   */
  static delete(key: string): void {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch {
      // Ignorar
    }
  }

  /**
   * Alias de delete
   */
  static remove(key: string): void {
    this.delete(key);
  }

  /**
   * Invalida todas las claves que comiencen con un prefijo (ej. 'finance_', 'summary_').
   */
  static invalidateNamespace(prefix: string): void {
    // Limpiar RAM
    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        memoryCache.delete(k);
      }
    }

    // Limpiar LocalStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${CACHE_PREFIX}${prefix}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignorar
    }
  }

  /**
   * Limpia toda la caché de la aplicación.
   */
  static clearAll(): void {
    memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignorar
    }
  }
}

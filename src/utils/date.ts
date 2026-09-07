export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getShortDayName(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const name = d.toLocaleDateString('es-ES', { weekday: 'short' });
  return name.charAt(0).toUpperCase() + name.slice(1).replace('.', '');
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < getTodayString();
}

export function parseLocalDateParts(dateInput: string | Date | undefined): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  formattedDate: string;
  formattedShortDate: string;
  formattedTime: string;
  isToday: boolean;
  isThisMonth: boolean;
  isThisYear: boolean;
} {
  const now = new Date();
  if (!dateInput) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    return {
      year: y,
      month: m,
      day: d,
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      formattedDate: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
      formattedShortDate: now.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      formattedTime: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      isToday: true,
      isThisMonth: true,
      isThisYear: true,
    };
  }

  let y = now.getFullYear();
  let m = now.getMonth();
  let d = now.getDate();
  let h = now.getHours();
  let min = now.getMinutes();
  let s = now.getSeconds();

  if (typeof dateInput === 'string') {
    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/);
    if (isoMatch) {
      y = parseInt(isoMatch[1], 10);
      m = parseInt(isoMatch[2], 10) - 1;
      d = parseInt(isoMatch[3], 10);
      if (isoMatch[4]) h = parseInt(isoMatch[4], 10);
      if (isoMatch[5]) min = parseInt(isoMatch[5], 10);
      if (isoMatch[6]) s = parseInt(isoMatch[6], 10);
    } else {
      const dt = new Date(dateInput);
      if (!isNaN(dt.getTime())) {
        y = dt.getFullYear();
        m = dt.getMonth();
        d = dt.getDate();
        h = dt.getHours();
        min = dt.getMinutes();
        s = dt.getSeconds();
      }
    }
  } else if (dateInput instanceof Date) {
    y = dateInput.getFullYear();
    m = dateInput.getMonth();
    d = dateInput.getDate();
    h = dateInput.getHours();
    min = dateInput.getMinutes();
    s = dateInput.getSeconds();
  }

  const localObj = new Date(y, m, d, h, min, s);

  const formattedDate = `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
  const formattedShortDate = localObj.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = localObj.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const isThisYear = y === now.getFullYear();
  const isThisMonth = isThisYear && m === now.getMonth();
  const isToday = isThisMonth && d === now.getDate();

  return {
    year: y,
    month: m,
    day: d,
    hour: h,
    minute: min,
    second: s,
    formattedDate,
    formattedShortDate,
    formattedTime,
    isToday,
    isThisMonth,
    isThisYear,
  };
}

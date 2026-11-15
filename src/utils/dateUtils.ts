/**
 * Utilidades para manejo de fechas y horas adaptadas a la zona horaria de Perú (America/Lima, UTC-5).
 */

export const PERU_TIMEZONE = 'America/Lima';

/**
 * Convierte una fecha ISO (o actual) a formato 'YYYY-MM-DDTHH:mm' en la hora local de Perú,
 * ideal para inputs de tipo `<input type="datetime-local" />`.
 */
export const toPeruDateTimeLocal = (dateInput?: string | Date): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  
  // Usamos Intl para formatear según America/Lima
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  // Salida típica de 'en-CA' con h23: "2026-11-15, 13:45"
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

/**
 * Convierte el valor de un `<input type="datetime-local" />` (asumido en hora de Perú UTC-5)
 * a una cadena ISO UTC válida para guardar en BD.
 */
export const fromPeruDateTimeLocalToISO = (datetimeLocalVal: string): string => {
  if (!datetimeLocalVal) return new Date().toISOString();
  // Formato: "YYYY-MM-DDTHH:mm"
  // Perú está en UTC-05:00 constante (no tiene horario de verano).
  const withOffset = `${datetimeLocalVal}:00-05:00`;
  const date = new Date(withOffset);
  if (isNaN(date.getTime())) {
    return new Date(datetimeLocalVal).toISOString();
  }
  return date.toISOString();
};

/**
 * Obtiene el día de la semana y día numérico en zona horaria de Perú.
 */
export const formatPeruBadge = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  
  const weekdayStr = new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    weekday: 'short',
  }).format(date).replace('.', '');

  const dayStr = new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    day: 'numeric',
  }).format(date);

  return { weekdayStr, dayStr };
};

/**
 * Formato largo para cabeceras y detalles: "domingo, 15 de noviembre de 2026, 13:48"
 */
export const formatPeruLongDateTime = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

/**
 * Formato corto de fecha (DD/MM/YYYY) en hora de Perú
 */
export const formatPeruDateShort = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/**
 * Formato solo hora en zona horaria de Perú (ej. "01:45 p. m.")
 */
export const formatPeruTimeOnly = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

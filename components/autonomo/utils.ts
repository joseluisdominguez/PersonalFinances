import { Invoice, InvoiceLine, ReceivedInvoice, ReceivedInvoiceLine } from '../../types';

export const IVA_RATES = [0, 4, 10, 21];
export const DEFAULT_IRPF_PCT = 15;

export interface InvoiceTotals {
  baseImponible: number;
  ivaDesglose: Record<number, { base: number; cuota: number }>;
  totalIva: number;
  totalIrpf: number;
  total: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const calcLineBase = (line: InvoiceLine): number => {
  return round2(line.cantidad * line.precioUnitario);
};

export const calcInvoiceTotals = (
  lineas: InvoiceLine[],
  aplicaIrpf: boolean,
  irpfPct: number
): InvoiceTotals => {
  const ivaDesglose: Record<number, { base: number; cuota: number }> = {};
  let baseImponible = 0;

  for (const linea of lineas) {
    const base = calcLineBase(linea);
    baseImponible += base;
    const cuotaIva = round2(base * (linea.ivaPct / 100));
    const acc = ivaDesglose[linea.ivaPct] || { base: 0, cuota: 0 };
    ivaDesglose[linea.ivaPct] = {
      base: round2(acc.base + base),
      cuota: round2(acc.cuota + cuotaIva),
    };
  }

  baseImponible = round2(baseImponible);
  const totalIva = round2(
    Object.values(ivaDesglose).reduce((acc, { cuota }) => acc + cuota, 0)
  );
  const totalIrpf = aplicaIrpf ? round2(baseImponible * (irpfPct / 100)) : 0;
  const total = round2(baseImponible + totalIva - totalIrpf);

  return { baseImponible, ivaDesglose, totalIva, totalIrpf, total };
};

export const getNextInvoiceNumber = (
  facturas: Invoice[],
  ownerId: string,
  serie: string,
  year: number
): number => {
  const facturasMismoLote = facturas.filter(
    (f) =>
      f.ownerId === ownerId &&
      f.serie === serie &&
      new Date(f.fechaEmision).getFullYear() === year
  );
  if (facturasMismoLote.length === 0) return 1;
  return Math.max(...facturasMismoLote.map((f) => f.numero)) + 1;
};

export const formatInvoiceNumber = (
  serie: string,
  year: number,
  numero: number
): string => {
  return `${serie}-${year}-${String(numero).padStart(4, '0')}`;
};

export const getInvoiceDisplayNumber = (f: Invoice): string => {
  if (f.referenciaCustom && f.referenciaCustom.trim()) return f.referenciaCustom.trim();
  const year = new Date(f.fechaEmision).getFullYear();
  return formatInvoiceNumber(f.serie, year, f.numero);
};

/**
 * Toma una referencia tipo "JL00003" y devuelve "JL00004" para el nuevo número,
 * preservando el padding original. Si la ref no tiene formato prefijo+dígitos,
 * devuelve undefined para que el caller use el formato estándar.
 */
export const updateReferenciaNumber = (
  referencia: string | undefined,
  newNumber: number
): string | undefined => {
  if (!referencia) return undefined;
  const m = referencia.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return undefined;
  const prefix = m[1];
  const digitsLen = m[2].length;
  return `${prefix}${String(newNumber).padStart(digitsLen, '0')}`;
};

/**
 * Incrementa el último grupo de dígitos de un número externo, preservando
 * el padding y el texto que lo rodea. "FAC-2026-0012" -> "FAC-2026-0013".
 * Pensado para sugerir el siguiente número al clonar una factura recurrente.
 * Si no hay dígitos, devuelve el original sin cambios.
 */
export const incrementNumeroExterno = (numeroExterno: string): string => {
  const m = numeroExterno.match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return numeroExterno;
  const [, prefix, digits, suffix] = m;
  const next = String(Number(digits) + 1).padStart(digits.length, '0');
  return `${prefix}${next}${suffix}`;
};

export const isInvoiceOverdue = (invoice: Invoice, today = new Date()): boolean => {
  if (invoice.estado !== 'pendiente') return false;
  if (!invoice.fechaVencimiento) return false;
  return new Date(invoice.fechaVencimiento) < today;
};

export interface ReceivedInvoiceTotals {
  baseImponible: number;
  ivaDesglose: Record<number, { base: number; cuota: number }>;
  totalIva: number;
  totalIrpf: number;
  total: number;
}

export const calcReceivedLineBase = (line: ReceivedInvoiceLine): number => {
  return round2(line.cantidad * line.precioUnitario);
};

export const calcReceivedInvoiceTotals = (
  lineas: ReceivedInvoiceLine[],
  retencionIrpf: number = 0
): ReceivedInvoiceTotals => {
  const ivaDesglose: Record<number, { base: number; cuota: number }> = {};
  let baseImponible = 0;

  for (const linea of lineas) {
    const base = calcReceivedLineBase(linea);
    baseImponible += base;
    const cuotaIva = round2(base * (linea.ivaPct / 100));
    const acc = ivaDesglose[linea.ivaPct] || { base: 0, cuota: 0 };
    ivaDesglose[linea.ivaPct] = {
      base: round2(acc.base + base),
      cuota: round2(acc.cuota + cuotaIva),
    };
  }

  baseImponible = round2(baseImponible);
  const totalIva = round2(
    Object.values(ivaDesglose).reduce((acc, { cuota }) => acc + cuota, 0)
  );
  const totalIrpf = round2(baseImponible * (retencionIrpf / 100));
  const total = round2(baseImponible + totalIva - totalIrpf);

  return { baseImponible, ivaDesglose, totalIva, totalIrpf, total };
};

export const getQuarter = (date: string | Date): 1 | 2 | 3 | 4 => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const m = d.getMonth();
  if (m <= 2) return 1;
  if (m <= 5) return 2;
  if (m <= 8) return 3;
  return 4;
};

export const QUARTER_RANGES: Record<number, { from: string; to: string }> = {
  1: { from: '01-01', to: '03-31' },
  2: { from: '04-01', to: '06-30' },
  3: { from: '07-01', to: '09-30' },
  4: { from: '10-01', to: '12-31' },
};

export const filterByYearQuarter = <T extends { fechaEmision: string }>(
  items: T[],
  year: number,
  quarter: number | 'todo'
): T[] => {
  return items.filter((it) => {
    const d = new Date(it.fechaEmision);
    if (d.getFullYear() !== year) return false;
    if (quarter === 'todo') return true;
    return getQuarter(d) === quarter;
  });
};

// === IBAN (ISO 13616) ===

export const normalizeIban = (iban: string): string =>
  iban.replace(/\s+/g, '').toUpperCase();

export const formatIban = (iban: string): string => {
  const clean = normalizeIban(iban);
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean;
};

export const isValidIban = (iban: string): boolean => {
  const clean = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;
  if (clean.length < 15 || clean.length > 34) return false;

  // Mover los 4 primeros al final, convertir letras a (charCode - 55) y calcular mod 97
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const value = code >= 65 ? code - 55 : code - 48;
    // Procesar dígito a dígito para no perder precisión
    const str = value.toString();
    for (const d of str) {
      remainder = (remainder * 10 + Number(d)) % 97;
    }
  }
  return remainder === 1;
};

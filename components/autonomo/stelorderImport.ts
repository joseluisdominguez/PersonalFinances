import {
  Client,
  Supplier,
  Invoice,
  ReceivedInvoice,
  InvoiceStatus,
  ReceivedInvoiceStatus,
  InvoiceLine,
  ReceivedInvoiceLine,
} from '../../types';
import { generateId } from '../../utils';
import { IVA_RATES, DEFAULT_IRPF_PCT } from './utils';

const num = (v: string | undefined): number => {
  if (!v) return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const cleanNif = (v: string | undefined): string =>
  (v || '').replace(/[-\s]/g, '').toUpperCase();

const parseStelDate = (v: string | undefined): string | undefined => {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

const composeAddress = (
  direccion: string,
  localidad: string,
  cp: string,
  provincia: string
): string => {
  const partes = [direccion, [cp, localidad].filter(Boolean).join(' '), provincia]
    .map((s) => s.trim())
    .filter(Boolean);
  return partes.join(', ');
};

// Detecta serie + número a partir de "JL00003" → serie "JL", número 3
const parseRef = (ref: string): { serie: string; numero: number } => {
  const m = (ref || '').trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { serie: 'IMP', numero: 1 };
  return { serie: m[1].toUpperCase(), numero: Number(m[2]) };
};

// Devuelve el tipo de IVA estándar más cercano al ratio impuestos/base
export const inferIvaPct = (base: number, impuestos: number): number => {
  if (base <= 0) return 0;
  const ratio = (impuestos / base) * 100;
  let best = IVA_RATES[0];
  let bestDist = Math.abs(ratio - best);
  for (const r of IVA_RATES) {
    const d = Math.abs(ratio - r);
    if (d < bestDist) {
      best = r;
      bestDist = d;
    }
  }
  return best;
};

// === Clientes / Proveedores ===

export const mapToClient = (
  row: Record<string, string>,
  ownerId: string
): Client => ({
  id: (row['Referencia'] || '').trim() || generateId(),
  ownerId,
  nombre: row['Nombre jurídico'] || row['Nombre'] || '(sin nombre)',
  nif: cleanNif(row['CifNif']),
  direccion: composeAddress(
    row['Dirección'] || '',
    row['Localidad'] || '',
    row['Código postal'] || '',
    row['Provincia'] || ''
  ),
  email: row['Email'] || '',
  retencionPct: DEFAULT_IRPF_PCT,
  notas: row['Observaciones'] || '',
});

export const mapToSupplier = (
  row: Record<string, string>,
  ownerId: string
): Supplier => ({
  id: (row['Referencia'] || '').trim() || generateId(),
  ownerId,
  nombre: row['Nombre jurídico'] || row['Nombre'] || '(sin nombre)',
  nif: cleanNif(row['CifNif']),
  direccion: composeAddress(
    row['Dirección'] || '',
    row['Localidad'] || '',
    row['Código postal'] || '',
    row['Provincia'] || ''
  ),
  email: row['Email'] || '',
  notas: row['Observaciones'] || '',
});

// === Facturas de venta ===

const mapVentaStatus = (raw: string): InvoiceStatus => {
  const s = (raw || '').toLowerCase();
  if (s.includes('cobr') || s.includes('pag')) return 'pagada';
  if (s.includes('venc')) return 'vencida';
  if (s.includes('pend')) return 'pendiente';
  return 'borrador';
};

interface MapInvoiceCtx {
  ownerId: string;
  clientesByNif: Map<string, Client>;
}

export const mapToInvoice = (
  row: Record<string, string>,
  ctx: MapInvoiceCtx
): Invoice => {
  const ref = (row['Referencia'] || '').trim();
  const { serie, numero } = parseRef(ref);
  const fechaEmision = parseStelDate(row['Fecha']) || new Date().toISOString().slice(0, 10);
  const base = num(row['Total base']);
  const aplicaIrpf = (row['Impuesto sobre el total'] || '').trim().toLowerCase() === 'sí'
    || (row['Impuesto sobre el total'] || '').trim().toLowerCase() === 'si';
  const clienteNif = cleanNif(row['CIF/NIF del cliente']);
  const clienteExistente = ctx.clientesByNif.get(clienteNif);
  const clienteNombre = row['Nombre del cliente'] || row['Cliente'] || '';
  const clienteDir = composeAddress(
    row['Dir. de facturación'] || '',
    row['Localidad de la Dir. de facturación'] || '',
    row['Código postal de la Dir. de facturación'] || '',
    row['Provincia de la Dir. de facturación'] || ''
  );

  const titulo = (row['Título'] || '').trim();
  const descripcionLinea =
    [titulo, clienteNombre].filter(Boolean).join(' — ') ||
    `Servicios facturados a ${clienteNombre || 'cliente'}`;

  const linea: InvoiceLine = {
    id: generateId(),
    descripcion: descripcionLinea,
    cantidad: 1,
    precioUnitario: base,
    ivaPct: 21,
  };

  return {
    id: generateId(),
    ownerId: ctx.ownerId,
    clienteId: clienteExistente?.id || '',
    serie,
    numero,
    referenciaCustom: ref || undefined,
    fechaEmision,
    estado: mapVentaStatus(row['Estado'] || ''),
    lineas: [linea],
    aplicaIrpf,
    irpfPct: aplicaIrpf ? DEFAULT_IRPF_PCT : 0,
    notas: (row['Observaciones'] || '').trim() || `Importada de STEL Order (${ref})`,
    clienteSnapshot: {
      nombre: clienteNombre,
      nif: clienteNif,
      direccion: clienteDir,
    },
  };
};

// === Facturas de compra ===

const mapCompraStatus = (raw: string): ReceivedInvoiceStatus => {
  const s = (raw || '').toLowerCase();
  if (s.includes('pag')) return 'pagada';
  return 'pendiente';
};

interface MapReceivedCtx {
  ownerId: string;
  proveedoresByNif: Map<string, Supplier>;
}

export const mapToReceivedInvoice = (
  row: Record<string, string>,
  ctx: MapReceivedCtx
): ReceivedInvoice => {
  const base = num(row['Total base']);
  const impuestos = num(row['Total impuestos']);
  const ivaPct = inferIvaPct(base, impuestos);
  const fechaEmision =
    parseStelDate(row['Fecha']) || new Date().toISOString().slice(0, 10);
  const proveedorNif = cleanNif(row['CIF/NIF del proveedor']);
  const proveedor = ctx.proveedoresByNif.get(proveedorNif);
  const refStel = (row['Referencia'] || '').trim();
  const refProveedor = (row['Ref. documento proveedor'] || '').trim();
  const numeroExterno = refProveedor || refStel || '(sin nº)';

  const titulo = (row['Título'] || '').trim();
  const proveedorNombre = (
    row['Proveedor'] ||
    row['Nombre del proveedor'] ||
    proveedor?.nombre ||
    ''
  ).trim();
  const familia = (row['Familia del proveedor'] || '').trim();
  const observaciones = (row['Observaciones'] || '').trim();

  const descripcionLinea =
    [titulo, proveedorNombre].filter(Boolean).join(' — ') ||
    proveedorNombre ||
    'Compra';

  // Notas: observaciones si las hay + ref STEL si la externa es la del proveedor
  const notasPartes = [observaciones];
  if (refStel && refStel !== numeroExterno) {
    notasPartes.push(`Ref. STEL Order: ${refStel}`);
  }

  const linea: ReceivedInvoiceLine = {
    id: generateId(),
    descripcion: descripcionLinea,
    cantidad: 1,
    precioUnitario: base,
    ivaPct,
  };

  return {
    id: generateId(),
    ownerId: ctx.ownerId,
    proveedorId: proveedor?.id || '',
    numeroExterno,
    fechaEmision,
    estado: mapCompraStatus(row['Estado'] || ''),
    lineas: [linea],
    retencionIrpf: 0,
    categoria: familia,
    notas: notasPartes.filter(Boolean).join(' · '),
  };
};

// === Helpers de duplicados ===

export const indexByNif = <T extends { nif: string }>(items: T[]): Map<string, T> => {
  const map = new Map<string, T>();
  for (const it of items) {
    const key = cleanNif(it.nif);
    if (key) map.set(key, it);
  }
  return map;
};

export { cleanNif, parseStelDate, num };

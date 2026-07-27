
export type TransactionType = 'ingreso' | 'gasto';

export type TransactionCategory = string;

export interface Transaction {
  id: string;
  fecha: string; 
  nombre: string;
  tipo: TransactionType;
  categoria: string;
  cantidad: number;
  notas?: string;
  fechaInicioDevengo?: string; 
  fechaFinDevengo?: string;
}

export type FrequencyType = 'mensual' | 'trimestral' | 'semestral' | 'anual';

export interface RecurringTransaction {
  id: string;
  nombre: string;
  tipo: TransactionType;
  categoria: string;
  cantidad: number;
  frecuencia: FrequencyType;
  diaMes: number;
  mesInicio?: number; // 0-11 (Enero-Diciembre) para definir el inicio del ciclo
  notas?: string;
  activo: boolean;
}

export interface Balance {
  id: string; 
  mes: number;
  anio: number;
  cuentas: Record<string, number>;
  total: number;
}

export type InvestmentType = 'cuenta_remunerada' | 'cartera_indexada' | 'deposito' | 'privada';

export type PaymentType = 'interes' | 'beneficio' | 'retiro' | 'aportacion';

export interface InterestPayment {
  id: string;
  fecha: string;
  cantidad: number;
  tipo: PaymentType;
  nota?: string;
}

export interface ValuationSnapshot {
  id: string;
  fecha: string;
  valor: number;
}

export interface Investment {
  id: string;
  tipo: InvestmentType;
  nombre: string;
  entidad?: string;
  capitalInvertido: number;
  valorActual: number;
  rentabilidad?: number;
  fecha: string;
  detalles: any;
  estado?: 'activo' | 'completado' | 'vencido';
  historialPagos?: InterestPayment[];
  historialValoraciones?: ValuationSnapshot[];
  notas?: string;
}

export interface CategoryItem {
  name: string;
  color: string;
}

export interface AppConfig {
  categories: CategoryItem[];
  banks: string[];
}

// === Módulo Autónomo ===

export interface Owner {
  id: string;
  nombre: string;
  nif: string;
  direccion?: string;
  iban?: string;
  email?: string;
  retencionPctDefault?: number;
  serieFacturas?: string;
}

export interface Client {
  id: string;
  ownerId: string;
  nombre: string;
  nif: string;
  direccion?: string;
  email?: string;
  retencionPct?: number;
  notas?: string;
}

export type InvoiceStatus = 'borrador' | 'pendiente' | 'vencida' | 'pagada';

export interface InvoiceLine {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  ivaPct: number;
}

export interface Attachment {
  id: string;
  nombre: string;
  mime: string;
  size: number;
}

export interface Invoice {
  id: string;
  ownerId: string;
  clienteId: string;
  serie: string;
  numero: number;
  referenciaCustom?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  fechaCobro?: string;
  estado: InvoiceStatus;
  lineas: InvoiceLine[];
  aplicaIrpf: boolean;
  irpfPct: number;
  notas?: string;
  adjuntos?: Attachment[];
  // Snapshot fiscal del cliente en el momento de emisión
  clienteSnapshot?: {
    nombre: string;
    nif: string;
    direccion?: string;
  };
}

export interface Supplier {
  id: string;
  ownerId: string;
  nombre: string;
  nif: string;
  direccion?: string;
  email?: string;
  notas?: string;
}

export type ReceivedInvoiceStatus = 'pendiente' | 'pagada';

export interface ReceivedInvoiceLine {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  ivaPct: number;
}

export interface ReceivedInvoice {
  id: string;
  ownerId: string;
  proveedorId: string;
  numeroExterno: string;
  fechaEmision: string;
  fechaPago?: string;
  estado: ReceivedInvoiceStatus;
  lineas: ReceivedInvoiceLine[];
  retencionIrpf?: number;
  // Porcentaje de imputación (afectación) a la actividad: 0-100, entero.
  // Pondera cuánto de la factura computa en la analítica fiscal. Ausente = 100%.
  imputacionPct?: number;
  categoria?: string;
  notas?: string;
  adjuntos?: Attachment[];
}

export interface AppData {
  movimientos: Transaction[];
  recurrentes: RecurringTransaction[];
  balances: Balance[];
  inversiones: Investment[];
  config: AppConfig;
  // Módulo autónomo
  owners: Owner[];
  clientes: Client[];
  facturas: Invoice[];
  proveedores: Supplier[];
  facturasRecibidas: ReceivedInvoice[];
  activeOwnerId?: string;
}

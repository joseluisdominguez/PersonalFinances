
export type TransactionType = 'ingreso' | 'gasto';

// Changed from union type to string to support user custom categories
export type TransactionCategory = string;

export interface Transaction {
  id: string;
  fecha: string; // ISO string
  nombre: string;
  tipo: TransactionType;
  categoria: string;
  cantidad: number;
  notas?: string;
}

export interface Balance {
  id: string; // YYYY-MM
  mes: number;
  anio: number;
  // Changed to dynamic record to support user custom banks
  cuentas: Record<string, number>;
  total: number;
}

export type InvestmentType = 'cuenta_remunerada' | 'cartera_indexada' | 'deposito' | 'privada';

export type PaymentType = 'interes' | 'beneficio' | 'retiro' | 'aportacion';

export interface InterestPayment {
  id: string;
  fecha: string; // ISO string
  cantidad: number;
  tipo: PaymentType;
  nota?: string;
}

export interface Investment {
  id: string;
  tipo: InvestmentType;
  nombre: string;
  entidad?: string;
  capitalInvertido: number; // For cashflow types: Initial Principal. For others: Cost Basis.
  valorActual: number; // Current Balance / Market Value
  rentabilidad?: number; // Calculated or manual depending on type
  fecha: string;
  detalles: any; // Flexible for specific type details
  estado?: 'activo' | 'completado' | 'vencido';
  historialPagos?: InterestPayment[]; // Used for interests, benefits and withdrawals
  notas?: string; // Generic notes for all investment types
}

export interface CategoryItem {
  name: string;
  color: string;
}

export interface AppConfig {
  categories: CategoryItem[];
  banks: string[];
}

export interface AppData {
  movimientos: Transaction[];
  balances: Balance[];
  inversiones: Investment[];
  config: AppConfig;
}

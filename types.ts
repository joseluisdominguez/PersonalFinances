
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

export interface AppData {
  movimientos: Transaction[];
  recurrentes: RecurringTransaction[];
  balances: Balance[];
  inversiones: Investment[];
  config: AppConfig;
}

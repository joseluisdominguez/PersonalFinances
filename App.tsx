
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Download, Upload, PieChart, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { AppData, Transaction, Balance, Investment, AppConfig, CategoryItem } from './types';
import { TransactionsView } from './components/TransactionsView';
import { BalanceView } from './components/BalanceView';
import { InvestmentsView } from './components/InvestmentsView';
import { ConfigView } from './components/ConfigView';

const STORAGE_KEY = 'finanzas_app_data';

const DEFAULT_CONFIG: AppConfig = {
  categories: [
    { name: 'Coche', color: '#EF4444' }, // Red
    { name: 'Supermercado', color: '#F59E0B' }, // Amber
    { name: 'Restaurantes', color: '#F97316' }, // Orange
    { name: 'Transporte', color: '#6366F1' }, // Indigo
    { name: 'Salud', color: '#10B981' }, // Emerald
    { name: 'Ocio', color: '#8B5CF6' }, // Violet
    { name: 'Vivienda', color: '#3B82F6' }, // Blue
    { name: 'Servicios', color: '#06B6D4' }, // Cyan
    { name: 'Salario', color: '#22C55E' }, // Green
    { name: 'Otros', color: '#6B7280' }  // Gray
  ],
  banks: ['Ibercaja', 'ING', 'Unicaja', 'Otras Cuentas']
};

// Helper function to generate mock data relative to current date
const getMockData = (): AppData => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = (d: number) => String(d).padStart(2, '0');
  const ym = `${year}-${month}`;

  // Helper for previous months
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
  
  const prev2Date = new Date();
  prev2Date.setMonth(prev2Date.getMonth() - 2);
  const prev2Y = prev2Date.getFullYear();
  const prev2M = String(prev2Date.getMonth() + 1).padStart(2, '0');

  return {
    config: DEFAULT_CONFIG,
    movimientos: [
      { id: 'm1', fecha: `${ym}-${day(1)}`, nombre: 'Nómina Mensual', tipo: 'ingreso', categoria: 'Salario', cantidad: 2450.00 },
      { id: 'm2', fecha: `${ym}-${day(2)}`, nombre: 'Alquiler Piso', tipo: 'gasto', categoria: 'Vivienda', cantidad: 850.00 },
      { id: 'm3', fecha: `${ym}-${day(4)}`, nombre: 'Compra Semanal Mercadona', tipo: 'gasto', categoria: 'Supermercado', cantidad: 124.35 },
      { id: 'm4', fecha: `${ym}-${day(5)}`, nombre: 'Spotify Family', tipo: 'gasto', categoria: 'Ocio', cantidad: 17.99 },
      { id: 'm5', fecha: `${ym}-${day(8)}`, nombre: 'Gasolinera Repsol', tipo: 'gasto', categoria: 'Coche', cantidad: 55.00 },
      { id: 'm6', fecha: `${ym}-${day(10)}`, nombre: 'Cena Restaurante Italiano', tipo: 'gasto', categoria: 'Restaurantes', cantidad: 48.90 },
      { id: 'm7', fecha: `${ym}-${day(12)}`, nombre: 'Farmacia', tipo: 'gasto', categoria: 'Salud', cantidad: 12.50 },
      { id: 'm8', fecha: `${ym}-${day(15)}`, nombre: 'Factura Internet + Móvil', tipo: 'gasto', categoria: 'Servicios', cantidad: 45.00 },
      { id: 'm9', fecha: `${ym}-${day(18)}`, nombre: 'Entradas Cine', tipo: 'gasto', categoria: 'Ocio', cantidad: 24.00 },
      { id: 'm10', fecha: `${ym}-${day(20)}`, nombre: 'Uber a casa', tipo: 'gasto', categoria: 'Transporte', cantidad: 15.50 },
      { id: 'm11', fecha: `${ym}-${day(22)}`, nombre: 'Regalo Cumpleaños', tipo: 'gasto', categoria: 'Otros', cantidad: 60.00 },
      { id: 'm12', fecha: `${ym}-${day(25)}`, nombre: 'Venta Wallapop', tipo: 'ingreso', categoria: 'Otros', cantidad: 35.00 },
      { id: 'm13', fecha: `${prevY}-${prevM}-28`, nombre: 'Compra Carrefour', tipo: 'gasto', categoria: 'Supermercado', cantidad: 85.20 },
    ],
    balances: [
      { 
        id: `${prev2Y}-${prev2M}`, 
        mes: Number(prev2M), 
        anio: prev2Y, 
        cuentas: { 'Ibercaja': 11800, 'ING': 4000, 'Unicaja': 1800, 'Otras Cuentas': 0 }, 
        total: 17600 
      },
      { 
        id: `${prevY}-${prevM}`, 
        mes: Number(prevM), 
        anio: prevY, 
        cuentas: { 'Ibercaja': 12500, 'ING': 4500, 'Unicaja': 2000, 'Otras Cuentas': 0 }, 
        total: 19000 
      }
    ],
    inversiones: [
      {
        id: 'i1',
        tipo: 'cuenta_remunerada',
        nombre: 'Cuenta Inteligente',
        entidad: 'EVO Banco',
        capitalInvertido: 5000,
        valorActual: 5125.40,
        fecha: `${ym}-${day(1)}`,
        detalles: { tae: 2.85 },
        historialPagos: [
          { id: 'p1', fecha: `${prev2Y}-${prev2M}-15`, cantidad: 12.10, nota: 'Liquidación mensual', tipo: 'interes' },
          { id: 'p2', fecha: `${prevY}-${prevM}-15`, cantidad: 12.50, nota: 'Liquidación mensual', tipo: 'interes' },
          { id: 'p3', fecha: `${ym}-15`, cantidad: 12.90, nota: 'Liquidación mensual', tipo: 'interes' }
        ],
        notas: 'Mi cuenta de ahorros principal para el fondo de emergencia.'
      },
      {
        id: 'i2',
        tipo: 'deposito',
        nombre: 'Depósito a Plazo Fijo',
        entidad: 'Banca Progetto',
        capitalInvertido: 20000,
        valorActual: 20000,
        fecha: `${ym}-${day(1)}`,
        detalles: { frecuencia: 'Trimestral', vencimiento: '2026-06-20', tae: 3.50 },
        historialPagos: [
          { id: 'p4', fecha: `${prevY}-${prevM}-20`, cantidad: 175.00, nota: 'Cupón Trimestral', tipo: 'interes' }
        ],
        notas: 'Depósito contratado via Raisin con protección FGD Italia.'
      },
      {
        id: 'i3',
        tipo: 'cartera_indexada',
        nombre: 'Cartera Nivel 8',
        entidad: 'Indexa Capital',
        capitalInvertido: 12000,
        valorActual: 13840.50,
        fecha: `${ym}-${day(1)}`,
        detalles: {},
        notas: 'Fondo de pensiones y ahorro a largo plazo, inversión automatizada.'
      },
      {
        id: 'i4',
        tipo: 'privada',
        nombre: 'Proyecto Fotovoltaico',
        entidad: 'Fundeen',
        capitalInvertido: 2500,
        valorActual: 2500,
        fecha: `${ym}-${day(1)}`,
        detalles: {},
        historialPagos: [
           { id: 'p_p1', fecha: `${prevY}-${prevM}-10`, cantidad: 150.00, nota: 'Primer beneficio', tipo: 'beneficio' }
        ],
        notas: 'Inversión en energías renovables locales.'
      },
      {
        id: 'i5',
        tipo: 'cuenta_remunerada',
        nombre: 'Cuenta de Ahorro',
        entidad: 'Renault Bank',
        capitalInvertido: 8000,
        valorActual: 8065.20,
        fecha: `${ym}-${day(1)}`,
        detalles: { tae: 2.73 },
        historialPagos: [
          { id: 'p5', fecha: `${prevY}-${prevM}-01`, cantidad: 17.80, nota: 'Intereses', tipo: 'interes' },
          { id: 'p6', fecha: `${ym}-01`, cantidad: 18.20, nota: 'Intereses', tipo: 'interes' }
        ],
        notas: 'Ahorro específico para las vacaciones de verano.'
      },
      {
        id: 'i6',
        tipo: 'cartera_indexada',
        nombre: 'Vanguard Global Stock',
        entidad: 'MyInvestor',
        capitalInvertido: 4000,
        valorActual: 4210.00,
        fecha: `${ym}-${day(1)}`,
        detalles: {},
        notas: 'Fondo indexado al MSCI World.'
      }
    ]
  };
};

const INITIAL_DATA = getMockData();

export default function App() {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'balances' | 'inversiones' | 'config'>('movimientos');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Load Data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // --- MIGRATION LOGIC ---
        if (!parsed.config) {
          parsed.config = DEFAULT_CONFIG;
        }
        
        // Ensure old history items have a 'tipo' (default to interes for safety)
        if (parsed.inversiones) {
          parsed.inversiones.forEach((inv: Investment) => {
            if (inv.historialPagos) {
              inv.historialPagos.forEach(pay => {
                if (!pay.tipo) {
                  if (inv.tipo === 'privada') pay.tipo = 'beneficio';
                  else pay.tipo = 'interes';
                }
              });
            }
          });
        }

        if (parsed.config.categories && parsed.config.categories.length > 0 && typeof parsed.config.categories[0] === 'string') {
          const oldCategories = parsed.config.categories as string[];
          const newCategories: CategoryItem[] = oldCategories.map(catName => {
            const defaultMatch = DEFAULT_CONFIG.categories.find(dc => dc.name === catName);
            return {
              name: catName,
              color: defaultMatch ? defaultMatch.color : '#6B7280'
            };
          });
          parsed.config.categories = newCategories;
        }
        // -----------------------

        if (!parsed.movimientos || parsed.movimientos.length === 0) {
           setData(INITIAL_DATA);
        } else {
           setData(parsed);
        }
      } catch (e) {
        console.error("Error parsing local storage", e);
        setData(INITIAL_DATA);
      }
    }
  }, []);

  // Save Data helper
  const saveData = (newData: AppData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  // Toast Helper
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- CRUD Operations ---

  const handleSaveTransaction = (t: Transaction) => {
    const exists = data.movimientos.some(m => m.id === t.id);
    let newMovimientos;
    
    if (exists) {
      newMovimientos = data.movimientos.map(m => m.id === t.id ? t : m);
    } else {
      newMovimientos = [...data.movimientos, t];
    }
    
    saveData({ ...data, movimientos: newMovimientos });
    showToast("Movimiento guardado correctamente");
  };

  const handleDeleteTransaction = (id: string) => {
    saveData({ ...data, movimientos: data.movimientos.filter(m => m.id !== id) });
    showToast("Movimiento eliminado");
  };

  const handleSaveBalance = (b: Balance) => {
    const filtered = data.balances.filter(item => item.id !== b.id);
    saveData({ ...data, balances: [...filtered, b] });
    showToast("Balance actualizado");
  };

  const handleDeleteBalance = (id: string) => {
    saveData({ ...data, balances: data.balances.filter(b => b.id !== id) });
    showToast("Balance eliminado");
  };

  const handleSaveInvestment = (i: Investment) => {
    const filtered = data.inversiones.filter(item => item.id !== i.id);
    saveData({ ...data, inversiones: [...filtered, i] });
    showToast("Inversión guardada");
  };

  const handleDeleteInvestment = (id: string) => {
    saveData({ ...data, inversiones: data.inversiones.filter(i => i.id !== id) });
    showToast("Inversión eliminada");
  };

  const handleSaveConfig = (newConfig: AppConfig) => {
    saveData({ ...data, config: newConfig });
    showToast("Configuración guardada");
  };

  // --- Import/Export ---

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finanzas_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("¿Estás seguro? Esto reemplazará todos tus datos actuales.")) {
          if (!json.config) json.config = DEFAULT_CONFIG;
          
          if (json.config.categories && json.config.categories.length > 0 && typeof json.config.categories[0] === 'string') {
             const oldCategories = json.config.categories as string[];
             json.config.categories = oldCategories.map((catName: string) => {
                const defaultMatch = DEFAULT_CONFIG.categories.find(dc => dc.name === catName);
                return {
                  name: catName,
                  color: defaultMatch ? defaultMatch.color : '#6B7280'
                };
             });
          }

          saveData(json);
          showToast("Datos importados con éxito");
        }
      } catch (err) {
        showToast("Error al leer el archivo JSON", 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('movimientos')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <PieChart size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500">
              Finanzas Pro
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('config')} 
              className={`p-2 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
              title="Configuración"
            >
              <Settings size={20} />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={handleExport} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Exportar Backup">
              <Download size={20} />
            </button>
            <label className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Importar Backup">
              <Upload size={20} />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'movimientos' && (
          <TransactionsView 
            data={data.movimientos} 
            categories={data.config.categories}
            onSave={handleSaveTransaction} 
            onDelete={handleDeleteTransaction} 
          />
        )}
        {activeTab === 'balances' && (
          <BalanceView 
            data={data.balances} 
            banks={data.config.banks}
            onSave={handleSaveBalance} 
            onDelete={handleDeleteBalance} 
          />
        )}
        {activeTab === 'inversiones' && (
          <InvestmentsView 
            data={data.inversiones} 
            onSave={handleSaveInvestment} 
            onDelete={handleDeleteInvestment} 
          />
        )}
        {activeTab === 'config' && (
          <ConfigView 
            config={data.config}
            onSave={handleSaveConfig}
          />
        )}
      </main>

      {/* Persistent Floating Bottom Menu */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 flex justify-between items-center gap-1 pointer-events-auto">
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                activeTab === 'movimientos' ? 'bg-blue-50 text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size={24} className={activeTab === 'movimientos' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium mt-1">Movimientos</span>
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                activeTab === 'balances' ? 'bg-blue-50 text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Wallet size={24} className={activeTab === 'balances' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium mt-1">Balances</span>
            </button>
            <button
              onClick={() => setActiveTab('inversiones')}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                activeTab === 'inversiones' ? 'bg-blue-50 text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <TrendingUp size={24} className={activeTab === 'inversiones' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium mt-1">Inversiones</span>
            </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-28 right-4 md:right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="font-medium">{notification.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}


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
    { name: 'Coche', color: '#EF4444' },
    { name: 'Supermercado', color: '#F59E0B' },
    { name: 'Restaurantes', color: '#F97316' },
    { name: 'Transporte', color: '#6366F1' },
    { name: 'Salud', color: '#10B981' },
    { name: 'Ocio', color: '#8B5CF6' },
    { name: 'Vivienda', color: '#3B82F6' },
    { name: 'Servicios', color: '#06B6D4' },
    { name: 'Salario', color: '#22C55E' },
    { name: 'Otros', color: '#6B7280' }
  ],
  banks: ['Ibercaja', 'ING', 'Unicaja', 'Otras Cuentas']
};

const getMockData = (): AppData => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = (d: number) => String(d).padStart(2, '0');
  const ym = `${year}-${month}`;

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
      { id: 'm3', fecha: `${ym}-${day(4)}`, nombre: 'Compra Semanal', tipo: 'gasto', categoria: 'Supermercado', cantidad: 124.35 },
      { id: 'm4', fecha: `${ym}-${day(5)}`, nombre: 'Spotify', tipo: 'gasto', categoria: 'Ocio', cantidad: 17.99 },
    ],
    balances: [
      { id: `${prev2Y}-${prev2M}`, mes: Number(prev2M), anio: prev2Y, cuentas: { 'Ibercaja': 11800 }, total: 11800 },
      { id: `${prevY}-${prevM}`, mes: Number(prevM), anio: prevY, cuentas: { 'Ibercaja': 12500 }, total: 12500 }
    ],
    inversiones: []
  };
};

const INITIAL_DATA = getMockData();

export default function App() {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'balances' | 'inversiones' | 'config'>('movimientos');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.config) parsed.config = DEFAULT_CONFIG;
        setData(parsed);
      } catch (e) {
        setData(INITIAL_DATA);
      }
    }
  }, []);

  const saveData = (newData: AppData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveTransaction = (t: Transaction) => {
    const exists = data.movimientos.some(m => m.id === t.id);
    const newMovimientos = exists ? data.movimientos.map(m => m.id === t.id ? t : m) : [...data.movimientos, t];
    saveData({ ...data, movimientos: newMovimientos });
    showToast("Movimiento guardado");
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

  // Importación mejorada para iOS y Safari móvil
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Usar API de texto moderna más fiable en iOS
      const text = await file.text();
      const json = JSON.parse(text);

      // Verificación básica del formato
      if (!json.movimientos || !Array.isArray(json.movimientos)) {
        throw new Error("El archivo no parece ser un backup válido.");
      }

      if (window.confirm("¿Importar backup? Se reemplazarán todos los datos actuales.")) {
        if (!json.config) json.config = DEFAULT_CONFIG;
        saveData(json);
        showToast("Datos importados con éxito");
      }
    } catch (err) {
      console.error("Error importando:", err);
      showToast("Error al leer el archivo. Asegúrate de que sea un JSON válido.", 'error');
    } finally {
      e.target.value = ''; // Resetear el input para permitir re-seleccionar el mismo archivo
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
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
              <input 
                type="file" 
                accept=".json,application/json" 
                onChange={handleImport} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </header>

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

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 flex justify-between items-center gap-1 pointer-events-auto">
            <button onClick={() => setActiveTab('movimientos')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'movimientos' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-medium mt-1">Movimientos</span>
            </button>
            <button onClick={() => setActiveTab('balances')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'balances' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Wallet size={24} />
              <span className="text-[10px] font-medium mt-1">Balances</span>
            </button>
            <button onClick={() => setActiveTab('inversiones')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'inversiones' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <TrendingUp size={24} />
              <span className="text-[10px] font-medium mt-1">Inversiones</span>
            </button>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-28 right-4 md:right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="font-medium">{notification.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

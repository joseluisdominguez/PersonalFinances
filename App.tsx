
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Download, Upload, PieChart, CheckCircle2, XCircle, Settings, Cloud, CloudOff, Share2, Link } from 'lucide-react';
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

const getMockData = (): AppData => ({
  config: DEFAULT_CONFIG,
  movimientos: [],
  balances: [],
  inversiones: []
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'balances' | 'inversiones' | 'config'>('movimientos');
  const [data, setData] = useState<AppData>(getMockData());
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // File System API State (Mac/PC)
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [isSavingToFile, setIsSavingToFile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.config) parsed.config = DEFAULT_CONFIG;
        setData(parsed);
      } catch (e) {
        setData(getMockData());
      }
    }
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const saveData = async (newData: AppData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

    // Autosave si hay un archivo vinculado (Desktop/Mac)
    if (fileHandle) {
      try {
        setIsSavingToFile(true);
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(newData, null, 2));
        await writable.close();
      } catch (err) {
        console.error("Error autosaving to file:", err);
        setFileHandle(null); // Desvincular si falla el permiso
        showToast("Error al guardar en el archivo vinculado", "error");
      } finally {
        setIsSavingToFile(false);
      }
    }
  };

  // --- Remote Persistence Handlers ---

  const handleLinkFile = async () => {
    try {
      // @ts-ignore - File System Access API
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
        multiple: false
      });
      
      const file = await handle.getFile();
      const content = await file.text();
      const json = JSON.parse(content);
      
      if (window.confirm("¿Vincular archivo y cargar datos? Se reemplazará lo actual.")) {
        setFileHandle(handle);
        saveData(json);
        showToast("Archivo vinculado: Autosave activado");
      }
    } catch (err) {
      console.log("File link cancelled or failed");
    }
  };

  const handleCloudPush = async () => {
    const dataStr = JSON.stringify(data, null, 2);
    
    // Si estamos en móvil (iOS), usamos Share API para "Guardar en Archivos" o Drive
    if (navigator.share) {
      const file = new File([dataStr], `finanzas_backup.json`, { type: 'application/json' });
      try {
        await navigator.share({
          files: [file],
          title: 'Backup de Finanzas',
          text: 'Sincroniza tus datos con iCloud/Drive'
        });
        showToast("Sincronización enviada");
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: Exportación normal
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finanzas_backup.json`;
      link.click();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (window.confirm("¿Importar datos?")) {
        saveData(json);
        showToast("Datos importados");
      }
    } catch (err) {
      showToast("Error al importar", "error");
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('movimientos')}>
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-100">
              <PieChart size={22} />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hidden sm:block">
              Finanzas Pro
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Indicador de Autosave */}
            <button 
              onClick={handleLinkFile}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                fileHandle 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500'
              }`}
              title={fileHandle ? "Autosave Activo en archivo local" : "Vincular a archivo local (Desktop)"}
            >
              {isSavingToFile ? <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> : fileHandle ? <Cloud size={14} /> : <CloudOff size={14} />}
              <span className="hidden md:inline">{fileHandle ? 'Autosave ON' : 'Vincular Sync'}</span>
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button onClick={handleCloudPush} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Sincronizar a Nube (iOS/Share)">
              <Share2 size={20} />
            </button>

            <label className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer" title="Importar JSON">
              <Upload size={20} />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button 
              onClick={() => setActiveTab('config')} 
              className={`p-2 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
              title="Ajustes"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'movimientos' && (
          <TransactionsView 
            data={data.movimientos} 
            categories={data.config.categories}
            onSave={(t) => {
              const exists = data.movimientos.some(m => m.id === t.id);
              saveData({ ...data, movimientos: exists ? data.movimientos.map(m => m.id === t.id ? t : m) : [...data.movimientos, t] });
              showToast("Movimiento guardado");
            }} 
            onDelete={(id) => {
              saveData({ ...data, movimientos: data.movimientos.filter(m => m.id !== id) });
              showToast("Movimiento eliminado");
            }} 
          />
        )}
        {activeTab === 'balances' && (
          <BalanceView 
            data={data.balances} 
            banks={data.config.banks}
            onSave={(b) => {
              const filtered = data.balances.filter(item => item.id !== b.id);
              saveData({ ...data, balances: [...filtered, b] });
              showToast("Balance actualizado");
            }} 
            onDelete={(id) => {
              saveData({ ...data, balances: data.balances.filter(b => b.id !== id) });
              showToast("Balance eliminado");
            }} 
          />
        )}
        {activeTab === 'inversiones' && (
          <InvestmentsView 
            data={data.inversiones} 
            onSave={(i) => {
              const filtered = data.inversiones.filter(item => item.id !== i.id);
              saveData({ ...data, inversiones: [...filtered, i] });
              showToast("Inversión guardada");
            }} 
            onDelete={(id) => {
              saveData({ ...data, inversiones: data.inversiones.filter(i => i.id !== id) });
              showToast("Inversión eliminada");
            }} 
          />
        )}
        {activeTab === 'config' && (
          <ConfigView 
            config={data.config}
            onSave={(newConfig) => {
              saveData({ ...data, config: newConfig });
              showToast("Configuración guardada");
            }}
          />
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-6 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-2 flex justify-between items-center gap-1 pointer-events-auto ring-1 ring-black/5">
            <button onClick={() => setActiveTab('movimientos')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'movimientos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutDashboard size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Diario</span>
            </button>
            <button onClick={() => setActiveTab('balances')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'balances' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <Wallet size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Balance</span>
            </button>
            <button onClick={() => setActiveTab('inversiones')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'inversiones' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <TrendingUp size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Broker</span>
            </button>
        </div>
      </nav>

      {notification && (
        <div className="fixed top-20 right-4 md:right-8 z-50 animate-in slide-in-from-right-10 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${notification.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : 'bg-red-50/90 border-red-200 text-red-800'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

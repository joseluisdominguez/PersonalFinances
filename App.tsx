
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Download, Upload, PieChart, CheckCircle2, XCircle, Settings, Cloud, CloudOff, Share2, RefreshCw, FileJson } from 'lucide-react';
import { AppData, Transaction, Balance, Investment, AppConfig } from './types';
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

const getInitialData = (): AppData => ({
  config: DEFAULT_CONFIG,
  movimientos: [],
  balances: [],
  inversiones: []
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'balances' | 'inversiones' | 'config'>('movimientos');
  const [data, setData] = useState<AppData>(getInitialData());
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // Sync States
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'error' | 'synced'>('idle');
  const autosaveTimer = useRef<number | null>(null);

  // Load Initial Data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(parsed);
      } catch (e) {
        console.error("Error loading local storage", e);
      }
    }
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Persistencia con Debounce (Autosave)
  const persist = useCallback(async (newData: AppData) => {
    // 1. Local Storage (Inmediato)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    setSyncStatus('saving');

    // 2. File System API (Mac Desktop) - Solo si hay handle
    if (fileHandle) {
      try {
        // Verificar si tenemos permiso de escritura (a veces caduca)
        const options = { mode: 'readwrite' };
        if (await fileHandle.queryPermission(options) !== 'granted') {
          if (await fileHandle.requestPermission(options) !== 'granted') {
            throw new Error('Permiso denegado');
          }
        }
        
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(newData, null, 2));
        await writable.close();
        setSyncStatus('synced');
      } catch (err) {
        console.error("Autosave falló", err);
        setSyncStatus('error');
      }
    } else {
      setTimeout(() => setSyncStatus('idle'), 1000);
    }
  }, [fileHandle]);

  const updateData = (newData: AppData) => {
    setData(newData);
    
    // Autosave con debounce de 1.5s
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      persist(newData);
    }, 1500);
  };

  // --- Handlers ---

  const handleLinkFile = async () => {
    try {
      // @ts-ignore - Intentar abrir con permisos de lectura/escritura desde el inicio
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Finanzas JSON',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false,
        mode: 'readwrite' // Pedir escritura desde el inicio
      });
      
      const file = await handle.getFile();
      const content = await file.text();
      const json = JSON.parse(content);
      
      setFileHandle(handle);
      updateData(json);
      showToast("Vínculo establecido: Autosave activo");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        showToast("Error al vincular el archivo", "error");
      }
    }
  };

  const handleManualExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finanzas_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast("Archivo exportado");
  };

  const handleShareIOS = async () => {
    if (navigator.share) {
      const dataStr = JSON.stringify(data, null, 2);
      const file = new File([dataStr], `finanzas_sync.json`, { type: 'application/json' });
      try {
        await navigator.share({
          files: [file],
          title: 'Sincronizar Finanzas',
        });
        showToast("Compartido correctamente");
      } catch (e) {
        console.log("Compartir cancelado");
      }
    } else {
      handleManualExport();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('movimientos')}>
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
              <PieChart size={22} />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hidden sm:block">
              Finanzas Pro
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Estado de Sincronización */}
            <div className="flex items-center gap-1.5 mr-2">
               {syncStatus === 'saving' && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
               {syncStatus === 'synced' && <CheckCircle2 size={14} className="text-green-500" />}
               {syncStatus === 'error' && <XCircle size={14} className="text-red-500" />}
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:inline">
                 {syncStatus === 'saving' ? 'Guardando...' : syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'error' ? 'Error Sync' : ''}
               </span>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* Acciones de Archivo */}
            <button 
              onClick={handleLinkFile} 
              className={`p-2 rounded-xl transition-all ${fileHandle ? 'bg-green-50 text-green-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Vincular archivo (Mac/Desktop)"
            >
              {fileHandle ? <Cloud size={20} /> : <CloudOff size={20} />}
            </button>

            <button onClick={handleShareIOS} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Compartir/Guardar (iOS)">
              <Share2 size={20} />
            </button>

            <button onClick={() => setActiveTab('config')} className={`p-2 rounded-xl ${activeTab === 'config' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>
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
              updateData({ ...data, movimientos: exists ? data.movimientos.map(m => m.id === t.id ? t : m) : [...data.movimientos, t] });
            }} 
            onDelete={(id) => {
              updateData({ ...data, movimientos: data.movimientos.filter(m => m.id !== id) });
            }} 
          />
        )}
        {activeTab === 'balances' && (
          <BalanceView 
            data={data.balances} 
            banks={data.config.banks}
            onSave={(b) => {
              const filtered = data.balances.filter(item => item.id !== b.id);
              updateData({ ...data, balances: [...filtered, b] });
            }} 
            onDelete={(id) => {
              updateData({ ...data, balances: data.balances.filter(b => b.id !== id) });
            }} 
          />
        )}
        {activeTab === 'inversiones' && (
          <InvestmentsView 
            data={data.inversiones} 
            onSave={(i) => {
              const filtered = data.inversiones.filter(item => item.id !== i.id);
              updateData({ ...data, inversiones: [...filtered, i] });
            }} 
            onDelete={(id) => {
              updateData({ ...data, inversiones: data.inversiones.filter(i => i.id !== id) });
            }} 
          />
        )}
        {activeTab === 'config' && (
          <ConfigView 
            config={data.config}
            onSave={(newConfig) => updateData({ ...data, config: newConfig })}
          />
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-2 flex justify-between items-center gap-1 ring-1 ring-black/5">
            <button onClick={() => setActiveTab('movimientos')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === 'movimientos' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <LayoutDashboard size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase">Diario</span>
            </button>
            <button onClick={() => setActiveTab('balances')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === 'balances' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <Wallet size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase">Patrimonio</span>
            </button>
            <button onClick={() => setActiveTab('inversiones')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === 'inversiones' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <TrendingUp size={20} />
              <span className="text-[10px] font-bold mt-1 uppercase">Broker</span>
            </button>
        </div>
      </nav>

      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-10">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${notification.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : 'bg-red-50/90 border-red-200 text-red-800'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

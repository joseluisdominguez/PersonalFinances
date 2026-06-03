
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Download, Upload, PieChart, CheckCircle2, XCircle, Settings, Repeat, Briefcase } from 'lucide-react';
import { AppData, Transaction, Balance, Investment, AppConfig, RecurringTransaction, Owner, Client, Invoice, Supplier, ReceivedInvoice } from './types';
import { TransactionsView } from './components/TransactionsView';
import { BalanceView } from './components/BalanceView';
import { InvestmentsView } from './components/InvestmentsView';
import { ConfigView } from './components/ConfigView';
import { RecurringView } from './components/RecurringView';
import { AutonomoView } from './components/autonomo/AutonomoView';
import { clearAttachments, deleteAttachment, getAttachment, putAttachment } from './components/autonomo/idb';
import JSZip from 'jszip';

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

  return {
    config: DEFAULT_CONFIG,
    movimientos: [
      { id: 'm1', fecha: `${ym}-${day(1)}`, nombre: 'Nómina Mensual', tipo: 'ingreso', categoria: 'Salario', cantidad: 2450.00 },
      { id: 'm2', fecha: `${ym}-${day(2)}`, nombre: 'Alquiler Piso', tipo: 'gasto', categoria: 'Vivienda', cantidad: 850.00 },
    ],
    recurrentes: [
      { id: 'r1', nombre: 'Cuota Hipoteca', tipo: 'gasto', categoria: 'Vivienda', cantidad: 650.00, frecuencia: 'mensual', diaMes: 1, activo: true },
      { id: 'r2', nombre: 'Netflix', tipo: 'gasto', categoria: 'Ocio', cantidad: 17.99, frecuencia: 'mensual', diaMes: 5, activo: true },
      { id: 'r3', nombre: 'IPTV Premium', tipo: 'gasto', categoria: 'Ocio', cantidad: 45.00, frecuencia: 'trimestral', diaMes: 10, activo: true }
    ],
    balances: [],
    inversiones: [],
    owners: [],
    clientes: [],
    facturas: [],
    proveedores: [],
    facturasRecibidas: []
  };
};

const INITIAL_DATA = getMockData();

export default function App() {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'balances' | 'inversiones' | 'recurrentes' | 'autonomo' | 'config'>('movimientos');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.config) parsed.config = DEFAULT_CONFIG;
        if (!parsed.recurrentes) parsed.recurrentes = [];
        if (!parsed.owners) parsed.owners = [];
        if (!parsed.clientes) parsed.clientes = [];
        if (!parsed.facturas) parsed.facturas = [];
        if (!parsed.proveedores) parsed.proveedores = [];
        if (!parsed.facturasRecibidas) parsed.facturasRecibidas = [];
        // Migración líneas de compras: base → cantidad+precioUnitario
        parsed.facturasRecibidas = parsed.facturasRecibidas.map((f: any) => ({
          ...f,
          lineas: (f.lineas || []).map((l: any) => {
            if (l.cantidad !== undefined && l.precioUnitario !== undefined) return l;
            const base = Number(l.base) || 0;
            return {
              id: l.id,
              descripcion: l.descripcion || '',
              cantidad: 1,
              precioUnitario: base,
              ivaPct: l.ivaPct ?? 21,
            };
          }),
        }));
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

  const handleSaveTransaction = (t: Transaction | Transaction[]) => {
    const transactions = Array.isArray(t) ? t : [t];
    let newMovimientos = [...data.movimientos];
    
    transactions.forEach(newT => {
      const exists = newMovimientos.some(m => m.id === newT.id);
      if (exists) {
        newMovimientos = newMovimientos.map(m => m.id === newT.id ? newT : m);
      } else {
        newMovimientos.push(newT);
      }
    });

    saveData({ ...data, movimientos: newMovimientos });
    showToast(transactions.length > 1 ? `${transactions.length} movimientos guardados` : "Movimiento guardado");
  };

  const handleDeleteTransaction = (id: string) => {
    saveData({ ...data, movimientos: data.movimientos.filter(m => m.id !== id) });
    showToast("Movimiento eliminado");
  };

  const handleSaveRecurring = (r: RecurringTransaction) => {
    const exists = data.recurrentes.some(item => item.id === r.id);
    const newRecurrentes = exists ? data.recurrentes.map(item => item.id === r.id ? r : item) : [...data.recurrentes, r];
    saveData({ ...data, recurrentes: newRecurrentes });
    showToast("Plantilla recurrente guardada");
  };

  const handleDeleteRecurring = (id: string) => {
    saveData({ ...data, recurrentes: data.recurrentes.filter(r => r.id !== id) });
    showToast("Plantilla eliminada");
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

  const handleSaveOwner = (o: Owner) => {
    const exists = data.owners.some(item => item.id === o.id);
    const newOwners = exists ? data.owners.map(item => item.id === o.id ? o : item) : [...data.owners, o];
    const newActive = data.activeOwnerId || o.id;
    saveData({ ...data, owners: newOwners, activeOwnerId: newActive });
    showToast("Titular guardado");
  };

  const handleDeleteOwner = (id: string) => {
    const newOwners = data.owners.filter(o => o.id !== id);
    const newActive = data.activeOwnerId === id ? newOwners[0]?.id : data.activeOwnerId;
    saveData({ ...data, owners: newOwners, activeOwnerId: newActive });
    showToast("Titular eliminado");
  };

  const handleSaveClient = (c: Client) => {
    const exists = data.clientes.some(item => item.id === c.id);
    const newClientes = exists ? data.clientes.map(item => item.id === c.id ? c : item) : [...data.clientes, c];
    saveData({ ...data, clientes: newClientes });
    showToast("Cliente guardado");
  };

  const handleDeleteClient = (id: string) => {
    saveData({ ...data, clientes: data.clientes.filter(c => c.id !== id) });
    showToast("Cliente eliminado");
  };

  const handleSaveInvoice = (i: Invoice) => {
    const exists = data.facturas.some(item => item.id === i.id);
    const newFacturas = exists ? data.facturas.map(item => item.id === i.id ? i : item) : [...data.facturas, i];
    saveData({ ...data, facturas: newFacturas });
    showToast("Factura guardada");
  };

  const handleDeleteInvoice = (id: string) => {
    saveData({ ...data, facturas: data.facturas.filter(f => f.id !== id) });
    showToast("Factura eliminada");
  };

  const handleSetActiveOwner = (id: string) => {
    saveData({ ...data, activeOwnerId: id });
  };

  const handleSaveSupplier = (s: Supplier) => {
    const exists = data.proveedores.some(item => item.id === s.id);
    const newProveedores = exists ? data.proveedores.map(item => item.id === s.id ? s : item) : [...data.proveedores, s];
    saveData({ ...data, proveedores: newProveedores });
    showToast("Proveedor guardado");
  };

  const handleDeleteSupplier = (id: string) => {
    saveData({ ...data, proveedores: data.proveedores.filter(s => s.id !== id) });
    showToast("Proveedor eliminado");
  };

  const handleSaveReceivedInvoice = (r: ReceivedInvoice) => {
    const exists = data.facturasRecibidas.some(item => item.id === r.id);
    const newRecibidas = exists ? data.facturasRecibidas.map(item => item.id === r.id ? r : item) : [...data.facturasRecibidas, r];
    saveData({ ...data, facturasRecibidas: newRecibidas });
    showToast("Factura recibida guardada");
  };

  const handleDeleteReceivedInvoice = (id: string) => {
    saveData({ ...data, facturasRecibidas: data.facturasRecibidas.filter(r => r.id !== id) });
    showToast("Factura recibida eliminada");
  };

  const handleImportClients = (items: Client[]) => {
    if (items.length === 0) return;
    saveData({ ...data, clientes: [...data.clientes, ...items] });
    showToast(`${items.length} cliente(s) importados`);
  };

  const handleImportSuppliers = (items: Supplier[]) => {
    if (items.length === 0) return;
    saveData({ ...data, proveedores: [...data.proveedores, ...items] });
    showToast(`${items.length} proveedor(es) importados`);
  };

  const handleImportInvoices = (items: Invoice[]) => {
    if (items.length === 0) return;
    saveData({ ...data, facturas: [...data.facturas, ...items] });
    showToast(`${items.length} factura(s) importadas`);
  };

  const handleImportReceivedInvoices = (items: ReceivedInvoice[]) => {
    if (items.length === 0) return;
    saveData({ ...data, facturasRecibidas: [...data.facturasRecibidas, ...items] });
    showToast(`${items.length} factura(s) de compra importadas`);
  };

  const handleClearOwnerData = async (ownerId: string) => {
    const facturasDelOwner = data.facturas.filter(f => f.ownerId === ownerId);
    const recibidasDelOwner = data.facturasRecibidas.filter(f => f.ownerId === ownerId);

    const attachmentIds: string[] = [];
    facturasDelOwner.forEach(f => f.adjuntos?.forEach(a => attachmentIds.push(a.id)));
    recibidasDelOwner.forEach(f => f.adjuntos?.forEach(a => attachmentIds.push(a.id)));

    for (const id of attachmentIds) {
      try {
        await deleteAttachment(id);
      } catch {
        // no bloqueamos: si alguno falla seguimos con el resto
      }
    }

    saveData({
      ...data,
      clientes: data.clientes.filter(c => c.ownerId !== ownerId),
      proveedores: data.proveedores.filter(p => p.ownerId !== ownerId),
      facturas: data.facturas.filter(f => f.ownerId !== ownerId),
      facturasRecibidas: data.facturasRecibidas.filter(f => f.ownerId !== ownerId),
    });

    showToast("Datos del titular vaciados");
  };

  const collectAttachmentIds = (d: AppData): string[] => {
    const ids: string[] = [];
    d.facturas?.forEach(f => f.adjuntos?.forEach(a => ids.push(a.id)));
    d.facturasRecibidas?.forEach(f => f.adjuntos?.forEach(a => ids.push(a.id)));
    return ids;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const zip = new JSZip();
      zip.file('data.json', JSON.stringify(data, null, 2));

      const ids = collectAttachmentIds(data);
      const attachmentsFolder = zip.folder('attachments');
      if (attachmentsFolder && ids.length > 0) {
        for (const id of ids) {
          const blob = await getAttachment(id);
          if (blob) attachmentsFolder.file(id, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = `finanzas_backup_${new Date().toISOString().split('T')[0]}.zip`;
      downloadBlob(zipBlob, filename);
      showToast('Backup exportado');
    } catch (err) {
      showToast('Error al exportar', 'error');
    }
  };

  const normalizeImportedJson = (json: any): AppData => {
    if (!json.movimientos) throw new Error('Backup no válido');
    if (!json.config) json.config = DEFAULT_CONFIG;
    if (!json.recurrentes) json.recurrentes = [];
    if (!json.owners) json.owners = [];
    if (!json.clientes) json.clientes = [];
    if (!json.facturas) json.facturas = [];
    if (!json.proveedores) json.proveedores = [];
    if (!json.facturasRecibidas) json.facturasRecibidas = [];
    return json as AppData;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isZip =
        file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';

      let imported: AppData;
      let attachmentBlobs: Record<string, Blob> = {};

      if (isZip) {
        const zip = await JSZip.loadAsync(file);
        const dataEntry = zip.file('data.json');
        if (!dataEntry) throw new Error('ZIP no contiene data.json');
        const jsonText = await dataEntry.async('string');
        imported = normalizeImportedJson(JSON.parse(jsonText));

        const folder = zip.folder('attachments');
        if (folder) {
          const entries: { id: string; blob: Promise<Blob> }[] = [];
          folder.forEach((relPath, entry) => {
            if (!entry.dir) entries.push({ id: relPath, blob: entry.async('blob') });
          });
          for (const { id, blob } of entries) {
            attachmentBlobs[id] = await blob;
          }
        }
      } else {
        const text = await file.text();
        imported = normalizeImportedJson(JSON.parse(text));
      }

      if (!window.confirm('¿Importar backup? Se reemplazarán todos los datos.')) {
        return;
      }

      // Reemplazo IDB completo
      await clearAttachments();
      for (const [id, blob] of Object.entries(attachmentBlobs)) {
        await putAttachment(id, blob);
      }

      saveData(imported);
      showToast('Datos importados');
    } catch (err) {
      showToast('Error al importar', 'error');
    } finally {
      e.target.value = '';
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
            <button onClick={() => setActiveTab('config')} className={`p-2 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`} title="Configuración">
              <Settings size={20} />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={handleExport} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg transition-colors" title="Exportar Backup">
              <Download size={20} />
            </button>
            <label className="p-2 text-gray-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer" title="Importar Backup">
              <Upload size={20} />
              <input type="file" accept=".zip,.json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'movimientos' && (
          <TransactionsView 
            data={data.movimientos} 
            recurrentes={data.recurrentes}
            categories={data.config.categories}
            onSave={handleSaveTransaction} 
            onDelete={handleDeleteTransaction} 
          />
        )}
        {activeTab === 'recurrentes' && (
          <RecurringView 
            data={data.recurrentes}
            categories={data.config.categories}
            onSave={handleSaveRecurring}
            onDelete={handleDeleteRecurring}
          />
        )}
        {activeTab === 'balances' && (
          <BalanceView
            data={data.balances}
            banks={data.config.banks}
            inversiones={data.inversiones}
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
        {activeTab === 'autonomo' && (
          <AutonomoView
            owners={data.owners}
            clientes={data.clientes}
            facturas={data.facturas}
            proveedores={data.proveedores}
            facturasRecibidas={data.facturasRecibidas}
            activeOwnerId={data.activeOwnerId}
            onSaveOwner={handleSaveOwner}
            onDeleteOwner={handleDeleteOwner}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSaveReceivedInvoice={handleSaveReceivedInvoice}
            onDeleteReceivedInvoice={handleDeleteReceivedInvoice}
            onImportClients={handleImportClients}
            onImportSuppliers={handleImportSuppliers}
            onImportInvoices={handleImportInvoices}
            onImportReceivedInvoices={handleImportReceivedInvoices}
            onClearOwnerData={handleClearOwnerData}
            onSetActiveOwner={handleSetActiveOwner}
          />
        )}
        {activeTab === 'config' && (
          <ConfigView 
            config={data.config}
            onSave={handleSaveConfig}
          />
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 flex justify-between items-center gap-1 pointer-events-auto">
            <button onClick={() => setActiveTab('movimientos')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'movimientos' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-medium mt-1">Movimientos</span>
            </button>
            <button onClick={() => setActiveTab('recurrentes')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'recurrentes' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Repeat size={24} />
              <span className="text-[10px] font-medium mt-1">Recurrentes</span>
            </button>
            <button onClick={() => setActiveTab('balances')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'balances' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Wallet size={24} />
              <span className="text-[10px] font-medium mt-1">Balances</span>
            </button>
            <button onClick={() => setActiveTab('inversiones')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'inversiones' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <TrendingUp size={24} />
              <span className="text-[10px] font-medium mt-1">Inversiones</span>
            </button>
            <button onClick={() => setActiveTab('autonomo')} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${activeTab === 'autonomo' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Briefcase size={24} />
              <span className="text-[10px] font-medium mt-1">Autónomo</span>
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

import React, { useMemo } from 'react';
import {
  Briefcase,
  Users,
  FileText,
  ChevronDown,
  Building2,
  Truck,
  ShoppingBag,
  BarChart3,
  Upload,
} from 'lucide-react';
import {
  Owner,
  Client,
  Invoice,
  Supplier,
  ReceivedInvoice,
} from '../../types';
import { OwnersView } from './OwnersView';
import { ClientsView } from './ClientsView';
import { InvoicesView } from './InvoicesView';
import { SuppliersView } from './SuppliersView';
import { ReceivedInvoicesView } from './ReceivedInvoicesView';
import { AnalyticsView } from './AnalyticsView';
import { ImportView } from './ImportView';
import { Card } from '../ui';

type SubTab =
  | 'analitica'
  | 'facturas'
  | 'compras'
  | 'clientes'
  | 'proveedores'
  | 'titulares'
  | 'importar';

interface Props {
  owners: Owner[];
  clientes: Client[];
  facturas: Invoice[];
  proveedores: Supplier[];
  facturasRecibidas: ReceivedInvoice[];
  activeOwnerId?: string;
  onSaveOwner: (o: Owner) => void;
  onDeleteOwner: (id: string) => void;
  onSaveClient: (c: Client) => void;
  onDeleteClient: (id: string) => void;
  onSaveInvoice: (i: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onSaveSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onSaveReceivedInvoice: (r: ReceivedInvoice) => void;
  onDeleteReceivedInvoice: (id: string) => void;
  onImportClients: (items: Client[]) => void;
  onImportSuppliers: (items: Supplier[]) => void;
  onImportInvoices: (items: Invoice[]) => void;
  onImportReceivedInvoices: (items: ReceivedInvoice[]) => void;
  onClearOwnerData: (ownerId: string) => Promise<void> | void;
  onSetActiveOwner: (id: string) => void;
}

const TABS: { key: SubTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'analitica', label: 'Analítica', icon: BarChart3 },
  { key: 'facturas', label: 'Facturas', icon: FileText },
  { key: 'compras', label: 'Compras', icon: ShoppingBag },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'proveedores', label: 'Proveedores', icon: Truck },
  { key: 'titulares', label: 'Titulares', icon: Briefcase },
  { key: 'importar', label: 'Importar', icon: Upload },
];

export const AutonomoView: React.FC<Props> = ({
  owners,
  clientes,
  facturas,
  proveedores,
  facturasRecibidas,
  activeOwnerId,
  onSaveOwner,
  onDeleteOwner,
  onSaveClient,
  onDeleteClient,
  onSaveInvoice,
  onDeleteInvoice,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveReceivedInvoice,
  onDeleteReceivedInvoice,
  onImportClients,
  onImportSuppliers,
  onImportInvoices,
  onImportReceivedInvoices,
  onClearOwnerData,
  onSetActiveOwner,
}) => {
  const [subTab, setSubTab] = React.useState<SubTab>('facturas');

  const activeOwner = useMemo(
    () => owners.find((o) => o.id === activeOwnerId) || owners[0],
    [owners, activeOwnerId]
  );

  if (owners.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Autónomo</h2>
          <p className="text-sm text-gray-500">Facturación, clientes y fiscalidad</p>
        </div>
        <Card className="text-center py-10 border-2 border-dashed border-blue-100 bg-blue-50/40">
          <Briefcase size={40} className="mx-auto text-blue-300 mb-3" />
          <p className="text-gray-700 font-bold">Empieza creando un titular</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Cada titular representa a un autónomo con sus datos fiscales propios.
            Tú y tu mujer seréis dos titulares distintos.
          </p>
        </Card>
        <OwnersView
          owners={owners}
          activeOwnerId={activeOwnerId}
          clientes={clientes}
          proveedores={proveedores}
          facturas={facturas}
          facturasRecibidas={facturasRecibidas}
          onSave={onSaveOwner}
          onDelete={onDeleteOwner}
          onClearData={onClearOwnerData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Autónomo</h2>
          <p className="text-sm text-gray-500">Facturación, clientes y fiscalidad</p>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            Titular activo
          </label>
          <div className="relative">
            <Building2
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none"
            />
            <select
              value={activeOwner.id}
              onChange={(e) => onSetActiveOwner(e.target.value)}
              className="pl-9 pr-9 py-2 border-2 border-blue-200 rounded-lg bg-blue-50 font-medium text-blue-900 focus:outline-none focus:border-blue-500 appearance-none"
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b bg-white rounded-t-lg p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              subTab === key
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {subTab === 'analitica' && (
          <AnalyticsView
            facturas={facturas}
            facturasRecibidas={facturasRecibidas}
            activeOwner={activeOwner}
          />
        )}
        {subTab === 'facturas' && (
          <InvoicesView
            facturas={facturas}
            clientes={clientes}
            activeOwner={activeOwner}
            onSave={onSaveInvoice}
            onDelete={onDeleteInvoice}
          />
        )}
        {subTab === 'compras' && (
          <ReceivedInvoicesView
            facturasRecibidas={facturasRecibidas}
            proveedores={proveedores}
            activeOwner={activeOwner}
            onSave={onSaveReceivedInvoice}
            onDelete={onDeleteReceivedInvoice}
          />
        )}
        {subTab === 'clientes' && (
          <ClientsView
            clientes={clientes}
            activeOwner={activeOwner}
            onSave={onSaveClient}
            onDelete={onDeleteClient}
          />
        )}
        {subTab === 'proveedores' && (
          <SuppliersView
            proveedores={proveedores}
            activeOwner={activeOwner}
            onSave={onSaveSupplier}
            onDelete={onDeleteSupplier}
          />
        )}
        {subTab === 'titulares' && (
          <OwnersView
            owners={owners}
            activeOwnerId={activeOwner.id}
            clientes={clientes}
            proveedores={proveedores}
            facturas={facturas}
            facturasRecibidas={facturasRecibidas}
            onSave={onSaveOwner}
            onDelete={onDeleteOwner}
            onClearData={onClearOwnerData}
          />
        )}
        {subTab === 'importar' && (
          <ImportView
            activeOwner={activeOwner}
            clientes={clientes}
            proveedores={proveedores}
            facturas={facturas}
            facturasRecibidas={facturasRecibidas}
            onImportClients={onImportClients}
            onImportSuppliers={onImportSuppliers}
            onImportInvoices={onImportInvoices}
            onImportReceived={onImportReceivedInvoices}
          />
        )}
      </div>
    </div>
  );
};

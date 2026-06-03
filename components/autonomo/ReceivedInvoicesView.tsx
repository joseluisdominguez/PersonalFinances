import React, { useState, useMemo } from 'react';
import { Plus, ShoppingBag, Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { ReceivedInvoice, Supplier, Owner, ReceivedInvoiceStatus } from '../../types';
import { Button, Card, ConfirmDialog } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import { calcReceivedInvoiceTotals, filterByYearQuarter } from './utils';
import { ReceivedInvoiceEditor } from './ReceivedInvoiceEditor';
import { ReceivedInvoiceDetail } from './ReceivedInvoiceDetail';

interface Props {
  facturasRecibidas: ReceivedInvoice[];
  proveedores: Supplier[];
  activeOwner: Owner;
  onSave: (r: ReceivedInvoice) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLE: Record<ReceivedInvoiceStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  pagada: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<ReceivedInvoiceStatus, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
};

type SortField = 'numero' | 'fecha' | 'proveedor' | 'total';
type SortDir = 'asc' | 'desc';

export const ReceivedInvoicesView: React.FC<Props> = ({
  facturasRecibidas,
  proveedores,
  activeOwner,
  onSave,
  onDelete,
}) => {
  const [filterStatus, setFilterStatus] = useState<ReceivedInvoiceStatus | 'todas'>(
    'todas'
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ReceivedInvoice | undefined>(undefined);
  const [viewing, setViewing] = useState<ReceivedInvoice | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<number | 'todos'>('todos');
  const [filterQuarter, setFilterQuarter] = useState<number | 'todo'>('todo');

  const facturasDelOwner = useMemo(
    () => facturasRecibidas.filter((f) => f.ownerId === activeOwner.id),
    [facturasRecibidas, activeOwner.id]
  );

  const getProveedorNombre = (f: ReceivedInvoice): string =>
    proveedores.find((p) => p.id === f.proveedorId)?.nombre || '—';

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    facturasDelOwner.forEach((f) =>
      years.add(new Date(f.fechaEmision).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [facturasDelOwner]);

  const filtered = useMemo(() => {
    let base =
      filterStatus === 'todas'
        ? facturasDelOwner
        : facturasDelOwner.filter((f) => f.estado === filterStatus);

    if (filterYear !== 'todos') {
      base = filterByYearQuarter(base, filterYear, filterQuarter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      base = base.filter((f) => {
        const num = f.numeroExterno.toLowerCase();
        const proveedor = getProveedorNombre(f).toLowerCase();
        const categoria = (f.categoria || '').toLowerCase();
        const notas = (f.notas || '').toLowerCase();
        return (
          num.includes(q) ||
          proveedor.includes(q) ||
          categoria.includes(q) ||
          notas.includes(q)
        );
      });
    }

    const sign = sortDir === 'asc' ? 1 : -1;
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case 'numero':
          return a.numeroExterno.localeCompare(b.numeroExterno) * sign;
        case 'fecha':
          return (
            (new Date(a.fechaEmision).getTime() -
              new Date(b.fechaEmision).getTime()) *
            sign
          );
        case 'proveedor':
          return getProveedorNombre(a).localeCompare(getProveedorNombre(b)) * sign;
        case 'total': {
          const ta = calcReceivedInvoiceTotals(a.lineas, a.retencionIrpf || 0).total;
          const tb = calcReceivedInvoiceTotals(b.lineas, b.retencionIrpf || 0).total;
          return (ta - tb) * sign;
        }
      }
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    facturasDelOwner,
    filterStatus,
    filterYear,
    filterQuarter,
    search,
    sortBy,
    sortDir,
    proveedores,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const totalAcum = useMemo(
    () =>
      filtered.reduce(
        (acc, f) =>
          acc + calcReceivedInvoiceTotals(f.lineas, f.retencionIrpf || 0).total,
        0
      ),
    [filtered]
  );

  const openNew = () => {
    setEditing(undefined);
    setIsEditorOpen(true);
  };

  const openEdit = (f: ReceivedInvoice) => {
    setEditing(f);
    setIsEditorOpen(true);
  };

  const changeStatus = (f: ReceivedInvoice, estado: ReceivedInvoiceStatus) => {
    onSave({
      ...f,
      estado,
      fechaPago:
        estado === 'pagada'
          ? f.fechaPago || new Date().toISOString().slice(0, 10)
          : f.fechaPago,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Facturas recibidas</h3>
          <p className="text-sm text-gray-500">
            Compras y gastos de <strong>{activeOwner.nombre}</strong>
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus size={18} /> Nueva factura
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-amber-600 to-orange-600 text-white border-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">
              Total compras (
              {filterStatus === 'todas' ? 'todas' : STATUS_LABEL[filterStatus]})
            </p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalAcum)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-80">Facturas</p>
            <p className="text-3xl font-bold mt-1">{filtered.length}</p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-stretch">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por número, proveedor, categoría o notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-sm"
          />
        </div>
        <select
          value={filterYear}
          onChange={(e) =>
            setFilterYear(
              e.target.value === 'todos' ? 'todos' : Number(e.target.value)
            )
          }
          className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:border-blue-500"
        >
          <option value="todos">Todos los años</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={filterQuarter}
          disabled={filterYear === 'todos'}
          onChange={(e) =>
            setFilterQuarter(
              e.target.value === 'todo' ? 'todo' : Number(e.target.value)
            )
          }
          className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="todo">Anual</option>
          <option value="1">T1</option>
          <option value="2">T2</option>
          <option value="3">T3</option>
          <option value="4">T4</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['todas', 'pendiente', 'pagada'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'todas' ? 'Todas' : STATUS_LABEL[s as ReceivedInvoiceStatus]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            {facturasDelOwner.length === 0
              ? 'Aún no has registrado facturas recibidas'
              : 'Sin facturas en este filtro'}
          </p>
          {facturasDelOwner.length === 0 && (
            <Button variant="outline" className="mt-4" onClick={openNew}>
              Registrar primera factura
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('numero')}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      Nº <SortIcon field="numero" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('fecha')}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      Fecha <SortIcon field="fecha" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('proveedor')}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      Proveedor <SortIcon field="proveedor" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                  <th className="px-4 py-3 text-right">IRPF</th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSort('total')}
                      className="inline-flex items-center gap-1 hover:text-gray-900 justify-end w-full"
                    >
                      Total <SortIcon field="total" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const t = calcReceivedInvoiceTotals(
                    f.lineas,
                    f.retencionIrpf || 0
                  );
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setViewing(f)}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                        {f.numeroExterno}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(f.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {getProveedorNombre(f)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.categoria || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(t.baseImponible)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(t.totalIva)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {(f.retencionIrpf || 0) > 0
                          ? `-${formatCurrency(t.totalIrpf)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {formatCurrency(t.total)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={f.estado}
                          onChange={(e) =>
                            changeStatus(
                              f,
                              e.target.value as ReceivedInvoiceStatus
                            )
                          }
                          className={`px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer ${
                            STATUS_STYLE[f.estado]
                          }`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="pagada">Pagada</option>
                        </select>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEdit(f)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(f.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <ReceivedInvoiceEditor
          proveedores={proveedores}
          activeOwner={activeOwner}
          editing={editing}
          onSave={onSave}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {viewing && (
        <ReceivedInvoiceDetail
          invoice={viewing}
          owner={activeOwner}
          proveedor={proveedores.find((p) => p.id === viewing.proveedorId)}
          onClose={() => setViewing(undefined)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(undefined);
            setIsEditorOpen(true);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && onDelete(deleteId)}
        title="Eliminar factura recibida"
        message="Esta acción no se puede deshacer."
      />
    </div>
  );
};

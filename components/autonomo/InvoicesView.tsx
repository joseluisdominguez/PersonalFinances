import React, { useState, useMemo, useEffect } from 'react';
import { Plus, FileText, Edit2, Trash2, Download, Copy, ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { Invoice, Client, Owner, InvoiceStatus } from '../../types';
import { Button, Card, ConfirmDialog } from '../ui';
import { formatCurrency, formatDate, generateId } from '../../utils';
import {
  calcInvoiceTotals,
  filterByYearQuarter,
  getInvoiceDisplayNumber,
  getNextInvoiceNumber,
  isInvoiceOverdue,
  updateReferenciaNumber,
} from './utils';
import { InvoiceEditor } from './InvoiceEditor';
import { InvoiceDetail } from './InvoiceDetail';

interface Props {
  facturas: Invoice[];
  clientes: Client[];
  activeOwner: Owner;
  onSave: (i: Invoice) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente: 'bg-amber-100 text-amber-800',
  vencida: 'bg-red-100 text-red-700',
  pagada: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  pagada: 'Pagada',
};

type SortField = 'numero' | 'fecha' | 'cliente' | 'total';
type SortDir = 'asc' | 'desc';

export const InvoicesView: React.FC<Props> = ({
  facturas,
  clientes,
  activeOwner,
  onSave,
  onDelete,
}) => {
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'todas'>('todas');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | undefined>(undefined);
  const [viewing, setViewing] = useState<Invoice | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('numero');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<number | 'todos'>('todos');
  const [filterQuarter, setFilterQuarter] = useState<number | 'todo'>('todo');

  // Marcado automático de vencidas en memoria (no persiste)
  useEffect(() => {
    facturas
      .filter((f) => f.ownerId === activeOwner.id && isInvoiceOverdue(f))
      .forEach((f) => onSave({ ...f, estado: 'vencida' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOwner.id]);

  const facturasDelOwner = useMemo(
    () => facturas.filter((f) => f.ownerId === activeOwner.id),
    [facturas, activeOwner.id]
  );

  const getClienteNombre = (f: Invoice): string => {
    if (f.clienteSnapshot?.nombre) return f.clienteSnapshot.nombre;
    return clientes.find((c) => c.id === f.clienteId)?.nombre || '—';
  };

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
        const num = getInvoiceDisplayNumber(f).toLowerCase();
        const cliente = getClienteNombre(f).toLowerCase();
        const notas = (f.notas || '').toLowerCase();
        return num.includes(q) || cliente.includes(q) || notas.includes(q);
      });
    }

    const sign = sortDir === 'asc' ? 1 : -1;
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case 'numero': {
          const yearA = new Date(a.fechaEmision).getFullYear();
          const yearB = new Date(b.fechaEmision).getFullYear();
          if (yearA !== yearB) return (yearA - yearB) * sign;
          const serieCmp = a.serie.localeCompare(b.serie);
          if (serieCmp !== 0) return serieCmp * sign;
          return (a.numero - b.numero) * sign;
        }
        case 'fecha':
          return (
            (new Date(a.fechaEmision).getTime() -
              new Date(b.fechaEmision).getTime()) *
            sign
          );
        case 'cliente':
          return getClienteNombre(a).localeCompare(getClienteNombre(b)) * sign;
        case 'total': {
          const ta = calcInvoiceTotals(a.lineas, a.aplicaIrpf, a.irpfPct).total;
          const tb = calcInvoiceTotals(b.lineas, b.aplicaIrpf, b.irpfPct).total;
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
    clientes,
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

  const totalAcum = useMemo(() => {
    return filtered.reduce((acc, f) => {
      const t = calcInvoiceTotals(f.lineas, f.aplicaIrpf, f.irpfPct);
      return acc + t.total;
    }, 0);
  }, [filtered]);

  const openNew = () => {
    setEditing(undefined);
    setIsEditorOpen(true);
  };

  const openEdit = (i: Invoice) => {
    setEditing(i);
    setIsEditorOpen(true);
  };

  const changeStatus = (f: Invoice, estado: InvoiceStatus) => {
    onSave({ ...f, estado, fechaCobro: estado === 'pagada' ? new Date().toISOString().slice(0, 10) : f.fechaCobro });
  };

  const handleClone = (f: Invoice) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const year = new Date(todayIso).getFullYear();
    const numero = getNextInvoiceNumber(facturas, activeOwner.id, f.serie, year);

    let nuevaFechaVencimiento: string | undefined;
    if (f.fechaVencimiento) {
      const diffMs =
        new Date(f.fechaVencimiento).getTime() - new Date(f.fechaEmision).getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const d = new Date(todayIso);
      d.setDate(d.getDate() + diffDays);
      nuevaFechaVencimiento = d.toISOString().slice(0, 10);
    }

    const clon: Invoice = {
      ...f,
      id: generateId(),
      numero,
      referenciaCustom: updateReferenciaNumber(f.referenciaCustom, numero),
      fechaEmision: todayIso,
      fechaVencimiento: nuevaFechaVencimiento,
      fechaCobro: undefined,
      estado: 'borrador',
      adjuntos: [],
      lineas: f.lineas.map((l) => ({ ...l, id: generateId() })),
      clienteSnapshot: undefined,
    };
    onSave(clon);
  };

  const downloadPdf = async (f: Invoice) => {
    const [{ pdf }, { InvoicePdf }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./InvoicePdf'),
    ]);
    const cliente = clientes.find((c) => c.id === f.clienteId);
    const blob = await pdf(
      <InvoicePdf invoice={f} owner={activeOwner} cliente={cliente} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getInvoiceDisplayNumber(f)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Facturas emitidas</h3>
          <p className="text-sm text-gray-500">
            Facturas de <strong>{activeOwner.nombre}</strong>
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus size={18} /> Nueva factura
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">
              Total ({filterStatus === 'todas' ? 'todas' : STATUS_LABEL[filterStatus]})
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
            placeholder="Buscar por número, cliente o notas..."
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
        {(['todas', 'borrador', 'pendiente', 'vencida', 'pagada'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'todas' ? 'Todas' : STATUS_LABEL[s as InvoiceStatus]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            {facturasDelOwner.length === 0
              ? 'Aún no has emitido facturas'
              : 'Sin facturas en este filtro'}
          </p>
          {facturasDelOwner.length === 0 && (
            <Button variant="outline" className="mt-4" onClick={openNew}>
              Crear primera factura
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
                      Número <SortIcon field="numero" />
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
                      onClick={() => toggleSort('cliente')}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      Cliente <SortIcon field="cliente" />
                    </button>
                  </th>
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
                  const t = calcInvoiceTotals(f.lineas, f.aplicaIrpf, f.irpfPct);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setViewing(f)}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                        {getInvoiceDisplayNumber(f)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(f.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {getClienteNombre(f)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(t.baseImponible)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(t.totalIva)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {f.aplicaIrpf ? `-${formatCurrency(t.totalIrpf)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {formatCurrency(t.total)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={f.estado}
                          onChange={(e) =>
                            changeStatus(f, e.target.value as InvoiceStatus)
                          }
                          className={`px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer ${
                            STATUS_STYLE[f.estado]
                          }`}
                        >
                          <option value="borrador">Borrador</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="vencida">Vencida</option>
                          <option value="pagada">Pagada</option>
                        </select>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => downloadPdf(f)}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded"
                            title="Descargar PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleClone(f)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                            title="Clonar como borrador"
                          >
                            <Copy size={16} />
                          </button>
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
        <InvoiceEditor
          facturas={facturas}
          clientes={clientes}
          activeOwner={activeOwner}
          editing={editing}
          onSave={onSave}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {viewing && (
        <InvoiceDetail
          invoice={viewing}
          owner={activeOwner}
          cliente={clientes.find((c) => c.id === viewing.clienteId)}
          onClose={() => setViewing(undefined)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(undefined);
            setIsEditorOpen(true);
          }}
          onDownloadPdf={() => downloadPdf(viewing)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && onDelete(deleteId)}
        title="Eliminar factura"
        message="Esta acción no se puede deshacer."
      />
    </div>
  );
};

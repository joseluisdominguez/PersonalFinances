import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Invoice, InvoiceLine, Client, Owner } from '../../types';
import { Button, Card, Input, Select } from '../ui';
import { formatCurrency, generateId } from '../../utils';
import {
  calcInvoiceTotals,
  getInvoiceDisplayNumber,
  getNextInvoiceNumber,
  updateReferenciaNumber,
  IVA_RATES,
  DEFAULT_IRPF_PCT,
} from './utils';
import { AttachmentsField } from './AttachmentsField';

interface Props {
  facturas: Invoice[];
  clientes: Client[];
  activeOwner: Owner;
  editing?: Invoice;
  cloneFrom?: Invoice;
  onSave: (i: Invoice) => void;
  onClose: () => void;
}

const emptyLine = (): InvoiceLine => ({
  id: generateId(),
  descripcion: '',
  cantidad: 1,
  precioUnitario: 0,
  ivaPct: 21,
});

const today = (): string => new Date().toISOString().slice(0, 10);

const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const InvoiceEditor: React.FC<Props> = ({
  facturas,
  clientes,
  activeOwner,
  editing,
  cloneFrom,
  onSave,
  onClose,
}) => {
  const clientesDelOwner = useMemo(
    () => clientes.filter((c) => c.ownerId === activeOwner.id),
    [clientes, activeOwner.id]
  );

  const buildInitial = (): Invoice => {
    if (editing) return editing;
    if (cloneFrom) return cloneFrom;
    const fechaEmision = today();
    const year = new Date(fechaEmision).getFullYear();
    const serie = activeOwner.serieFacturas || 'A';
    const numero = getNextInvoiceNumber(facturas, activeOwner.id, serie, year);
    const primerCliente = clientesDelOwner[0];
    return {
      id: generateId(),
      ownerId: activeOwner.id,
      clienteId: primerCliente?.id || '',
      serie,
      numero,
      fechaEmision,
      fechaVencimiento: addDays(fechaEmision, 30),
      estado: 'borrador',
      lineas: [emptyLine()],
      aplicaIrpf: (primerCliente?.retencionPct ?? activeOwner.retencionPctDefault ?? 0) > 0,
      irpfPct:
        primerCliente?.retencionPct ?? activeOwner.retencionPctDefault ?? DEFAULT_IRPF_PCT,
      notas: '',
    };
  };

  const [form, setForm] = useState<Invoice>(buildInitial);

  useEffect(() => {
    setForm(buildInitial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, cloneFrom?.id]);

  const cliente = clientesDelOwner.find((c) => c.id === form.clienteId);

  const totales = useMemo(
    () => calcInvoiceTotals(form.lineas, form.aplicaIrpf, form.irpfPct),
    [form.lineas, form.aplicaIrpf, form.irpfPct]
  );

  const updateLine = (id: string, patch: Partial<InvoiceLine>) => {
    setForm({
      ...form,
      lineas: form.lineas.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addLine = () => setForm({ ...form, lineas: [...form.lineas, emptyLine()] });

  const removeLine = (id: string) => {
    if (form.lineas.length === 1) return;
    setForm({ ...form, lineas: form.lineas.filter((l) => l.id !== id) });
  };

  const handleClienteChange = (id: string) => {
    const c = clientesDelOwner.find((x) => x.id === id);
    setForm({
      ...form,
      clienteId: id,
      irpfPct: c?.retencionPct ?? form.irpfPct,
      aplicaIrpf: (c?.retencionPct ?? 0) > 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;
    const snapshot = {
      nombre: cliente.nombre,
      nif: cliente.nif,
      direccion: cliente.direccion,
    };
    onSave({
      ...form,
      clienteSnapshot: snapshot,
      lineas: form.lineas.map((l) => ({
        ...l,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        ivaPct: Number(l.ivaPct),
      })),
      irpfPct: Number(form.irpfPct),
      numero: Number(form.numero),
    });
    onClose();
  };

  const noClients = clientesDelOwner.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <Card className="max-w-4xl w-full shadow-2xl border-none p-0 overflow-hidden bg-white my-8">
        <div className="bg-gray-800 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">
              {editing ? 'Editar factura' : 'Nueva factura'}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {getInvoiceDisplayNumber(form)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {noClients ? (
          <div className="p-10 text-center">
            <p className="text-gray-600 mb-4">
              Necesitas crear al menos un cliente para emitir una factura.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Select
                label="Cliente"
                value={form.clienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
                required
              >
                {clientesDelOwner.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
              <Input
                label="Fecha de emisión"
                type="date"
                value={form.fechaEmision}
                onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
                required
              />
              <Input
                label="Vencimiento"
                type="date"
                value={form.fechaVencimiento || ''}
                onChange={(e) =>
                  setForm({ ...form, fechaVencimiento: e.target.value })
                }
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Input
                label="Serie"
                value={form.serie}
                onChange={(e) =>
                  setForm({
                    ...form,
                    serie: e.target.value,
                    referenciaCustom: undefined,
                  })
                }
                required
              />
              <Input
                label="Número"
                type="number"
                min="1"
                value={form.numero}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setForm({
                    ...form,
                    numero: n,
                    referenciaCustom: updateReferenciaNumber(
                      form.referenciaCustom,
                      n
                    ),
                  });
                }}
                required
              />
              <Select
                label="Estado"
                value={form.estado}
                onChange={(e) =>
                  setForm({ ...form, estado: e.target.value as Invoice['estado'] })
                }
              >
                <option value="borrador">Borrador</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencida">Vencida</option>
                <option value="pagada">Pagada</option>
              </Select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-900">Líneas</h4>
                <Button variant="outline" onClick={addLine}>
                  <Plus size={16} /> Añadir línea
                </Button>
              </div>
              <div className="space-y-3">
                {form.lineas.map((l) => (
                  <div
                    key={l.id}
                    className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <Input
                        label="Descripción"
                        value={l.descripcion}
                        onChange={(e) =>
                          updateLine(l.id, { descripcion: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Input
                        label="Cantidad"
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.cantidad}
                        onChange={(e) =>
                          updateLine(l.id, { cantidad: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        label="Precio (€)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.precioUnitario}
                        onChange={(e) =>
                          updateLine(l.id, { precioUnitario: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Select
                        label="IVA"
                        value={l.ivaPct}
                        onChange={(e) =>
                          updateLine(l.id, { ivaPct: Number(e.target.value) })
                        }
                      >
                        {IVA_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        disabled={form.lineas.length === 1}
                        className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <input
                    id="aplicaIrpf"
                    type="checkbox"
                    className="w-5 h-5"
                    checked={form.aplicaIrpf}
                    onChange={(e) =>
                      setForm({ ...form, aplicaIrpf: e.target.checked })
                    }
                  />
                  <label htmlFor="aplicaIrpf" className="text-sm font-medium flex-1">
                    Aplicar retención IRPF
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={!form.aplicaIrpf}
                    value={form.irpfPct}
                    onChange={(e) =>
                      setForm({ ...form, irpfPct: Number(e.target.value) })
                    }
                    className="w-20 px-2 py-1 border-2 border-gray-200 rounded disabled:opacity-50"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
                <Input
                  label="Notas"
                  value={form.notas || ''}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjuntos
                  </label>
                  <AttachmentsField
                    adjuntos={form.adjuntos || []}
                    onChange={(adjuntos) => setForm({ ...form, adjuntos })}
                  />
                </div>
              </div>

              <Card className="bg-gray-50 border">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base imponible</span>
                    <span className="font-medium">
                      {formatCurrency(totales.baseImponible)}
                    </span>
                  </div>
                  {Object.entries(totales.ivaDesglose)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([pct, { base, cuota }]) => (
                      <div key={pct} className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          IVA {pct}% s/ {formatCurrency(base)}
                        </span>
                        <span>{formatCurrency(cuota)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Total IVA</span>
                    <span className="font-medium">
                      {formatCurrency(totales.totalIva)}
                    </span>
                  </div>
                  {form.aplicaIrpf && (
                    <div className="flex justify-between text-red-600">
                      <span>Retención IRPF ({form.irpfPct}%)</span>
                      <span className="font-medium">
                        -{formatCurrency(totales.totalIrpf)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span className="font-bold">Total factura</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(totales.total)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Guardar factura
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

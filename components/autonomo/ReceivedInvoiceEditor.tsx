import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  ReceivedInvoice,
  ReceivedInvoiceLine,
  Supplier,
  Owner,
} from '../../types';
import { Button, Card, Input, Select, Modal } from '../ui';
import { formatCurrency, generateId } from '../../utils';
import { calcReceivedInvoiceTotals, IVA_RATES } from './utils';
import { AttachmentsField } from './AttachmentsField';

interface Props {
  proveedores: Supplier[];
  activeOwner: Owner;
  editing?: ReceivedInvoice;
  cloneFrom?: ReceivedInvoice;
  onSave: (r: ReceivedInvoice) => void;
  onClose: () => void;
}

const emptyLine = (): ReceivedInvoiceLine => ({
  id: generateId(),
  descripcion: '',
  cantidad: 1,
  precioUnitario: 0,
  ivaPct: 21,
});

const today = (): string => new Date().toISOString().slice(0, 10);

export const ReceivedInvoiceEditor: React.FC<Props> = ({
  proveedores,
  activeOwner,
  editing,
  cloneFrom,
  onSave,
  onClose,
}) => {
  const proveedoresOwner = useMemo(
    () => proveedores.filter((p) => p.ownerId === activeOwner.id),
    [proveedores, activeOwner.id]
  );

  const buildInitial = (): ReceivedInvoice => {
    if (editing) return editing;
    if (cloneFrom) return cloneFrom;
    return {
      id: generateId(),
      ownerId: activeOwner.id,
      proveedorId: proveedoresOwner[0]?.id || '',
      numeroExterno: '',
      fechaEmision: today(),
      estado: 'pendiente',
      lineas: [emptyLine()],
      retencionIrpf: 0,
      categoria: '',
      notas: '',
    };
  };

  const [form, setForm] = useState<ReceivedInvoice>(buildInitial);

  useEffect(() => {
    setForm(buildInitial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, cloneFrom?.id]);

  const totales = useMemo(
    () => calcReceivedInvoiceTotals(form.lineas, form.retencionIrpf || 0),
    [form.lineas, form.retencionIrpf]
  );

  const updateLine = (id: string, patch: Partial<ReceivedInvoiceLine>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      retencionIrpf: Number(form.retencionIrpf) || 0,
      lineas: form.lineas.map((l) => ({
        ...l,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        ivaPct: Number(l.ivaPct),
      })),
    });
    onClose();
  };

  const noSuppliers = proveedoresOwner.length === 0;

  return (
    <Modal>
      <Card className="max-w-4xl w-full shadow-2xl border-none p-0 overflow-hidden bg-white">
        <div className="bg-gray-800 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">
            {editing ? 'Editar factura recibida' : 'Nueva factura recibida'}
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {noSuppliers ? (
          <div className="p-10 text-center">
            <p className="text-gray-600 mb-4">
              Necesitas crear al menos un proveedor antes de registrar facturas
              recibidas.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Select
                label="Proveedor"
                value={form.proveedorId}
                onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                required
              >
                {proveedoresOwner.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
              <Input
                label="Nº factura del proveedor"
                value={form.numeroExterno}
                onChange={(e) =>
                  setForm({ ...form, numeroExterno: e.target.value })
                }
                required
              />
              <Input
                label="Fecha de emisión"
                type="date"
                value={form.fechaEmision}
                onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Select
                label="Estado"
                value={form.estado}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estado: e.target.value as ReceivedInvoice['estado'],
                  })
                }
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
              </Select>
              <Input
                label="Fecha de pago"
                type="date"
                value={form.fechaPago || ''}
                onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
              />
              <Input
                label="Categoría / gasto"
                value={form.categoria || ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ej: Material oficina"
              />
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
                          updateLine(l.id, {
                            precioUnitario: Number(e.target.value),
                          })
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
                <Input
                  label="Retención IRPF en la factura (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.retencionIrpf ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, retencionIrpf: Number(e.target.value) })
                  }
                />
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
                    <span className="text-gray-600">Total IVA soportado</span>
                    <span className="font-medium">
                      {formatCurrency(totales.totalIva)}
                    </span>
                  </div>
                  {(form.retencionIrpf || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Retención IRPF ({form.retencionIrpf}%)</span>
                      <span className="font-medium">
                        -{formatCurrency(totales.totalIrpf)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span className="font-bold">Total a pagar</span>
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
    </Modal>
  );
};

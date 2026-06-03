import React, { useState } from 'react';
import { Plus, Trash2, Edit2, User, X, Briefcase, Eraser, AlertTriangle } from 'lucide-react';
import { Owner, Client, Supplier, Invoice, ReceivedInvoice } from '../../types';
import { Button, Card, Input, ConfirmDialog } from '../ui';
import { generateId } from '../../utils';
import { formatIban, isValidIban } from './utils';

interface Props {
  owners: Owner[];
  activeOwnerId?: string;
  clientes: Client[];
  proveedores: Supplier[];
  facturas: Invoice[];
  facturasRecibidas: ReceivedInvoice[];
  onSave: (o: Owner) => void;
  onDelete: (id: string) => void;
  onClearData: (ownerId: string) => Promise<void> | void;
}

const emptyOwner = (): Partial<Owner> => ({
  nombre: '',
  nif: '',
  direccion: '',
  iban: '',
  email: '',
  retencionPctDefault: 15,
  serieFacturas: 'A',
});

export const OwnersView: React.FC<Props> = ({
  owners,
  activeOwnerId,
  clientes,
  proveedores,
  facturas,
  facturasRecibidas,
  onSave,
  onDelete,
  onClearData,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearingOwner, setClearingOwner] = useState<Owner | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [clearing, setClearing] = useState(false);
  const [formData, setFormData] = useState<Partial<Owner>>(emptyOwner());

  const ibanRaw = (formData.iban || '').trim();
  const ibanError =
    ibanRaw.length > 0 && !isValidIban(ibanRaw)
      ? 'IBAN no válido'
      : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ibanError) return;
    onSave({
      ...formData,
      id: editingId || generateId(),
      retencionPctDefault: Number(formData.retencionPctDefault) || 0,
      iban: ibanRaw ? formatIban(ibanRaw) : '',
    } as Owner);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleEdit = (o: Owner) => {
    setEditingId(o.id);
    setFormData(o);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setFormData(emptyOwner());
    setEditingId(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Titulares</h3>
          <p className="text-sm text-gray-500">Datos fiscales de cada autónomo</p>
        </div>
        {owners.length > 0 && (
          <Button onClick={openNew} className="w-full sm:w-auto">
            <Plus size={18} /> Nuevo titular
          </Button>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Aún no has añadido titulares</p>
          <Button variant="outline" className="mt-4" onClick={openNew}>
            Crear primer titular
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((o) => (
            <Card
              key={o.id}
              className={`group hover:shadow-md transition-all ${
                o.id === activeOwnerId ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{o.nombre}</h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {o.nif || 'Sin NIF'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(o)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setClearingOwner(o);
                      setConfirmName('');
                    }}
                    className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg"
                    title="Vaciar datos del titular"
                  >
                    <Eraser size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(o.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title="Eliminar titular"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {o.direccion && <p>{o.direccion}</p>}
                {o.email && <p>{o.email}</p>}
                <div className="flex gap-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Serie: {o.serieFacturas || 'A'}</span>
                  <span>IRPF: {o.retencionPctDefault ?? 15}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <Card className="max-w-lg w-full shadow-2xl border-none p-0 overflow-hidden bg-white">
            <div className="bg-gray-800 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingId ? 'Editar titular' : 'Nuevo titular'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nombre fiscal"
                placeholder="Ej: Juan Pérez García"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="NIF"
                  placeholder="00000000X"
                  value={formData.nif || ''}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <Input
                label="Dirección fiscal"
                value={formData.direccion || ''}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
              <Input
                label="IBAN (para cobros)"
                placeholder="ES00 0000 0000 0000 0000 0000"
                value={formData.iban || ''}
                onChange={(e) =>
                  setFormData({ ...formData, iban: e.target.value })
                }
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && isValidIban(val)) {
                    setFormData({ ...formData, iban: formatIban(val) });
                  }
                }}
                error={ibanError}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Serie facturas"
                  placeholder="A"
                  value={formData.serieFacturas || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, serieFacturas: e.target.value })
                  }
                />
                <Input
                  label="IRPF por defecto (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.retencionPctDefault ?? 15}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      retencionPctDefault: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Guardar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && onDelete(deleteId)}
        title="Eliminar titular"
        message="Las facturas y clientes asociados quedarán huérfanos. ¿Continuar?"
      />

      {clearingOwner && (() => {
        const c = clientes.filter(x => x.ownerId === clearingOwner.id).length;
        const p = proveedores.filter(x => x.ownerId === clearingOwner.id).length;
        const fv = facturas.filter(x => x.ownerId === clearingOwner.id);
        const fc = facturasRecibidas.filter(x => x.ownerId === clearingOwner.id);
        const adj = [
          ...fv.flatMap(f => f.adjuntos || []),
          ...fc.flatMap(f => f.adjuntos || []),
        ].length;
        const total = c + p + fv.length + fc.length;
        const nameMatches =
          confirmName.trim().toLowerCase() ===
          clearingOwner.nombre.trim().toLowerCase();

        const handleConfirm = async () => {
          if (!nameMatches || clearing) return;
          setClearing(true);
          try {
            await onClearData(clearingOwner.id);
            setClearingOwner(null);
            setConfirmName('');
          } finally {
            setClearing(false);
          }
        };

        return (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <Card className="max-w-md w-full shadow-2xl border-none p-0 overflow-hidden bg-white">
              <div className="bg-amber-600 p-5 text-white flex items-center gap-3">
                <AlertTriangle size={22} />
                <div>
                  <h3 className="font-bold">Vaciar datos del titular</h3>
                  <p className="text-xs text-white/80">{clearingOwner.nombre}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-700">
                  Esta acción <strong>no se puede deshacer</strong>. Se eliminarán
                  todos los datos asociados a este titular, pero el titular en sí
                  se conservará.
                </p>

                {total === 0 ? (
                  <Card className="bg-gray-50 border text-sm text-gray-600">
                    Este titular no tiene datos asociados. No hay nada que vaciar.
                  </Card>
                ) : (
                  <Card className="bg-amber-50 border-amber-100">
                    <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-2">
                      Se eliminarán
                    </p>
                    <ul className="text-sm text-amber-900 space-y-1">
                      <li>• {c} cliente(s)</li>
                      <li>• {p} proveedor(es)</li>
                      <li>• {fv.length} factura(s) de venta</li>
                      <li>• {fc.length} factura(s) de compra</li>
                      {adj > 0 && (
                        <li>• {adj} adjunto(s) en IndexedDB</li>
                      )}
                    </ul>
                  </Card>
                )}

                {total > 0 && (
                  <div>
                    <Input
                      label={`Para confirmar, escribe el nombre del titular: ${clearingOwner.nombre}`}
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={clearingOwner.nombre}
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setClearingOwner(null);
                      setConfirmName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={total === 0 || !nameMatches || clearing}
                    onClick={handleConfirm}
                  >
                    {clearing ? 'Vaciando...' : 'Vaciar datos'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );
};

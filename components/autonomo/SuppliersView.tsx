import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Truck, X, Search } from 'lucide-react';
import { Supplier, Owner } from '../../types';
import { Button, Card, Input, ConfirmDialog } from '../ui';
import { generateId } from '../../utils';

interface Props {
  proveedores: Supplier[];
  activeOwner: Owner;
  onSave: (s: Supplier) => void;
  onDelete: (id: string) => void;
}

const emptySupplier = (ownerId: string): Partial<Supplier> => ({
  ownerId,
  nombre: '',
  nif: '',
  direccion: '',
  email: '',
  notas: '',
});

export const SuppliersView: React.FC<Props> = ({
  proveedores,
  activeOwner,
  onSave,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<Supplier>>(
    emptySupplier(activeOwner.id)
  );

  const delOwner = useMemo(
    () => proveedores.filter((p) => p.ownerId === activeOwner.id),
    [proveedores, activeOwner.id]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return delOwner;
    return delOwner.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.nif.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [delOwner, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      ownerId: activeOwner.id,
      id: editingId || generateId(),
    } as Supplier);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormData(s);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setFormData(emptySupplier(activeOwner.id));
    setEditingId(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Proveedores</h3>
          <p className="text-sm text-gray-500">
            Proveedores de <strong>{activeOwner.nombre}</strong>
          </p>
        </div>
        {delOwner.length > 0 && (
          <Button onClick={openNew} className="w-full sm:w-auto">
            <Plus size={18} /> Nuevo proveedor
          </Button>
        )}
      </div>

      {delOwner.length > 0 && (
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, NIF o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Truck size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            {delOwner.length === 0
              ? 'Aún no tienes proveedores'
              : 'Sin resultados para esa búsqueda'}
          </p>
          {delOwner.length === 0 && (
            <Button variant="outline" className="mt-4" onClick={openNew}>
              Crear primer proveedor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 leading-tight truncate">
                      {p.nombre}
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {p.nif || 'Sin NIF'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {p.direccion && <p className="truncate">{p.direccion}</p>}
                {p.email && <p className="truncate">{p.email}</p>}
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
                {editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nombre / Razón social"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="NIF / CIF"
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
                label="Dirección"
                value={formData.direccion || ''}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
              />
              <Input
                label="Notas"
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
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
        title="Eliminar proveedor"
        message="Las facturas recibidas asociadas perderán el enlace al proveedor. ¿Continuar?"
      />
    </div>
  );
};

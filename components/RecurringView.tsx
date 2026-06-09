
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Repeat, Calendar, DollarSign, X, Save, ShieldCheck, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { RecurringTransaction, CategoryItem, FrequencyType } from '../types';
import { Button, Card, Input, Select, ConfirmDialog, Modal } from './ui';
import { formatCurrency, generateId, getMonthName } from '../utils';

interface Props {
  data: RecurringTransaction[];
  categories: CategoryItem[];
  onSave: (r: RecurringTransaction) => void;
  onDelete: (id: string) => void;
}

const FREQUENCIES: { value: FrequencyType, label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' }
];

export const RecurringView: React.FC<Props> = ({ data, categories, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initialFormState: Partial<RecurringTransaction> = {
    nombre: '',
    tipo: 'gasto',
    categoria: categories[0]?.name || 'Otros',
    cantidad: 0,
    frecuencia: 'mensual',
    diaMes: 1,
    mesInicio: 0,
    activo: true,
    notas: ''
  };

  const [formData, setFormData] = useState<Partial<RecurringTransaction>>(initialFormState);

  const totalMonthlyBurn = useMemo(() => {
    return data.filter(r => r.activo && r.tipo === 'gasto').reduce((acc, curr) => {
      let monthlyRate = curr.cantidad;
      if (curr.frecuencia === 'trimestral') monthlyRate = curr.cantidad / 3;
      if (curr.frecuencia === 'semestral') monthlyRate = curr.cantidad / 6;
      if (curr.frecuencia === 'anual') monthlyRate = curr.cantidad / 12;
      return acc + monthlyRate;
    }, 0);
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: editingId || generateId(),
      cantidad: Number(formData.cantidad),
      diaMes: Number(formData.diaMes),
      mesInicio: Number(formData.mesInicio)
    } as RecurringTransaction);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleEdit = (r: RecurringTransaction) => {
    setEditingId(r.id);
    setFormData(r);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gastos Recurrentes</h2>
          <p className="text-sm text-gray-500">Gestiona tus suscripciones y pagos fijos</p>
        </div>
        <Button onClick={() => { setFormData(initialFormState); setEditingId(null); setIsFormOpen(true); }} className="w-full sm:w-auto">
          <Plus size={18} /> Nueva Plantilla
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-indigo-600 text-white border-none shadow-xl flex flex-col justify-center p-6">
           <div className="flex items-center gap-2 opacity-80 mb-2">
             <ShieldCheck size={20} />
             <span className="text-xs font-bold uppercase tracking-widest">Carga Mensual Estimada</span>
           </div>
           <p className="text-3xl font-bold mb-1">{formatCurrency(totalMonthlyBurn)}</p>
           <p className="text-[10px] text-blue-100 font-medium">Coste de mantenimiento prorrateado</p>
        </Card>
        
        <Card className="md:col-span-2 flex items-center gap-6 bg-white border shadow-sm">
           <div className="hidden sm:flex p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Repeat size={32} />
           </div>
           <div className="space-y-1">
              <h3 className="font-bold text-gray-900">Sugerencias Inteligentes</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Cada mes el sistema detectará qué plantillas te faltan por pagar para que puedas importarlas con un clic.
              </p>
           </div>
        </Card>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Repeat size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Aún no tienes plantillas guardadas</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsFormOpen(true)}>Crear primera plantilla</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(r => (
            <Card key={r.id} className={`group hover:shadow-md transition-all ${!r.activo ? 'opacity-50 grayscale bg-gray-50' : 'bg-white border-gray-100'}`}>
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-xl ${r.tipo === 'ingreso' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {r.tipo === 'ingreso' ? <DollarSign size={20} /> : <CreditCard size={20} />}
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-900 leading-tight">{r.nombre}</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{r.frecuencia} • Día {r.diaMes}</span>
                     </div>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Edit2 size={16} /></button>
                     <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                  </div>
               </div>
               
               <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm inline-block" style={{ backgroundColor: categories.find(c => c.name === r.categoria)?.color || '#94a3b8' }}>
                      {r.categoria}
                    </span>
                    {r.frecuencia !== 'mensual' && (
                      <span className="text-[10px] text-gray-400 font-medium">Inicio: {getMonthName(r.mesInicio || 0)}</span>
                    )}
                  </div>
                  <p className={`font-bold text-2xl ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(r.cantidad)}
                  </p>
               </div>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <Modal>
          <Card className="max-w-lg w-full shadow-2xl border-none p-0 overflow-hidden bg-white">
             <div className="bg-gray-800 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                <button onClick={() => setIsFormOpen(false)} className="text-white/60 hover:text-white transition-colors"><X size={24} /></button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <Input label="Descripción del Pago" placeholder="Ej: Netflix, Alquiler..." value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />

                <div className="grid grid-cols-2 gap-4">
                  <Select label="Tipo" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></Select>
                  <Select label="Frecuencia" value={formData.frecuencia} onChange={e => setFormData({...formData, frecuencia: e.target.value as any})}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Importe (€)" type="number" step="0.01" value={formData.cantidad || ''} onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} required />
                  <Input label="Día del mes" type="number" min="1" max="31" value={formData.diaMes || ''} onChange={e => setFormData({...formData, diaMes: Number(e.target.value)})} required />
                </div>

                {formData.frecuencia !== 'mensual' && (
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Select label="Mes de inicio del ciclo" value={formData.mesInicio} onChange={e => setFormData({...formData, mesInicio: Number(e.target.value)})}>
                      {Array.from({length: 12}).map((_, i) => (<option key={i} value={i}>{getMonthName(i)}</option>))}
                    </Select>
                  </div>
                )}

                <Select label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </Select>

                <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl border">
                   <input type="checkbox" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 rounded text-blue-600" id="activo" />
                   <label htmlFor="activo" className="text-sm font-medium text-gray-700 cursor-pointer">Sugerir mensualmente en movimientos</label>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                   <Button variant="secondary" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                   <Button type="submit" className="flex-1">Guardar</Button>
                </div>
             </form>
          </Card>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && onDelete(deleteId)} title="Eliminar Plantilla" message="¿Estás seguro de borrar esta regla?" />
    </div>
  );
};

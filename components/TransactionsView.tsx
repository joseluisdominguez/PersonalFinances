
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Filter, ChevronLeft, ChevronRight, List, Layers, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown, Info, Edit2, X, Save, BarChart3, CalendarClock, Zap, CalendarRange, Repeat, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, TransactionType, CategoryItem, RecurringTransaction } from '../types';
import { Button, Card, Input, Select, ConfirmDialog, TextArea } from './ui';
import { formatCurrency, formatDate, generateId, getMonthName } from '../utils';

interface Props {
  data: Transaction[];
  recurrentes: RecurringTransaction[];
  categories: CategoryItem[];
  onSave: (t: Transaction | Transaction[]) => void;
  onDelete: (id: string) => void;
}

interface SortConfig {
  key: keyof Transaction;
  direction: 'asc' | 'desc' | null;
}

interface DisplayTransaction extends Transaction {
  cantidadAMostrar: number;
  esProrrateado: boolean;
  diasEnMes?: number;
  diasTotales?: number;
}

export const TransactionsView: React.FC<Props> = ({ data, recurrentes, categories, onSave, onDelete }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'chart'>('list');
  const [isAmortizedMode, setIsAmortizedMode] = useState(false);
  const [showDevengoFields, setShowDevengoFields] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories.map(c => c.name));
  
  const [listSortConfig, setListSortConfig] = useState<SortConfig>({
    key: 'fecha',
    direction: 'desc'
  });

  const [groupSortConfigs, setGroupSortConfigs] = useState<Record<string, SortConfig>>({});
  
  const sortedCategories = useMemo(() => 
    [...categories].sort((a, b) => a.name.localeCompare(b.name)),
  [categories]);

  const initialFormState = {
    tipo: 'gasto' as TransactionType,
    categoria: sortedCategories.length > 0 ? sortedCategories[0].name : 'Otros',
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    cantidad: 0,
    notas: '',
    fechaInicioDevengo: '',
    fechaFinDevengo: ''
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialFormState);

  const getCategoryColor = (catName: string): string => {
    const found = categories.find(c => c.name === catName);
    return found ? found.color : '#6B7280';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.cantidad) return;
    
    onSave({
      id: editingId || generateId(),
      fecha: formData.fecha!,
      nombre: formData.nombre,
      tipo: formData.tipo as TransactionType,
      categoria: formData.categoria!,
      cantidad: Number(formData.cantidad),
      notas: formData.notas,
      fechaInicioDevengo: showDevengoFields ? formData.fechaInicioDevengo : undefined,
      fechaFinDevengo: showDevengoFields ? formData.fechaFinDevengo : undefined
    } as Transaction);

    setFormData(prev => ({ ...prev, nombre: '', cantidad: 0, notas: '' }));
    setEditingId(null);
    setShowDevengoFields(false);
  };

  const handleApplyRecurring = (recs: RecurringTransaction[]) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    
    const newTransactions: Transaction[] = recs.map(r => ({
      id: generateId(),
      nombre: r.nombre,
      tipo: r.tipo,
      categoria: r.categoria,
      cantidad: r.cantidad,
      fecha: `${year}-${month}-${String(r.diaMes).padStart(2, '0')}`,
      notas: 'Movimiento recurrente importado'
    }));

    onSave(newTransactions);
  };

  const pendingRecurring = useMemo(() => {
    const vMonth = viewDate.getMonth();
    const vYear = viewDate.getFullYear();
    
    return recurrentes.filter(r => {
      if (!r.activo) return false;
      
      const startMonth = r.mesInicio || 0;
      const monthDiff = vMonth - startMonth;
      
      if (r.frecuencia === 'trimestral' && (monthDiff % 3 !== 0)) return false;
      if (r.frecuencia === 'semestral' && (monthDiff % 6 !== 0)) return false;
      if (r.frecuencia === 'anual' && (vMonth !== startMonth)) return false;

      const alreadyExists = data.some(t => {
        const tDate = new Date(t.fecha);
        return tDate.getMonth() === vMonth && 
               tDate.getFullYear() === vYear && 
               t.nombre.toLowerCase().includes(r.nombre.toLowerCase()) &&
               Math.abs(t.cantidad - r.cantidad) < 1.0;
      });

      return !alreadyExists;
    });
  }, [recurrentes, data, viewDate]);

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      tipo: t.tipo,
      categoria: t.categoria,
      fecha: t.fecha,
      nombre: t.nombre,
      cantidad: t.cantidad,
      notas: t.notas || '',
      fechaInicioDevengo: t.fechaInicioDevengo || '',
      fechaFinDevengo: t.fechaFinDevengo || ''
    });
    setShowDevengoFields(!!t.fechaInicioDevengo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowDevengoFields(false);
  };

  const handleSort = (key: keyof Transaction, category?: string) => {
    const cycleSort = (current: SortConfig | undefined): SortConfig => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: null };
      return { key, direction: 'asc' };
    };

    if (viewMode === 'list') {
      setListSortConfig(current => cycleSort(current));
    } else if (category) {
      setGroupSortConfigs(prev => ({
        ...prev,
        [category]: cycleSort(prev[category])
      }));
    }
  };

  const getSortValue = (t: DisplayTransaction, key: keyof Transaction) => {
    if (key === 'cantidad') {
      return t.tipo === 'ingreso' ? t.cantidadAMostrar : -t.cantidadAMostrar;
    }
    return t[key];
  };

  const getDaysBetween = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const displayData = useMemo(() => {
    const vYear = viewDate.getFullYear();
    const vMonth = viewDate.getMonth();
    const monthStart = new Date(vYear, vMonth, 1);
    const monthEnd = new Date(vYear, vMonth + 1, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(0, 0, 0, 0);

    const results: DisplayTransaction[] = [];

    data.forEach(t => {
      const typeMatch = filterType === 'all' || t.tipo === filterType;
      if (!typeMatch) return;

      if (isAmortizedMode && t.fechaInicioDevengo && t.fechaFinDevengo) {
        const start = new Date(t.fechaInicioDevengo);
        const end = new Date(t.fechaFinDevengo);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const intersectionStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
        const intersectionEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));

        if (intersectionStart <= intersectionEnd) {
          const totalDaysInRange = getDaysBetween(t.fechaInicioDevengo, t.fechaFinDevengo);
          const daysInThisMonth = Math.round((intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const dailyRate = t.cantidad / totalDaysInRange;
          results.push({ ...t, cantidadAMostrar: dailyRate * daysInThisMonth, esProrrateado: true, diasEnMes: daysInThisMonth, diasTotales: totalDaysInRange });
        }
      } else {
        const tDate = new Date(t.fecha);
        if (tDate.getMonth() === vMonth && tDate.getFullYear() === vYear) {
          results.push({ ...t, cantidadAMostrar: t.cantidad, esProrrateado: false });
        }
      }
    });
    return results;
  }, [data, viewDate, filterType, isAmortizedMode]);

  const listData = useMemo(() => {
    const sorted = [...displayData];
    const effectiveConfig = listSortConfig.direction ? listSortConfig : { key: 'fecha' as any, direction: 'desc' as any };
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, effectiveConfig.key);
      const bValue = getSortValue(b, effectiveConfig.key);
      if (aValue < bValue) return effectiveConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return effectiveConfig.direction === 'asc' ? 1 : -1;
      return b.id.localeCompare(a.id);
    });
    return sorted;
  }, [displayData, listSortConfig]);

  const groupedData = useMemo(() => {
    const groups: Record<string, DisplayTransaction[]> = {};
    displayData.forEach(t => {
      if (!groups[t.categoria]) groups[t.categoria] = [];
      groups[t.categoria].push(t);
    });
    return groups;
  }, [displayData]);

  const chartData = useMemo(() => {
    const expenseGroups: Record<string, number> = {};
    displayData.forEach(t => {
      if (t.tipo === 'gasto') {
        expenseGroups[t.categoria] = (expenseGroups[t.categoria] || 0) + t.cantidadAMostrar;
      }
    });
    return Object.entries(expenseGroups).map(([name, value]) => ({ name, value, color: getCategoryColor(name) })).sort((a, b) => b.value - a.value);
  }, [displayData, categories]);

  const summary = useMemo(() => {
    const income = displayData.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + t.cantidadAMostrar, 0);
    const expense = displayData.filter(t => t.tipo === 'gasto').reduce((acc, t) => acc + t.cantidadAMostrar, 0);
    return { income, expense, net: income - expense };
  }, [displayData]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const getSortedItems = (items: DisplayTransaction[], config: SortConfig) => {
    const activeConfig = config.direction ? config : { key: 'fecha' as any, direction: 'desc' as any };
    return [...items].sort((a, b) => {
      const aValue = getSortValue(a, activeConfig.key);
      const bValue = getSortValue(b, activeConfig.key);
      if (aValue < bValue) return activeConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return activeConfig.direction === 'asc' ? 1 : -1;
      return b.id.localeCompare(a.id);
    });
  };

  const TableHeader = ({ category }: { category?: string }) => {
    const activeConfig = viewMode === 'list' ? listSortConfig : (category ? (groupSortConfigs[category] || { key: 'fecha', direction: null }) : listSortConfig);
    const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof Transaction, align?: 'left'|'right' }) => (
      <th className={`p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={(e) => { e.stopPropagation(); handleSort(sortKey, category); }}>
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          {activeConfig.key === sortKey && activeConfig.direction && (activeConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
        </div>
      </th>
    );
    return (
      <thead className="bg-gray-50 border-b hidden md:table-header-group">
        <tr>
          <Th label="Fecha Pago" sortKey="fecha" />
          <Th label="Descripción" sortKey="nombre" />
          <Th label="Categoría" sortKey="categoria" />
          <Th label="Importe" sortKey="cantidad" align="right" />
          <th className="p-4 w-24"></th>
        </tr>
      </thead>
    );
  };

  const renderItem = (t: DisplayTransaction) => (
    <React.Fragment key={`${t.id}-${t.esProrrateado}`}>
      <tr className={`hidden md:table-row hover:bg-gray-50 transition-colors border-b last:border-b-0 ${editingId === t.id ? 'bg-blue-50' : ''}`}>
        <td className="p-4 text-sm text-gray-600">{formatDate(t.fecha)}</td>
        <td className="p-4 font-medium text-gray-900">
           <div className="flex items-center gap-2">
             {t.nombre}
             {t.esProrrateado && <Zap size={12} className="text-blue-500 fill-blue-500" />}
           </div>
        </td>
        <td className="p-4">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: getCategoryColor(t.categoria) }}>{t.categoria}</span>
        </td>
        <td className={`p-4 text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
          {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.cantidadAMostrar)}
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg"><Edit2 size={18} /></button>
            <button onClick={() => setDeleteId(t.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={18} /></button>
          </div>
        </td>
      </tr>
      <div className={`md:hidden p-4 border-b space-y-3 ${editingId === t.id ? 'bg-blue-50' : 'bg-white'}`}>
         <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">{formatDate(t.fecha)}</span>
              <span className="font-bold text-gray-900">{t.nombre}</span>
            </div>
            <div className={`text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
              {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.cantidadAMostrar)}
            </div>
         </div>
         <div className="flex justify-between items-center">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: getCategoryColor(t.categoria) }}>{t.categoria}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
              <button onClick={() => setDeleteId(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
         </div>
      </div>
    </React.Fragment>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 self-start md:self-auto">Movimientos</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-white rounded-xl shadow-sm border p-1 w-full sm:w-auto">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
            <span className="px-6 font-bold min-w-[160px] text-center">{getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
          </div>
          <button onClick={() => setIsAmortizedMode(!isAmortizedMode)} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 transition-all text-sm font-bold w-full sm:w-auto ${isAmortizedMode ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200'}`}>
            <Zap size={16} /> Prorrateo Diario
          </button>
        </div>
      </div>

      {pendingRecurring.length > 0 && (
        <Card className="bg-blue-600 text-white border-none shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 p-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl"><Repeat size={28} className="text-white" /></div>
              <div>
                 <h4 className="font-bold text-xl">Movimientos Habituales</h4>
                 <p className="text-blue-100 text-sm">Hay {pendingRecurring.length} plantillas sugeridas para este mes.</p>
              </div>
           </div>
           <button onClick={() => handleApplyRecurring(pendingRecurring)} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm shadow-lg w-full md:w-auto">
              <CheckCircle2 size={18} className="inline mr-2" /> Importar Sugerencias
           </button>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-green-500"><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block mb-2">Ingresos</span><p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.income)}</p></Card>
        <Card className="border-t-4 border-t-red-500"><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block mb-2">Gastos</span><p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.expense)}</p></Card>
        <Card className={`border-t-4 ${summary.net >= 0 ? 'border-t-blue-500' : 'border-t-orange-500'}`}><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block mb-2">Balance</span><p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(summary.net)}</p></Card>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 order-2 lg:order-1">
          <Card className={`sticky top-24 shadow-xl border-2 ${editingId ? 'border-blue-500' : 'border-gray-50'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              {editingId && <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></Select>
                <Input label="Fecha" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <Input label="Descripción" placeholder="Ej: Compra Mercadona" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>{sortedCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</Select>
                <Input label="Importe (€)" type="number" step="0.01" value={formData.cantidad === 0 ? '' : formData.cantidad} onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} required />
              </div>
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <button type="button" onClick={() => setShowDevengoFields(!showDevengoFields)} className="flex items-center justify-between w-full group">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Activar Devengo</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showDevengoFields ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${showDevengoFields ? 'left-5.5' : 'left-0.5'}`}></div>
                  </div>
                </button>
                {showDevengoFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 pt-2 border-t border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Input label="Inicio Servicio" type="date" value={formData.fechaInicioDevengo} onChange={e => setFormData({...formData, fechaInicioDevengo: e.target.value})} required={showDevengoFields} />
                    <Input label="Fin Servicio" type="date" value={formData.fechaFinDevengo} onChange={e => setFormData({...formData, fechaFinDevengo: e.target.value})} required={showDevengoFields} />
                  </div>
                )}
              </div>
              <TextArea label="Notas" placeholder="Detalles..." value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} />
              <div className="flex gap-2 pt-2">
                {editingId && <Button variant="secondary" onClick={cancelEdit} className="flex-1">Cancelar</Button>}
                <Button type="submit" className="flex-1 shadow-blue-100">{editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
          <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-2 rounded-2xl border shadow-sm">
            <div className="flex gap-1 overflow-x-auto no-scrollbar"><button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>Todos</button><button onClick={() => setFilterType('ingreso')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'ingreso' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>Ingresos</button><button onClick={() => setFilterType('gasto')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'gasto' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>Gastos</button></div>
            <div className="flex gap-2"><button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><List size={20} /></button><button onClick={() => setViewMode('grouped')} className={`p-2 rounded-lg ${viewMode === 'grouped' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Layers size={20} /></button><button onClick={() => setViewMode('chart')} className={`p-2 rounded-lg ${viewMode === 'chart' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><BarChart3 size={20} /></button></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden min-h-[400px]">
             {displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4"><div className="bg-gray-50 p-6 rounded-full text-gray-200"><CalendarRange size={48} /></div><p className="text-gray-500">Sin movimientos este mes</p></div>
             ) : viewMode === 'list' ? (
              <div className="overflow-x-auto"><table className="w-full text-left"><TableHeader /><tbody className="divide-y block md:table-row-group">{listData.map(renderItem)}</tbody></table></div>
             ) : viewMode === 'grouped' ? (
               <div className="p-4 space-y-4">
                 {(Object.entries(groupedData) as [string, DisplayTransaction[]][]).sort((a,b) => a[0].localeCompare(b[0])).map(([category, items]) => {
                   const subtotal = items.reduce((acc, curr) => curr.tipo === 'ingreso' ? acc + curr.cantidadAMostrar : acc - curr.cantidadAMostrar, 0);
                   return (
                     <div key={category} className="border rounded-xl overflow-hidden">
                       <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors bg-gray-50/50">
                         <div className="flex items-center gap-2 font-bold text-gray-700">{expandedCategories.includes(category) ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {category}</div>
                         <div className={`font-bold ${subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(subtotal)}</div>
                       </button>
                       {expandedCategories.includes(category) && (<div className="overflow-x-auto"><table className="w-full text-left"><TableHeader category={category} /><tbody className="divide-y block md:table-row-group">{getSortedItems(items, groupSortConfigs[category] || {key: 'fecha', direction: 'desc'}).map(renderItem)}</tbody></table></div>)}
                     </div>
                   );
                 })}
               </div>
             ) : (
                <div className="p-8"><div className="w-full h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={chartData}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} /><Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => [formatCurrency(value), 'Importe']} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div></div>
             )}
          </div>
        </div>
      </div>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && onDelete(deleteId)} title="Eliminar Movimiento" message="Esta acción es definitiva." />
    </div>
  );
};

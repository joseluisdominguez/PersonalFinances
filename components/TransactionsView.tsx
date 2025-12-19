
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, ChevronLeft, ChevronRight, List, Layers, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown, Info, Edit2, X, Save, BarChart3, CalendarClock, Zap, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button, Card, Input, Select, ConfirmDialog, TextArea } from './ui';
import { formatCurrency, formatDate, generateId, getMonthName } from '../utils';

interface Props {
  data: Transaction[];
  categories: CategoryItem[];
  onSave: (t: Transaction) => void;
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

export const TransactionsView: React.FC<Props> = ({ data, categories, onSave, onDelete }) => {
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

  // Helper: Diferencia de días inclusiva
  const getDaysBetween = (start: Date, end: Date) => {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const displayData = useMemo(() => {
    const vYear = viewDate.getFullYear();
    const vMonth = viewDate.getMonth();
    
    // Rango del mes visualizado
    const monthStart = new Date(vYear, vMonth, 1);
    const monthEnd = new Date(vYear, vMonth + 1, 0);

    const results: DisplayTransaction[] = [];

    data.forEach(t => {
      const typeMatch = filterType === 'all' || t.tipo === filterType;
      if (!typeMatch) return;

      if (isAmortizedMode && t.fechaInicioDevengo && t.fechaFinDevengo) {
        const start = new Date(t.fechaInicioDevengo);
        const end = new Date(t.fechaFinDevengo);

        // Intersección entre el periodo de devengo y el mes actual
        const intersectionStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
        const intersectionEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));

        if (intersectionStart <= intersectionEnd) {
          const totalDaysInRange = getDaysBetween(start, end);
          const daysInThisMonth = getDaysBetween(intersectionStart, intersectionEnd);
          const dailyRate = t.cantidad / totalDaysInRange;
          
          results.push({
            ...t,
            cantidadAMostrar: dailyRate * daysInThisMonth,
            esProrrateado: true,
            diasEnMes: daysInThisMonth,
            diasTotales: totalDaysInRange
          });
        }
      } else {
        const tDate = new Date(t.fecha);
        if (tDate.getMonth() === vMonth && tDate.getFullYear() === vYear) {
          results.push({
            ...t,
            cantidadAMostrar: t.cantidad,
            esProrrateado: false
          });
        }
      }
    });

    return results;
  }, [data, viewDate, filterType, isAmortizedMode]);

  const listData = useMemo(() => {
    if (!listSortConfig.direction) return [...displayData].reverse();
    const sorted = [...displayData];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, listSortConfig.key);
      const bValue = getSortValue(b, listSortConfig.key);
      if (aValue < bValue) return listSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return listSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
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
    return Object.entries(expenseGroups)
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }))
      .sort((a, b) => b.value - a.value);
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
    if (!config.direction) return items;
    return [...items].sort((a, b) => {
      const aValue = getSortValue(a, config.key);
      const bValue = getSortValue(b, config.key);
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const TableHeader = ({ category }: { category?: string }) => {
    const activeConfig = viewMode === 'list' ? listSortConfig : (category ? (groupSortConfigs[category] || { key: 'fecha', direction: null }) : listSortConfig);
    const renderSortIcon = (key: keyof Transaction) => {
      if (activeConfig.key !== key || activeConfig.direction === null) return <ArrowUpDown size={14} className="text-gray-300" />;
      return activeConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
    };
    const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof Transaction, align?: 'left'|'right' }) => (
      <th className={`p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={(e) => { e.stopPropagation(); handleSort(sortKey, category); }}>
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          {renderSortIcon(sortKey)}
        </div>
      </th>
    );
    return (
      <thead className="bg-gray-50 border-b">
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

  const renderRow = (t: DisplayTransaction) => (
    <tr key={`${t.id}-${t.esProrrateado}`} className={`hover:bg-gray-50 transition-colors border-b last:border-b-0 ${editingId === t.id ? 'bg-blue-50' : ''}`}>
      <td className="p-4 text-sm text-gray-600">
        <div className="flex flex-col">
          {formatDate(t.fecha)}
          {t.fechaInicioDevengo && (
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter flex items-center gap-0.5 mt-1" title="Periodo total de devengo">
              <CalendarRange size={10} /> {getDaysBetween(new Date(t.fechaInicioDevengo), new Date(t.fechaFinDevengo!))} días
            </span>
          )}
        </div>
      </td>
      <td className="p-4 font-medium text-gray-900">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="flex items-center gap-2">
              {t.nombre}
              {t.esProrrateado && <Zap size={12} className="text-blue-500 fill-blue-500" title="Cálculo proporcional por días" />}
            </span>
            {t.fechaInicioDevengo && (
              <span className="text-[10px] text-gray-400 font-normal">
                {formatDate(t.fechaInicioDevengo)} al {formatDate(t.fechaFinDevengo!)}
              </span>
            )}
          </div>
          {t.notas && (
            <div className="group relative">
              <Info size={16} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded z-10 shadow-lg pointer-events-none text-center">
                {t.notas}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="p-4">
        <span className="px-2 py-1 rounded-full text-xs font-bold shadow-sm border border-black/5" style={{ backgroundColor: getCategoryColor(t.categoria), color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.2)' }}>
          {t.categoria}
        </span>
      </td>
      <td className={`p-4 text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
        <div className="flex flex-col items-end">
          <span>{t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.cantidadAMostrar)}</span>
          {t.esProrrateado && (
            <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">
              {t.diasEnMes}/{t.diasTotales} días
            </span>
          )}
        </div>
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Editar original"><Edit2 size={18} /></button>
          <button onClick={() => setDeleteId(t.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Eliminar original"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Movimientos</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-lg shadow-sm border p-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-md transition-colors"><ChevronLeft size={20} /></button>
            <span className="px-4 font-semibold min-w-[150px] text-center">{getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-md transition-colors"><ChevronRight size={20} /></button>
          </div>
          <button onClick={() => setIsAmortizedMode(!isAmortizedMode)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-bold ${isAmortizedMode ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`} title="Reparte los gastos proporcionalmente por los días que cubren">
            <Zap size={16} className={isAmortizedMode ? 'fill-white' : ''} />
            <span className="hidden sm:inline">Prorrateo Diario</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border-l-4 border-l-green-500 transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Ingresos {isAmortizedMode ? '(Prorr.)' : '(Real)'}</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.income)}</p>
        </Card>
        <Card className={`border-l-4 border-l-red-500 transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gastos {isAmortizedMode ? '(Prorr.)' : '(Real)'}</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.expense)}</p>
        </Card>
        <Card className={`border-l-4 ${summary.net >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'} transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Balance {isAmortizedMode ? '(Prorr.)' : '(Real)'}</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(summary.net)}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className={editingId ? 'ring-2 ring-blue-500' : ''}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              {editingId && <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Tipo" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                </Select>
                <Input label="Fecha Pago" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <Input label="Descripción" placeholder="Ej: Factura de Agua" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                  {sortedCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </Select>
                <Input label="Cantidad (€)" type="number" step="0.01" value={formData.cantidad === 0 ? '' : formData.cantidad} onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} required />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                <button type="button" onClick={() => setShowDevengoFields(!showDevengoFields)} className="flex items-center justify-between w-full group">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Activar Devengo Temporal</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showDevengoFields ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showDevengoFields ? 'left-5.5' : 'left-0.5'}`}></div>
                  </div>
                </button>
                {showDevengoFields && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100 animate-in fade-in slide-in-from-top-1">
                    <Input label="Inicio Servicio" type="date" value={formData.fechaInicioDevengo} onChange={e => setFormData({...formData, fechaInicioDevengo: e.target.value})} required={showDevengoFields} />
                    <Input label="Fin Servicio" type="date" value={formData.fechaFinDevengo} onChange={e => setFormData({...formData, fechaFinDevengo: e.target.value})} required={showDevengoFields} />
                  </div>
                )}
                <p className="text-[10px] text-blue-600 italic">Reparte el gasto entre los días del periodo para un balance real.</p>
              </div>
              <TextArea label="Notas" placeholder="Detalles..." value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} />
              <div className="flex gap-2">
                {editingId && <Button variant="secondary" onClick={cancelEdit} className="flex-1">Cancelar</Button>}
                <Button type="submit" className="flex-1">{editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Todos</button>
              <button onClick={() => setFilterType('ingreso')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'ingreso' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-green-600'}`}>Ingresos</button>
              <button onClick={() => setFilterType('gasto')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-red-600'}`}>Gastos</button>
            </div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><List size={18} /><span className="hidden sm:inline text-sm">Lista</span></button>
              <button onClick={() => setViewMode('grouped')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Layers size={18} /><span className="hidden sm:inline text-sm">Agrupado</span></button>
              <button onClick={() => setViewMode('chart')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'chart' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}><BarChart3 size={18} /><span className="hidden sm:inline text-sm">Gráficos</span></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
             {displayData.length === 0 ? (
                <div className="p-12 text-center text-gray-400">No hay movimientos registrados para mostrar en este mes</div>
             ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                {isAmortizedMode && <div className="bg-blue-50 p-3 text-xs text-blue-700 font-medium flex items-center gap-2 border-b border-blue-100"><Info size={14} /> Los importes mostrados son proporcionales a los días que el servicio ocupa en este mes.</div>}
                <table className="w-full text-left">
                  <TableHeader />
                  <tbody className="divide-y">{listData.map(renderRow)}</tbody>
                </table>
              </div>
             ) : viewMode === 'grouped' ? (
               <div className="p-4 space-y-4 bg-gray-50">
                 {(Object.entries(groupedData) as [string, DisplayTransaction[]][]).sort((a,b) => a[0].localeCompare(b[0])).map(([category, items]) => {
                   const isExpanded = expandedCategories.includes(category);
                   const subtotal = items.reduce((acc, curr) => curr.tipo === 'ingreso' ? acc + curr.cantidadAMostrar : acc - curr.cantidadAMostrar, 0);
                   const catColor = getCategoryColor(category);
                   return (
                     <div key={category} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                       <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                         <div className="flex items-center gap-3">
                            <span className="p-1 bg-white border rounded-md shadow-sm">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }}></div>
                            <span className="font-bold text-gray-800">{category}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-500">{items.length}</span>
                         </div>
                         <div className={`font-bold ${subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(subtotal)}</div>
                       </button>
                       {isExpanded && (
                         <div className="border-t overflow-x-auto">
                            <table className="w-full text-left">
                             <TableHeader category={category} />
                             <tbody className="divide-y">{getSortedItems(items, groupSortConfigs[category] || {key: 'fecha', direction: null}).map(renderRow)}</tbody>
                           </table>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             ) : (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-700">Distribución de Gastos</h3>
                    {isAmortizedMode && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><Zap size={10} className="inline mr-1" /> Cálculo por Días</span>}
                  </div>
                  <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={chartData} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
             )}
          </div>
        </div>
      </div>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && onDelete(deleteId)} title="Eliminar Movimiento" message="¿Estás seguro de que quieres eliminar este movimiento? Se perderá el registro original del sistema." />
    </div>
  );
};

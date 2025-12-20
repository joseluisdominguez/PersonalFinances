
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
  
  // Ordenación por defecto: Fecha DESC, y secundariamente ID DESC (creación)
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
    const sorted = [...displayData];
    
    // Si no hay ordenación explícita activa, ordenamos por ID desc (orden de creación)
    const effectiveConfig = listSortConfig.direction ? listSortConfig : { key: 'id' as any, direction: 'desc' as any };

    sorted.sort((a, b) => {
      const aValue = getSortValue(a, effectiveConfig.key);
      const bValue = getSortValue(b, effectiveConfig.key);
      
      if (aValue < bValue) return effectiveConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return effectiveConfig.direction === 'asc' ? 1 : -1;
      
      // Si el valor principal es igual, usamos el ID descendente como orden de creación secundario
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
    const activeConfig = config.direction ? config : { key: 'id' as any, direction: 'desc' as any };
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

  // Render para cada fila en móvil (Card) y escritorio (Table Row)
  const renderItem = (t: DisplayTransaction) => {
    return (
      <React.Fragment key={`${t.id}-${t.esProrrateado}`}>
        {/* Vista Escritorio */}
        <tr className={`hidden md:table-row hover:bg-gray-50 transition-colors border-b last:border-b-0 ${editingId === t.id ? 'bg-blue-50' : ''}`}>
          <td className="p-4 text-sm text-gray-600">
            <div className="flex flex-col">
              {formatDate(t.fecha)}
              {t.fechaInicioDevengo && (
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter flex items-center gap-0.5 mt-1" title="Periodo total">
                  <CalendarRange size={10} /> {getDaysBetween(t.fechaInicioDevengo, t.fechaFinDevengo!)} d.
                </span>
              )}
            </div>
          </td>
          <td className="p-4 font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  {t.nombre}
                  {t.esProrrateado && <Zap size={12} className="text-blue-500 fill-blue-500" />}
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
              <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="Editar"><Edit2 size={18} /></button>
              <button onClick={() => setDeleteId(t.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Eliminar"><Trash2 size={18} /></button>
            </div>
          </td>
        </tr>

        {/* Vista Móvil */}
        <div className={`md:hidden p-4 border-b space-y-3 ${editingId === t.id ? 'bg-blue-50' : 'bg-white'}`}>
           <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatDate(t.fecha)}</span>
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  {t.nombre}
                  {t.esProrrateado && <Zap size={12} className="text-blue-500 fill-blue-500" />}
                </span>
              </div>
              <div className={`text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.cantidadAMostrar)}
                {t.esProrrateado && (
                  <div className="text-[10px] text-blue-500 font-bold uppercase">
                    {t.diasEnMes}/{t.diasTotales} días
                  </div>
                )}
              </div>
           </div>

           <div className="flex justify-between items-center">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: getCategoryColor(t.categoria) }}>
                {t.categoria}
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => handleEdit(t)} className="text-gray-500 hover:text-blue-500 flex items-center gap-1 text-xs font-semibold">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => setDeleteId(t.id)} className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-xs font-semibold">
                  <Trash2 size={14} /> Borrar
                </button>
              </div>
           </div>
           
           {t.fechaInicioDevengo && (
             <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 font-medium">
               Devengo: {formatDate(t.fechaInicioDevengo)} al {formatDate(t.fechaFinDevengo!)}
             </div>
           )}
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 self-start md:self-auto">Movimientos</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-white rounded-xl shadow-sm border p-1 w-full sm:w-auto">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 sm:flex-none flex justify-center"><ChevronLeft size={20} /></button>
            <span className="px-4 font-bold min-w-[140px] text-center text-sm md:text-base">{getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 sm:flex-none flex justify-center"><ChevronRight size={20} /></button>
          </div>
          <button 
            onClick={() => setIsAmortizedMode(!isAmortizedMode)} 
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-bold w-full sm:w-auto shadow-sm ${isAmortizedMode ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
          >
            <Zap size={16} className={isAmortizedMode ? 'fill-white' : ''} />
            <span>Prorrateo Diario</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className={`border-l-4 border-l-green-500 p-4 md:p-6 transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Ingresos</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(summary.income)}</p>
        </Card>
        <Card className={`border-l-4 border-l-red-500 p-4 md:p-6 transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Gastos</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(summary.expense)}</p>
        </Card>
        <Card className={`border-l-4 ${summary.net >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'} p-4 md:p-6 transition-all ${isAmortizedMode ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Balance</span>
            {isAmortizedMode && <Zap size={14} className="text-blue-500" />}
          </div>
          <p className={`text-lg md:text-2xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(summary.net)}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* Form Column */}
        <div className="lg:col-span-4">
          <Card className={`sticky top-20 shadow-md ${editingId ? 'ring-2 ring-blue-500' : 'border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              {editingId && <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <Select label="Tipo" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                </Select>
                <Input label="Fecha Pago" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <Input label="Descripción" placeholder="Ej: Factura de Agua" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <Select label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                  {sortedCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </Select>
                <Input label="Cantidad (€)" type="number" step="0.01" value={formData.cantidad === 0 ? '' : formData.cantidad} onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} required />
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
                <p className="text-[10px] text-blue-600 italic">Reparte el importe proporcionalmente por los días que cubre el servicio.</p>
              </div>
              <TextArea label="Notas" placeholder="Detalles..." value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} />
              <div className="flex gap-2 pt-2">
                {editingId && <Button variant="secondary" onClick={cancelEdit} className="flex-1">Cancelar</Button>}
                <Button type="submit" className="flex-1 shadow-blue-100">{editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* List Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 rounded-xl border shadow-sm">
            <div className="flex gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setFilterType('all')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${filterType === 'all' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Todos</button>
              <button onClick={() => setFilterType('ingreso')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${filterType === 'ingreso' ? 'bg-green-600 text-white shadow-md shadow-green-100' : 'text-gray-500 hover:text-green-600'}`}>Ingresos</button>
              <button onClick={() => setFilterType('gasto')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${filterType === 'gasto' ? 'bg-red-600 text-white shadow-md shadow-red-100' : 'text-gray-500 hover:text-red-600'}`}>Gastos</button>
            </div>
            <div className="flex gap-1 w-full sm:w-auto">
              <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none p-2 rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`} title="Vista de Lista"><List size={18} /><span className="sm:hidden lg:inline text-xs font-bold">Lista</span></button>
              <button onClick={() => setViewMode('grouped')} className={`flex-1 sm:flex-none p-2 rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'grouped' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`} title="Vista Agrupada"><Layers size={18} /><span className="sm:hidden lg:inline text-xs font-bold">Agrupado</span></button>
              <button onClick={() => setViewMode('chart')} className={`flex-1 sm:flex-none p-2 rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'chart' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`} title="Ver Gráficos"><BarChart3 size={18} /><span className="sm:hidden lg:inline text-xs font-bold">Analítica</span></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
             {displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                   <div className="bg-gray-50 p-4 rounded-full text-gray-300"><CalendarRange size={48} /></div>
                   <p className="text-gray-400 font-medium">No hay movimientos para este mes</p>
                </div>
             ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <TableHeader />
                  <tbody className="divide-y block md:table-row-group">{listData.map(renderItem)}</tbody>
                </table>
              </div>
             ) : viewMode === 'grouped' ? (
               <div className="p-3 md:p-4 space-y-4 bg-gray-50/50">
                 {(Object.entries(groupedData) as [string, DisplayTransaction[]][]).sort((a,b) => a[0].localeCompare(b[0])).map(([category, items]) => {
                   const isExpanded = expandedCategories.includes(category);
                   const subtotal = items.reduce((acc, curr) => curr.tipo === 'ingreso' ? acc + curr.cantidadAMostrar : acc - curr.cantidadAMostrar, 0);
                   const catColor = getCategoryColor(category);
                   return (
                     <div key={category} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                       <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                         <div className="flex items-center gap-3">
                            <span className="p-1.5 bg-gray-50 border border-gray-100 rounded-lg shadow-sm">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: catColor }}></div>
                            <span className="font-bold text-gray-800 text-sm md:text-base">{category}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-bold">{items.length}</span>
                         </div>
                         <div className={`font-bold text-sm md:text-base ${subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(subtotal)}</div>
                       </button>
                       {isExpanded && (
                         <div className="border-t border-gray-50 overflow-x-auto">
                            <table className="w-full text-left">
                             <TableHeader category={category} />
                             <tbody className="divide-y block md:table-row-group">{getSortedItems(items, groupSortConfigs[category] || {key: 'fecha', direction: null}).map(renderItem)}</tbody>
                           </table>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             ) : (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Gastos por Categoría</h3>
                      <p className="text-xs text-gray-400 font-medium">Basado en los movimientos del mes</p>
                    </div>
                    {isAmortizedMode && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 flex items-center gap-1"><Zap size={10} /> Cálculo por Días</span>}
                  </div>
                  <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={chartData} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F9FAFB" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 600}} />
                        <Tooltip cursor={{fill: '#F9FAFB'}} formatter={(value: number) => [formatCurrency(value), 'Importe']} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
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

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && onDelete(deleteId)} title="Eliminar Movimiento" message="¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer." />
    </div>
  );
};

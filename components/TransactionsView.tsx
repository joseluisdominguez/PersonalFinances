
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, ChevronLeft, ChevronRight, List, Layers, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown, Info, Edit2, X, Save, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, TransactionType, CategoryItem } from '../types';
import { Button, Card, Input, Select, ConfirmDialog } from './ui';
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

export const TransactionsView: React.FC<Props> = ({ data, categories, onSave, onDelete }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'chart'>('list');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories.map(c => c.name));
  
  // Sorting State
  const [listSortConfig, setListSortConfig] = useState<SortConfig>({
    key: 'fecha',
    direction: 'desc'
  });

  const [groupSortConfigs, setGroupSortConfigs] = useState<Record<string, SortConfig>>({});
  
  // Form State
  const initialFormState = {
    tipo: 'gasto' as TransactionType,
    categoria: categories.length > 0 ? categories[0].name : 'Otros',
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    cantidad: 0,
    notas: ''
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
      notas: formData.notas
    } as Transaction);

    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      tipo: t.tipo,
      categoria: t.categoria,
      fecha: t.fecha,
      nombre: t.nombre,
      cantidad: t.cantidad,
      notas: t.notas || ''
    });
    // Optional: Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSort = (key: keyof Transaction, category?: string) => {
    const cycleSort = (current: SortConfig | undefined): SortConfig => {
      // If clicking a new key, start with Asc
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      // Cycle: Asc -> Desc -> Null (Off) -> Asc
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

  const getSortValue = (t: Transaction, key: keyof Transaction) => {
    if (key === 'cantidad') {
      return t.tipo === 'ingreso' ? t.cantidad : -t.cantidad;
    }
    return t[key];
  };

  // 1. Base Filter
  const filteredTransactions = useMemo(() => {
    return data.filter(t => {
      const tDate = new Date(t.fecha);
      const sameMonth = tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
      const typeMatch = filterType === 'all' || t.tipo === filterType;
      return sameMonth && typeMatch;
    });
  }, [data, viewDate, filterType]);

  // 2. Sorted List Data
  const listData = useMemo(() => {
    if (!listSortConfig.direction) {
      // Return reversed array to show newest created (last added) first
      return [...filteredTransactions].reverse();
    }

    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, listSortConfig.key);
      const bValue = getSortValue(b, listSortConfig.key);
      if (aValue < bValue) return listSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return listSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTransactions, listSortConfig]);

  // 3. Grouped Data
  const groupedData = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.categoria]) groups[t.categoria] = [];
      groups[t.categoria].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // 4. Chart Data
  const chartData = useMemo(() => {
    const expenseGroups: Record<string, number> = {};
    
    filteredTransactions.forEach(t => {
      if (t.tipo === 'gasto') {
        expenseGroups[t.categoria] = (expenseGroups[t.categoria] || 0) + t.cantidad;
      }
    });

    return Object.entries(expenseGroups)
      .map(([name, value]) => ({
        name,
        value,
        color: getCategoryColor(name)
      }))
      .sort((a, b) => b.value - a.value); // Order by highest expense
  }, [filteredTransactions, categories]);

  const summary = useMemo(() => {
    const income = filteredTransactions.filter(t => t.tipo === 'ingreso').reduce((acc, curr) => acc + curr.cantidad, 0);
    const expense = filteredTransactions.filter(t => t.tipo === 'gasto').reduce((acc, curr) => acc + curr.cantidad, 0);
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const getSortedItems = (items: Transaction[], config: SortConfig) => {
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
    const activeConfig = viewMode === 'list' 
      ? listSortConfig 
      : (category ? (groupSortConfigs[category] || { key: 'fecha', direction: null }) : listSortConfig);

    const renderSortIcon = (key: keyof Transaction) => {
      if (activeConfig.key !== key || activeConfig.direction === null) {
        return <ArrowUpDown size={14} className="text-gray-300" />;
      }
      return activeConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-blue-600" /> 
        : <ArrowDown size={14} className="text-blue-600" />;
    };

    const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof Transaction, align?: 'left'|'right' }) => (
      <th 
        className={`p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
        onClick={(e) => {
          e.stopPropagation();
          handleSort(sortKey, category);
        }}
      >
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          {renderSortIcon(sortKey)}
        </div>
      </th>
    );

    return (
      <thead className="bg-gray-50 border-b">
        <tr>
          <Th label="Fecha" sortKey="fecha" />
          <Th label="Descripción" sortKey="nombre" />
          <Th label="Categoría" sortKey="categoria" />
          <Th label="Cantidad" sortKey="cantidad" align="right" />
          <th className="p-4 w-24"></th>
        </tr>
      </thead>
    );
  };

  const renderRow = (t: Transaction) => (
    <tr key={t.id} className={`hover:bg-gray-50 transition-colors border-b last:border-b-0 ${editingId === t.id ? 'bg-blue-50' : ''}`}>
      <td className="p-4 text-sm text-gray-600">{formatDate(t.fecha)}</td>
      <td className="p-4 font-medium text-gray-900">
        <div className="flex items-center gap-2">
          {t.nombre}
          {t.notas && (
            <div className="group relative">
              <Info size={16} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded z-10 shadow-lg pointer-events-none">
                {t.notas}
                {/* Little arrow for tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="p-4">
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold shadow-sm border border-black/5"
          style={{ 
            backgroundColor: getCategoryColor(t.categoria),
            color: '#FFFFFF',
            textShadow: '0 1px 1px rgba(0,0,0,0.2)'
          }}
        >
          {t.categoria}
        </span>
      </td>
      <td className={`p-4 text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
        {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.cantidad)}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleEdit(t)} 
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={() => setDeleteId(t.id)} 
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8">
      {/* Header & Date Nav */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Movimientos</h2>
        <div className="flex items-center bg-white rounded-lg shadow-sm border p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-md"><ChevronLeft size={20} /></button>
          <span className="px-4 font-semibold min-w-[150px] text-center">
            {getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-md"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><TrendingUp size={20} /></div>
            <span className="text-gray-500 font-medium">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.income)}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-full"><TrendingDown size={20} /></div>
            <span className="text-gray-500 font-medium">Gastos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.expense)}</p>
        </Card>
        <Card className={`border-l-4 ${summary.net >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Filter size={20} /></div>
            <span className="text-gray-500 font-medium">Balance Neto</span>
          </div>
          <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {formatCurrency(summary.net)}
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <Card className={editingId ? 'ring-2 ring-blue-500' : ''}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              {editingId && (
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Tipo" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                </Select>
                <Input label="Fecha" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <Input label="Descripción" placeholder="Ej: Compra Mercadona" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </Select>
                <Input 
                  label="Cantidad (€)" 
                  type="number" 
                  step="0.01" 
                  // If 0, show empty string to make typing easier
                  value={formData.cantidad === 0 ? '' : formData.cantidad} 
                  onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} 
                  required 
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea 
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900 placeholder-gray-400 min-h-[80px]"
                  placeholder="Detalles adicionales (opcional)..."
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                />
              </div>

              <div className="flex gap-2 mt-2">
                {editingId && (
                  <Button variant="secondary" onClick={cancelEdit} className="flex-1">
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  {editingId ? <Save size={18} /> : <Plus size={18} />} 
                  {editingId ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* List / Chart / Grouped Toggle */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Filter Buttons */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setFilterType('all')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('ingreso')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'ingreso' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-green-600'}`}
              >
                Ingresos
              </button>
              <button 
                onClick={() => setFilterType('gasto')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-red-600'}`}
              >
                Gastos
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
               <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                title="Vista Lista"
              >
                <List size={18} />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button 
                onClick={() => setViewMode('grouped')} 
                className={`p-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}
                title="Vista Agrupada"
              >
                <Layers size={18} />
                <span className="hidden sm:inline">Agrupado</span>
              </button>
              <button 
                onClick={() => setViewMode('chart')} 
                className={`p-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'chart' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}
                title="Vista Gráfica"
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">Gráficos</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
             {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No hay movimientos este mes</div>
             ) : viewMode === 'list' ? (
              /* LIST VIEW */
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <TableHeader />
                  <tbody className="divide-y">
                    {listData.map(renderRow)}
                  </tbody>
                </table>
              </div>
             ) : viewMode === 'grouped' ? (
               /* GROUPED VIEW */
               <div className="p-4 space-y-4 bg-gray-50 min-h-full">
                 {Object.entries(groupedData).map(([category, items]: [string, Transaction[]]) => {
                   const isExpanded = expandedCategories.includes(category);
                   const subtotal = items.reduce((acc, curr) => curr.tipo === 'ingreso' ? acc + curr.cantidad : acc - curr.cantidad, 0);
                   const catColor = getCategoryColor(category);

                   // Sort items for this specific category based on its local config
                   const categoryConfig = groupSortConfigs[category] || { key: 'fecha', direction: null };
                   const sortedItems = getSortedItems(items, categoryConfig);

                   return (
                     <div key={category} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                       <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                       >
                         <div className="flex items-center gap-3">
                            <span className="p-1 bg-white border rounded-md shadow-sm">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                            
                            {/* Category Colored Circle */}
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: catColor }}></div>
                            
                            <span className="font-bold text-gray-800">{category}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">{items.length}</span>
                         </div>
                         <div className={`font-bold ${subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                           {formatCurrency(subtotal)}
                         </div>
                       </button>
                       
                       {isExpanded && (
                         <div className="border-t overflow-x-auto">
                            <table className="w-full text-left">
                             <TableHeader category={category} />
                             <tbody className="divide-y">
                                {sortedItems.map(renderRow)}
                             </tbody>
                           </table>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             ) : (
                /* CHART VIEW */
                <div className="p-6 h-full flex flex-col items-center justify-center">
                  <h3 className="text-lg font-bold text-gray-700 mb-4 self-start">Distribución de Gastos por Categoría</h3>
                  {chartData.length > 0 ? (
                    <div className="w-full h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{fontSize: 12, fill: '#4B5563', fontWeight: 500}} 
                          />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            formatter={(value: number) => [formatCurrency(value), 'Gastado']}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <BarChart3 size={48} className="mb-2 opacity-20" />
                      <p>No hay gastos registrados para este mes.</p>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => deleteId && onDelete(deleteId)} 
        title="Eliminar Movimiento" 
        message="¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer." 
      />
    </div>
  );
};

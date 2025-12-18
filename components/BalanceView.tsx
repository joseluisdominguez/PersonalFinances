
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Save, Trash2, Wallet, CheckSquare, Square } from 'lucide-react';
import { Balance } from '../types';
import { Button, Card, Input, ConfirmDialog } from './ui';
import { formatCurrency, getMonthName } from '../utils';

interface Props {
  data: Balance[];
  banks: string[];
  onSave: (b: Balance) => void;
  onDelete: (id: string) => void;
}

export const BalanceView: React.FC<Props> = ({ data, banks, onSave, onDelete }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // Derive current month's existing balance or prepare fresh state
  const currentMonthId = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  
  const existingBalance = data.find(b => b.id === currentMonthId);
  
  // Initialize form state dynamically based on configured banks
  const [formState, setFormState] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    banks.forEach(bank => {
      initial[bank] = existingBalance?.cuentas[bank] || 0;
    });
    if (existingBalance) {
      Object.keys(existingBalance.cuentas).forEach(key => {
        if (!initial[key]) initial[key] = existingBalance.cuentas[key];
      });
    }
    return initial;
  });

  // Update form if viewDate changes or banks config changes
  React.useEffect(() => {
    const found = data.find(b => b.id === currentMonthId);
    const newState: Record<string, number> = {};
    
    banks.forEach(bank => {
      newState[bank] = found?.cuentas[bank] || 0;
    });
    
    if (found) {
       Object.entries(found.cuentas).forEach(([key, val]) => {
         if (newState[key] === undefined) newState[key] = val as number;
       });
    }

    setFormState(newState);
  }, [currentMonthId, data, banks]);

  // --- Filtering Logic ---
  const toggleBank = (bank: string) => {
    setSelectedBanks(prev => 
      prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
    );
  };

  // Determine which banks are active for calculation (All if none selected, otherwise only selected)
  const availableBanks = Object.keys(formState);
  const banksToSum = selectedBanks.length > 0 
    ? availableBanks.filter(b => selectedBanks.includes(b)) 
    : availableBanks;

  // 1. Calculate Real Total (for saving)
  const realTotalPatrimony = Object.values(formState).reduce((a: number, b) => a + Number(b), 0);

  // 2. Calculate Display Total (for UI/Chart based on filter)
  const displayTotalPatrimony = banksToSum.reduce((sum, bank) => sum + (Number(formState[bank]) || 0), 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: currentMonthId,
      mes: viewDate.getMonth() + 1,
      anio: viewDate.getFullYear(),
      cuentas: formState,
      total: realTotalPatrimony // Always save the real total
    });
  };

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(-12) // Last 12 months
      .map(b => {
        // Calculate total based on currently filtered banks
        // If filter is active, we try to find those specific banks in historical data
        // If no filter, we use the historical total
        let total = 0;
        if (selectedBanks.length > 0) {
          total = selectedBanks.reduce((sum, bankKey) => sum + (b.cuentas[bankKey] || 0), 0);
        } else {
          total = b.total;
        }

        return {
          name: `${getMonthName(b.mes - 1).substring(0, 3)} ${b.anio.toString().substring(2)}`,
          total: total
        };
      });
  }, [data, selectedBanks]);

  // Previous Month Comparison Logic
  const previousMonthId = `${viewDate.getMonth() === 0 ? viewDate.getFullYear() - 1 : viewDate.getFullYear()}-${String(viewDate.getMonth() === 0 ? 12 : viewDate.getMonth()).padStart(2, '0')}`;
  const previousBalance = data.find(b => b.id === previousMonthId);
  
  let previousTotalFiltered = 0;
  if (previousBalance) {
    if (selectedBanks.length > 0) {
      previousTotalFiltered = selectedBanks.reduce((sum, bankKey) => sum + (previousBalance.cuentas[bankKey] || 0), 0);
    } else {
      previousTotalFiltered = previousBalance.total;
    }
  }

  const diff = previousBalance ? displayTotalPatrimony - previousTotalFiltered : 0;
  const pctChange = previousBalance && previousTotalFiltered > 0 ? (diff / previousTotalFiltered) * 100 : 0;

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Balance Patrimonial</h2>
         <div className="flex items-center bg-white rounded-lg shadow-sm border p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-md"><ChevronLeft size={20} /></button>
          <span className="px-4 font-semibold min-w-[150px] text-center">
            {getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-md"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* KPI Card */}
        <Card className="md:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <Wallet size={20} />
            <span className="text-sm font-medium">
              {selectedBanks.length > 0 ? 'Patrimonio (Filtrado)' : 'Patrimonio Total'}
            </span>
          </div>
          <p className="text-3xl font-bold mb-4">{formatCurrency(displayTotalPatrimony)}</p>
          {existingBalance && previousBalance && (
            <div className={`text-sm flex items-center gap-1 ${diff >= 0 ? 'text-blue-100' : 'text-red-200'}`}>
              {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({pctChange.toFixed(1)}%) vs mes anterior
            </div>
          )}
        </Card>

        {/* Chart */}
        <Card className="md:col-span-2 h-64 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-semibold text-gray-500">
               Evolución {selectedBanks.length > 0 ? '(Bancos seleccionados)' : '(Total)'}
             </h3>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={(value: any) => `${Number(value) / 1000}k`} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Input Form */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Cuentas Bancarias</h3>
          {existingBalance && (
            <button 
              onClick={() => setDeleteId(currentMonthId)} 
              className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-sm transition-colors"
            >
              <Trash2 size={16} /> Eliminar Balance
            </button>
          )}
        </div>
        <form onSubmit={handleSave} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Render inputs dynamically */}
          {Object.keys(formState).sort((a,b) => {
             const idxA = banks.indexOf(a);
             const idxB = banks.indexOf(b);
             if (idxA !== -1 && idxB !== -1) return idxA - idxB;
             if (idxA !== -1) return -1;
             if (idxB !== -1) return 1;
             return a.localeCompare(b);
          }).map(key => {
            const isChecked = selectedBanks.includes(key);
            return (
              <div key={key} className="flex flex-col gap-1">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 truncate pr-2" title={key}>{key}</label>
                    <button 
                      type="button"
                      onClick={() => toggleBank(key)}
                      className={`text-gray-400 hover:text-blue-600 transition-colors ${isChecked ? 'text-blue-600' : ''}`}
                      title={isChecked ? "Desmarcar para filtrar" : "Marcar para filtrar"}
                    >
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                 </div>
                 <input 
                    className={`border-2 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900 placeholder-gray-400 ${isChecked ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'}`}
                    type="number" 
                    step="0.01" 
                    // Improved input UX: show empty string if value is 0
                    value={formState[key] === 0 ? '' : formState[key]} 
                    onChange={e => setFormState({...formState, [key]: Number(e.target.value)})} 
                  />
              </div>
            );
          })}
          
          <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500 mr-auto self-center hidden md:block">
              * Marcar casillas para filtrar la gráfica. Guardar almacenará todos los valores.
            </div>
            <Button type="submit">
              <Save size={18} /> Guardar Balance
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => deleteId && onDelete(deleteId)} 
        title="Eliminar Balance" 
        message="¿Estás seguro de eliminar el balance de este mes?" 
      />
    </div>
  );
};


import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Save, Trash2, Wallet, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { Balance, Investment, InvestmentType } from '../types';
import { Button, Card, ConfirmDialog } from './ui';
import { formatCurrency, getMonthName } from '../utils';

// These 4 keys are always present in the balance form, separate from config banks
const INV_BANK_KEYS = ['Depósitos', 'Cartera indexada', 'Inversión privada', 'Cuentas remuneradas'] as const;
type InvBankKey = typeof INV_BANK_KEYS[number];
const INV_TYPE_MAP: Record<InvBankKey, InvestmentType> = {
  'Depósitos': 'deposito',
  'Cartera indexada': 'cartera_indexada',
  'Inversión privada': 'privada',
  'Cuentas remuneradas': 'cuenta_remunerada',
};

interface Props {
  data: Balance[];
  banks: string[];
  inversiones: Investment[];
  onSave: (b: Balance) => void;
  onDelete: (id: string) => void;
}

export const BalanceView: React.FC<Props> = ({ data, banks, inversiones, onSave, onDelete }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const currentMonthId = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const existingBalance = data.find(b => b.id === currentMonthId);

  const [formState, setFormState] = useState<Record<string, number>>({});

  useEffect(() => {
    const found = data.find(b => b.id === currentMonthId);
    const newState: Record<string, number> = {};

    // Regular banks from config
    banks.forEach(bank => {
      newState[bank] = found?.cuentas[bank] ?? 0;
    });

    // Always include the 4 investment banks
    INV_BANK_KEYS.forEach(key => {
      newState[key] = found?.cuentas[key] ?? 0;
    });

    // Preserve any other existing keys (e.g. removed banks with data)
    if (found) {
      Object.entries(found.cuentas).forEach(([key, val]) => {
        if (!(key in newState)) newState[key] = val as number;
      });
    }

    setFormState(newState);
  }, [currentMonthId, data, banks]);

  const toggleBank = (bank: string) => {
    setSelectedBanks(prev =>
      prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
    );
  };

  // Totals
  const invBanksSet = new Set<string>(INV_BANK_KEYS);
  const regularBanksTotal = Object.entries(formState)
    .filter(([k]) => !invBanksSet.has(k))
    .reduce((s, [, v]) => s + Number(v), 0);
  const invBanksTotal = INV_BANK_KEYS.reduce((s, k) => s + (Number(formState[k]) || 0), 0);
  const realTotalPatrimony = regularBanksTotal + invBanksTotal;

  const banksToSum = selectedBanks.length > 0
    ? Object.keys(formState).filter(b => selectedBanks.includes(b))
    : Object.keys(formState);
  const displayTotalPatrimony = banksToSum.reduce((sum, bank) => sum + (Number(formState[bank]) || 0), 0);

  // Save logic
  const executeSave = (state: Record<string, number>) => {
    const total = Object.values(state).reduce((a, b) => a + Number(b), 0);
    onSave({
      id: currentMonthId,
      mes: viewDate.getMonth() + 1,
      anio: viewDate.getFullYear(),
      cuentas: state,
      total,
    });
    setShowTransferDialog(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowTransferDialog(true);
  };

  const handleTransferAndSave = () => {
    const overrides: Record<string, number> = {};
    INV_BANK_KEYS.forEach(key => {
      overrides[key] = inversiones
        .filter(i => i.tipo === INV_TYPE_MAP[key])
        .reduce((s, i) => s + i.valorActual, 0);
    });
    const newState = { ...formState, ...overrides };
    setFormState(newState);
    executeSave(newState);
  };

  // Chart
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(-12)
      .map(b => {
        let total = 0;
        if (selectedBanks.length > 0) {
          total = selectedBanks.reduce((sum, bankKey) => sum + (b.cuentas[bankKey] || 0), 0);
        } else {
          total = b.total;
        }
        return {
          name: `${getMonthName(b.mes - 1).substring(0, 3)} ${b.anio.toString().substring(2)}`,
          total,
        };
      });
  }, [data, selectedBanks]);

  // Diff vs previous month
  const previousMonthId = `${viewDate.getMonth() === 0 ? viewDate.getFullYear() - 1 : viewDate.getFullYear()}-${String(viewDate.getMonth() === 0 ? 12 : viewDate.getMonth()).padStart(2, '0')}`;
  const previousBalance = data.find(b => b.id === previousMonthId);

  let previousTotalFiltered = 0;
  if (previousBalance) {
    previousTotalFiltered = selectedBanks.length > 0
      ? selectedBanks.reduce((sum, k) => sum + (previousBalance.cuentas[k] || 0), 0)
      : previousBalance.total;
  }

  const diff = previousBalance ? displayTotalPatrimony - previousTotalFiltered : 0;
  const pctChange = previousBalance && previousTotalFiltered > 0 ? (diff / previousTotalFiltered) * 100 : 0;

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  // Preview values for the transfer dialog
  const transferPreview = INV_BANK_KEYS.map(key => ({
    key,
    value: inversiones.filter(i => i.tipo === INV_TYPE_MAP[key]).reduce((s, i) => s + i.valorActual, 0),
  }));

  // Regular banks (excluding INV_BANK_KEYS) for the form
  const regularBankKeys = Object.keys(formState).filter(k => !invBanksSet.has(k)).sort((a, b) => {
    const ia = banks.indexOf(a), ib = banks.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    return a.localeCompare(b);
  });

  const renderInput = (key: string, isInv = false) => {
    const isChecked = selectedBanks.includes(key);
    return (
      <div key={key} className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium truncate pr-2 ${isInv ? 'text-purple-700' : 'text-gray-700'}`} title={key}>{key}</label>
          <button type="button" onClick={() => toggleBank(key)} className={`text-gray-400 hover:text-blue-600 transition-colors ${isChecked ? 'text-blue-600' : ''}`}>
            {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        </div>
        <input
          className={`border-2 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900 placeholder-gray-400 ${isChecked ? 'border-blue-500 ring-2 ring-blue-50' : isInv ? 'border-purple-200' : 'border-gray-200'}`}
          type="number" step="0.01"
          value={formState[key] === 0 ? '' : formState[key]}
          onChange={e => setFormState({ ...formState, [key]: Number(e.target.value) })}
        />
      </div>
    );
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
        <Card className="md:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none flex flex-col justify-center">
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <Wallet size={20} />
            <span className="text-sm font-medium">{selectedBanks.length > 0 ? 'Patrimonio (Filtrado)' : 'Patrimonio Total'}</span>
          </div>
          <p className="text-3xl font-bold mb-3">{formatCurrency(displayTotalPatrimony)}</p>
          {selectedBanks.length === 0 && (
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 opacity-75"><Wallet size={13} /> Cuentas</span>
                <span className="font-semibold">{formatCurrency(regularBanksTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 opacity-75"><TrendingUp size={13} /> Inversiones</span>
                <span className="font-semibold">{formatCurrency(invBanksTotal)}</span>
              </div>
            </div>
          )}
          {existingBalance && previousBalance && (
            <div className={`text-sm flex items-center gap-1 border-t border-blue-500/40 pt-2 ${diff >= 0 ? 'text-blue-100' : 'text-red-200'}`}>
              {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({pctChange.toFixed(1)}%) vs mes anterior
            </div>
          )}
        </Card>

        <Card className="md:col-span-2 h-64 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-500">Evolución {selectedBanks.length > 0 ? '(Filtrado)' : '(Total)'}</h3>
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
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Cuentas Bancarias</h3>
          {existingBalance && (
            <button onClick={() => setDeleteId(currentMonthId)} className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-sm transition-colors">
              <Trash2 size={16} /> Eliminar Balance
            </button>
          )}
        </div>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Regular banks */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {regularBankKeys.map(key => renderInput(key, false))}
          </div>

          {/* Investment banks */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-purple-600" />
              <h4 className="text-sm font-semibold text-purple-700">Inversiones</h4>
              <div className="flex-1 h-px bg-purple-100" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {INV_BANK_KEYS.map(key => renderInput(key, true))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit"><Save size={18} /> Guardar Balance</Button>
          </div>
        </form>
      </Card>

      {/* Transfer dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-1">¿Trasladar valores de inversiones?</h3>
            <p className="text-sm text-gray-500 mb-4">Se sobreescribirán los campos de inversiones con los valores actuales.</p>
            <div className="space-y-2 mb-6 bg-purple-50 rounded-lg p-3">
              {transferPreview.map(({ key, value }) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-semibold text-purple-700">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => executeSave(formState)}>
                Guardar sin trasladar
              </Button>
              <Button className="flex-1" onClick={handleTransferAndSave}>
                Trasladar y guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && onDelete(deleteId)} title="Eliminar Balance" message="¿Estás seguro de eliminar el balance de este mes?" />
    </div>
  );
};

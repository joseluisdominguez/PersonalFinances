
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Plus, Edit2, Trash2, PiggyBank, Coins, History, X, Calendar, TrendingUp, Info, MinusCircle, Wallet, ArrowUpCircle } from 'lucide-react';
import { Investment, InvestmentType, InterestPayment, PaymentType } from '../types';
import { Button, Card, Input, Select, ConfirmDialog } from './ui';
import { formatCurrency, formatDate, generateId, getMonthName } from '../utils';

interface Props {
  data: Investment[];
  onSave: (i: Investment) => void;
  onDelete: (id: string) => void;
}

const TYPES: {value: InvestmentType, label: string}[] = [
  { value: 'cuenta_remunerada', label: 'Cuenta Remunerada' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'cartera_indexada', label: 'Cartera Indexada' },
  { value: 'privada', label: 'Inversión Privada' },
];

export const InvestmentsView: React.FC<Props> = ({ data, onSave, onDelete }) => {
  // Main Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Interest/Benefit/Withdrawal Logic State
  const [modalType, setModalType] = useState<PaymentType | 'none'>('none');
  const [activeInvestmentId, setActiveInvestmentId] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ cantidad: '', fecha: new Date().toISOString().split('T')[0], nota: '' });

  const initialFormState = {
    tipo: 'cuenta_remunerada' as InvestmentType,
    nombre: '',
    entidad: '',
    capitalInvertido: 0,
    valorActual: 0,
    fecha: new Date().toISOString().split('T')[0],
    detalles: {},
    notas: ''
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  // --- Helpers ---
  const isCashflowType = (type: InvestmentType) => type === 'cuenta_remunerada' || type === 'deposito';

  const getProfit = (item: Investment) => {
    if (isCashflowType(item.tipo)) {
      // For bank accounts/deposits, profit is just the sum of interest payments
      return (item.historialPagos || [])
        .filter(p => p.tipo === 'interes')
        .reduce((acc, pay) => acc + pay.cantidad, 0);
    }
    if (item.tipo === 'privada') {
      // For private investments, profit is the sum of benefit/loss entries
      return (item.historialPagos || [])
        .filter(p => p.tipo === 'beneficio')
        .reduce((acc, pay) => acc + pay.cantidad, 0);
    }
    // For indexed portfolios, profit is market value minus cost basis
    return item.valorActual - item.capitalInvertido;
  };

  // --- Main CRUD Handlers ---

  const handleEdit = (item: Investment) => {
    setFormData({
      ...item,
      detalles: item.detalles || {},
      notas: item.notas || ''
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const investment: Investment = {
      ...formData,
      id: editingId || generateId(),
      capitalInvertido: Number(formData.capitalInvertido),
      valorActual: Number(formData.valorActual),
      historialPagos: editingId ? (data.find(i => i.id === editingId)?.historialPagos || []) : []
    };
    onSave(investment);
    setIsFormOpen(false);
  };

  // --- Payment / Withdrawal Logic Handlers ---

  const openPaymentModal = (id: string, type: PaymentType) => {
    setPaymentForm({ cantidad: '', fecha: new Date().toISOString().split('T')[0], nota: '' });
    setModalType(type);
    setActiveInvestmentId(id);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvestmentId || !paymentForm.cantidad || modalType === 'none') return;

    const investment = data.find(i => i.id === activeInvestmentId);
    if (!investment) return;

    const amount = Number(paymentForm.cantidad);
    const newPayment: InterestPayment = {
      id: generateId(),
      fecha: paymentForm.fecha,
      cantidad: amount,
      tipo: modalType,
      nota: paymentForm.nota
    };

    let newValorActual = investment.valorActual;
    let newCapitalInvertido = investment.capitalInvertido;

    if (modalType === 'retiro') {
      newValorActual -= amount;
      // "En las carteras y solo en las carteras (indexadas), restar también del capital invertido"
      if (investment.tipo === 'cartera_indexada') {
        newCapitalInvertido -= amount;
      }
    } else if (modalType === 'aportacion') {
      // "Añadir botón aportación a las carteras y solo a las carteras que sume al capital actual e invertido"
      newValorActual += amount;
      if (investment.tipo === 'cartera_indexada') {
        newCapitalInvertido += amount;
      }
    }

    const updatedInvestment: Investment = {
      ...investment,
      valorActual: newValorActual,
      capitalInvertido: newCapitalInvertido,
      historialPagos: [...(investment.historialPagos || []), newPayment],
      fecha: paymentForm.fecha > investment.fecha ? paymentForm.fecha : investment.fecha
    };

    onSave(updatedInvestment);
    setModalType('none');
    setActiveInvestmentId(null);
  };

  const handleDeleteHistoryItem = (investmentId: string, paymentId: string) => {
    const investment = data.find(i => i.id === investmentId);
    if (!investment) return;

    const itemToDelete = investment.historialPagos?.find(p => p.id === paymentId);
    if (!itemToDelete) return;

    let newValorActual = investment.valorActual;
    let newCapitalInvertido = investment.capitalInvertido;

    if (itemToDelete.tipo === 'retiro') {
      newValorActual += itemToDelete.cantidad;
      // Restore capital if it was a portfolio withdrawal
      if (investment.tipo === 'cartera_indexada') {
        newCapitalInvertido += itemToDelete.cantidad;
      }
    } else if (itemToDelete.tipo === 'aportacion') {
      newValorActual -= itemToDelete.cantidad;
      if (investment.tipo === 'cartera_indexada') {
        newCapitalInvertido -= itemToDelete.cantidad;
      }
    }

    const updatedInvestment = {
        ...investment,
        valorActual: newValorActual,
        capitalInvertido: newCapitalInvertido,
        historialPagos: investment.historialPagos?.filter(p => p.id !== paymentId) || []
    };
    onSave(updatedInvestment);
  };

  // --- Calculations & Memos ---

  const summary = useMemo(() => {
    const totalValue = data.reduce((a, b) => a + b.valorActual, 0);
    const totalInvested = data.reduce((a, b) => a + b.capitalInvertido, 0);
    const totalProfit = data.reduce((acc, item) => acc + getProfit(item), 0);
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    
    return { totalInvested, totalValue, totalProfit, roi };
  }, [data]);

  const profitChartData = useMemo(() => {
    const months: Record<string, number> = {};
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = 0;
    }

    data.forEach(inv => {
        if (inv.historialPagos) {
            inv.historialPagos.forEach(pay => {
                if (pay.tipo === 'interes' || pay.tipo === 'beneficio') {
                    const date = new Date(pay.fecha);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (months[key] !== undefined) {
                         months[key] = (months[key] || 0) + pay.cantidad;
                    }
                }
            });
        }
    });

    return Object.entries(months)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => {
            const [y, m] = key.split('-');
            return {
                name: `${getMonthName(parseInt(m)-1).substring(0,3)} ${y.substring(2)}`,
                value
            };
        });
  }, [data]);

  const renderSpecificFields = () => {
    switch(formData.tipo) {
      case 'cuenta_remunerada':
        return (
          <Input 
            label="TAE (%)" 
            type="number" step="0.01" 
            value={formData.detalles.tae || ''} 
            onChange={e => setFormData({...formData, detalles: {...formData.detalles, tae: e.target.value}})} 
          />
        );
      case 'deposito':
        return (
          <>
             <Select 
                label="Frecuencia Pago" 
                value={formData.detalles.frecuencia || 'Mensual'} 
                onChange={e => setFormData({...formData, detalles: {...formData.detalles, frecuencia: e.target.value}})}
              >
                <option value="Mensual">Mensual</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Al Vencimiento">Al Vencimiento</option>
             </Select>
             <Input 
                label="Fecha Vencimiento" type="date"
                value={formData.detalles.vencimiento || ''} 
                onChange={e => setFormData({...formData, detalles: {...formData.detalles, vencimiento: e.target.value}})} 
             />
             <div className="col-span-2">
               <Input 
                label="TAE (%)" 
                type="number" step="0.01" 
                value={formData.detalles.tae || ''} 
                onChange={e => setFormData({...formData, detalles: {...formData.detalles, tae: e.target.value}})} 
               />
             </div>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Cartera de Inversiones</h2>
        <Button onClick={handleNew}><Plus size={18} /> Nueva Inversión</Button>
      </div>

      {/* Dashboard Top */}
      <div className="flex flex-col gap-6">
         {/* Summary Numbers Row */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
                <p className="text-blue-100 text-sm font-medium mb-1">Valor Total Activos</p>
                <p className="text-3xl font-bold">{formatCurrency(summary.totalValue)}</p>
            </Card>
            <Card className="border-l-4 border-l-green-500">
                <p className="text-gray-500 text-sm font-medium mb-1">Beneficio Total Acumulado</p>
                <p className="text-3xl font-bold text-green-600">
                    {summary.totalProfit >= 0 ? '+' : ''}{formatCurrency(summary.totalProfit)}
                </p>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
                <p className="text-gray-500 text-sm font-medium mb-1">Rentabilidad Media (ROI)</p>
                <div className="flex items-center gap-2">
                   <p className="text-3xl font-bold text-indigo-600">{summary.roi.toFixed(1)}%</p>
                   <TrendingUp className="text-indigo-400" size={24} />
                </div>
            </Card>
         </div>

         {/* Profit Chart */}
         <Card className="flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Intereses y Beneficios Recibidos</h3>
                    <p className="text-sm text-gray-500">Rendimientos mensuales de tus inversiones (No incluye plusvalías latentes)</p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Coins size={24} />
                </div>
            </div>
            <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{fontSize: 12, fill: '#6B7280'}} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{fontSize: 12, fill: '#6B7280'}}
                            tickFormatter={(val) => `${val}€`}
                        />
                        <Tooltip 
                            cursor={{fill: '#F9FAFB'}}
                            formatter={(val: number) => [formatCurrency(val), 'Rendimiento']} 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar 
                            dataKey="value" 
                            fill="#10B981" 
                            radius={[6, 6, 0, 0]} 
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </Card>
      </div>

      {/* Grouped Lists */}
      {TYPES.map((typeGroup) => {
        const items = data.filter(i => i.tipo === typeGroup.value);
        if (items.length === 0) return null;
        const isCashflow = isCashflowType(typeGroup.value);

        return (
          <div key={typeGroup.value} className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700 mt-6">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              {typeGroup.label}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => {
                const profit = getProfit(item);
                const profitPct = item.capitalInvertido > 0 ? (profit / item.capitalInvertido) * 100 : null;
                
                return (
                <Card key={item.id} className="relative hover:shadow-md transition-shadow group flex flex-col border-gray-100">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isCashflow ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isCashflow ? <Coins size={20} /> : <PiggyBank size={20} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 leading-tight">{item.nombre}</h4>
                                {item.notas && (
                                    <div className="group/note relative">
                                        <Info size={14} className="text-gray-400 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/note:block w-48 p-2 bg-gray-800 text-white text-xs rounded z-10 shadow-lg pointer-events-none text-center">
                                            {item.notas}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {item.entidad && <p className="text-xs text-gray-500">{item.entidad}</p>}
                        </div>
                     </div>
                     
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={16} /></button>
                     </div>
                  </div>

                  {/* Card Body */}
                  <div className="space-y-3 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                               {isCashflow ? 'Saldo Actual' : 'Valor Actual'}
                             </p>
                             <p className="font-bold text-xl text-gray-900">{formatCurrency(item.valorActual)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                               Beneficio
                             </p>
                             <div className="flex flex-col items-end gap-1">
                                <p className={`font-bold text-xl leading-tight ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {profit > 0 && '+'}{formatCurrency(profit)}
                                </p>
                                {profitPct !== null && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    profitPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {profitPct > 0 && '+'}{profitPct.toFixed(2)}%
                                  </span>
                                )}
                             </div>
                        </div>
                    </div>
                    
                    {/* Specific Details */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded flex justify-between items-center">
                        {isCashflow ? (
                            <span>TAE: <span className="font-medium text-gray-900">{item.detalles.tae || '-'}%</span></span>
                        ) : (
                            <span>Coste: <span className="font-medium text-gray-900">{formatCurrency(item.capitalInvertido)}</span></span>
                        )}
                        <span>{formatDate(item.fecha)}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2">
                      {isCashflow && (
                        <button 
                          onClick={() => openPaymentModal(item.id, 'interes')}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 py-2 rounded hover:bg-green-100 transition-colors"
                        >
                           <Plus size={14} /> Registrar Interés
                        </button>
                      )}
                      {item.tipo === 'privada' && (
                        <>
                          <button 
                            onClick={() => openPaymentModal(item.id, 'beneficio')}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 py-2 rounded hover:bg-green-100 transition-colors"
                          >
                             <Plus size={14} /> Beneficio
                          </button>
                          <button 
                            onClick={() => openPaymentModal(item.id, 'retiro')}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-orange-50 text-orange-700 py-2 rounded hover:bg-orange-100 transition-colors"
                          >
                             <MinusCircle size={14} /> Retirar
                          </button>
                        </>
                      )}
                      {item.tipo === 'cartera_indexada' && (
                        <>
                          <button 
                            onClick={() => openPaymentModal(item.id, 'aportacion')}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 py-2 rounded hover:bg-blue-100 transition-colors"
                          >
                             <ArrowUpCircle size={14} /> Aportar
                          </button>
                          <button 
                            onClick={() => openPaymentModal(item.id, 'retiro')}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-orange-50 text-orange-700 py-2 rounded hover:bg-orange-100 transition-colors"
                          >
                             <MinusCircle size={14} /> Retirar
                          </button>
                        </>
                      )}
                      {(isCashflow || item.tipo === 'privada' || item.tipo === 'cartera_indexada') && (
                        <button 
                           onClick={() => { setActiveInvestmentId(item.id); setHistoryModalOpen(true); }}
                           className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-700 py-2 rounded hover:bg-gray-100 transition-colors"
                        >
                           <History size={14} /> Historial
                        </button>
                      )}
                  </div>
                </Card>
              )})}
            </div>
          </div>
        )
      })}

      {/* --- MODALS --- */}

      {/* 1. Main Edit/Create Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6">{editingId ? 'Editar Inversión' : 'Nueva Inversión'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo de Inversión" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Input label="Fecha Actualización" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre / Producto" placeholder="Ej: Cuenta Naranja" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                <Input label="Entidad (Opcional)" placeholder="Ej: ING" value={formData.entidad} onChange={e => setFormData({...formData, entidad: e.target.value})} />
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos Económicos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label={isCashflowType(formData.tipo) ? "Saldo Actual (€)" : "Valor Actual (€)"} 
                        type="number" step="0.01" 
                        value={formData.valorActual} 
                        onChange={e => setFormData({...formData, valorActual: Number(e.target.value)})} 
                        required 
                    />
                    <Input 
                        label={isCashflowType(formData.tipo) ? "Capital Inicial (€)" : "Capital Invertido (€)"} 
                        type="number" step="0.01" 
                        value={formData.capitalInvertido} 
                        onChange={e => setFormData({...formData, capitalInvertido: Number(e.target.value)})} 
                        required 
                        placeholder="Opcional"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg">
                {renderSpecificFields()}
              </div>

              <div className="space-y-1 px-4">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea 
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-blue-500 focus:outline-none bg-white text-gray-900 min-h-[100px]"
                  placeholder="Detalles adicionales sobre esta inversión..."
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar Inversión</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Generic Action Modal (Interest, Benefit, Withdrawal, Contribution) */}
      {modalType !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 {modalType === 'interes' && <><Coins className="text-yellow-500" /> Registrar Interés</>}
                 {modalType === 'beneficio' && <><TrendingUp className="text-green-500" /> Registrar Beneficio/Pérdida</>}
                 {modalType === 'retiro' && <><Wallet className="text-orange-500" /> Retirar Capital</>}
                 {modalType === 'aportacion' && <><ArrowUpCircle className="text-blue-500" /> Nueva Aportación</>}
              </h3>
              <form onSubmit={handleSavePayment} className="space-y-4">
                  <Input 
                     label="Fecha" 
                     type="date" 
                     value={paymentForm.fecha} 
                     onChange={e => setPaymentForm({...paymentForm, fecha: e.target.value})} 
                     required
                  />
                  <Input 
                     label={modalType === 'retiro' ? "Cantidad a retirar (€)" : modalType === 'aportacion' ? "Cantidad a aportar (€)" : "Cantidad (€)"} 
                     type="number" step="0.01" 
                     value={paymentForm.cantidad} 
                     onChange={e => setPaymentForm({...paymentForm, cantidad: e.target.value})} 
                     required
                     autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Nota (Opcional)</label>
                    <input 
                        className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Ej: Aportación mensual extraordinaria"
                        value={paymentForm.nota}
                        onChange={e => setPaymentForm({...paymentForm, nota: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                     <Button variant="secondary" className="flex-1" onClick={() => setModalType('none')}>Cancelar</Button>
                     <Button type="submit" className="flex-1">Guardar</Button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* 3. History View Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-0 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <History size={18} /> Historial de Movimientos
                    </h3>
                    <button onClick={() => { setHistoryModalOpen(false); setActiveInvestmentId(null); }} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {(() => {
                        const inv = data.find(i => i.id === activeInvestmentId);
                        const history = inv?.historialPagos || [];
                        
                        if (history.length === 0) return <div className="text-center text-gray-400 py-8">No hay movimientos registrados</div>

                        return history
                            .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                            .map(pay => (
                            <div key={pay.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 group">
                                <div className="flex items-center gap-3">
                                    <div className={`${
                                      pay.tipo === 'retiro' ? 'bg-orange-100 text-orange-700' : 
                                      pay.tipo === 'aportacion' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    } p-2 rounded-full`}>
                                        {pay.tipo === 'retiro' ? <MinusCircle size={14} /> : 
                                         pay.tipo === 'aportacion' ? <ArrowUpCircle size={14} /> :
                                         <Calendar size={14} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                          <p className={`font-bold ${pay.tipo === 'retiro' ? 'text-orange-600' : pay.tipo === 'aportacion' ? 'text-blue-600' : 'text-gray-900'}`}>
                                            {pay.tipo === 'retiro' ? '-' : '+'}{formatCurrency(pay.cantidad)}
                                          </p>
                                          <span className="text-[10px] uppercase font-bold text-gray-400 border px-1 rounded">
                                            {pay.tipo === 'interes' ? 'Liquidación' : pay.tipo}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500">{formatDate(pay.fecha)} {pay.nota ? `• ${pay.nota}` : ''}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteHistoryItem(inv!.id, pay.id)}
                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    title="Eliminar registro"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => deleteId && onDelete(deleteId)} 
        title="Eliminar Inversión" 
        message="¿Estás seguro de que deseas eliminar esta inversión? Se perderá todo el historial asociado." 
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Invoice, ReceivedInvoice, Owner } from '../../types';
import { Card } from '../ui';
import { formatCurrency } from '../../utils';
import {
  calcInvoiceTotals,
  calcReceivedInvoiceTotals,
  filterByYearQuarter,
  getImputacionPct,
} from './utils';

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface Props {
  facturas: Invoice[];
  facturasRecibidas: ReceivedInvoice[];
  activeOwner: Owner;
}

type QuarterSel = 1 | 2 | 3 | 4 | 'todo';

const QUARTER_LABEL: Record<string, string> = {
  todo: 'Anual',
  '1': 'T1 (Ene-Mar)',
  '2': 'T2 (Abr-Jun)',
  '3': 'T3 (Jul-Sep)',
  '4': 'T4 (Oct-Dic)',
};

// Las facturas borrador no computan fiscalmente
const isComputable = (f: Invoice): boolean => f.estado !== 'borrador';

export const AnalyticsView: React.FC<Props> = ({
  facturas,
  facturasRecibidas,
  activeOwner,
}) => {
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    facturas.forEach((f) => years.add(new Date(f.fechaEmision).getFullYear()));
    facturasRecibidas.forEach((f) =>
      years.add(new Date(f.fechaEmision).getFullYear())
    );
    const arr = Array.from(years).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [facturas, facturasRecibidas]);

  const [year, setYear] = useState<number>(availableYears[0]);
  const [quarter, setQuarter] = useState<QuarterSel>('todo');

  const ventas = useMemo(() => {
    const own = facturas
      .filter((f) => f.ownerId === activeOwner.id && isComputable(f));
    return filterByYearQuarter(own, year, quarter);
  }, [facturas, activeOwner.id, year, quarter]);

  const compras = useMemo(() => {
    const own = facturasRecibidas.filter((f) => f.ownerId === activeOwner.id);
    return filterByYearQuarter(own, year, quarter);
  }, [facturasRecibidas, activeOwner.id, year, quarter]);

  const ventasAgg = useMemo(() => {
    let base = 0;
    let ivaRepercutido = 0;
    let irpfRetenido = 0;
    const ivaPorTipo: Record<number, { base: number; cuota: number }> = {};
    ventas.forEach((v) => {
      const t = calcInvoiceTotals(v.lineas, v.aplicaIrpf, v.irpfPct);
      base += t.baseImponible;
      ivaRepercutido += t.totalIva;
      irpfRetenido += t.totalIrpf;
      Object.entries(t.ivaDesglose).forEach(([pct, { base: b, cuota }]) => {
        const key = Number(pct);
        const acc = ivaPorTipo[key] || { base: 0, cuota: 0 };
        ivaPorTipo[key] = { base: acc.base + b, cuota: acc.cuota + cuota };
      });
    });
    return { base, ivaRepercutido, irpfRetenido, ivaPorTipo };
  }, [ventas]);

  const comprasAgg = useMemo(() => {
    let base = 0;
    let ivaSoportado = 0;
    let irpfSoportado = 0;
    const ivaPorTipo: Record<number, { base: number; cuota: number }> = {};
    compras.forEach((c) => {
      // El % de imputación pondera cuánto de la factura computa fiscalmente
      // (afectación parcial a la actividad). Ausente = 100%.
      const factor = getImputacionPct(c) / 100;
      const t = calcReceivedInvoiceTotals(c.lineas, c.retencionIrpf || 0);
      base += round2(t.baseImponible * factor);
      ivaSoportado += round2(t.totalIva * factor);
      irpfSoportado += round2(t.totalIrpf * factor);
      Object.entries(t.ivaDesglose).forEach(([pct, { base: b, cuota }]) => {
        const key = Number(pct);
        const acc = ivaPorTipo[key] || { base: 0, cuota: 0 };
        ivaPorTipo[key] = {
          base: round2(acc.base + b * factor),
          cuota: round2(acc.cuota + cuota * factor),
        };
      });
    });
    return { base, ivaSoportado, irpfSoportado, ivaPorTipo };
  }, [compras]);

  // Modelo 303
  const ivaAIngresar = ventasAgg.ivaRepercutido - comprasAgg.ivaSoportado;

  // ¿Alguna compra computa parcialmente (imputación < 100%)?
  const hayImputacionParcial = useMemo(
    () => compras.some((c) => getImputacionPct(c) < 100),
    [compras]
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Analítica fiscal</h3>
          <p className="text-sm text-gray-500">
            Resumen del IVA y del IRPF de <strong>{activeOwner.nombre}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white font-medium focus:outline-none focus:border-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={quarter}
            onChange={(e) =>
              setQuarter(
                e.target.value === 'todo' ? 'todo' : (Number(e.target.value) as QuarterSel)
              )
            }
            className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="todo">Anual</option>
            <option value="1">T1</option>
            <option value="2">T2</option>
            <option value="3">T3</option>
            <option value="4">T4</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-100">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <TrendingUp size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Ingresos (base)
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(ventasAgg.base)}
          </p>
          <p className="text-xs text-green-700 mt-1">{ventas.length} factura(s)</p>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <TrendingDown size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Gastos (base)
            </span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(comprasAgg.base)}
          </p>
          <p className="text-xs text-red-700 mt-1">{compras.length} factura(s)</p>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Receipt size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              IVA a {ivaAIngresar >= 0 ? 'ingresar' : 'devolver'}
            </span>
          </div>
          <p
            className={`text-2xl font-bold ${
              ivaAIngresar >= 0 ? 'text-blue-900' : 'text-emerald-700'
            }`}
          >
            {formatCurrency(Math.abs(ivaAIngresar))}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Repercutido − Soportado
          </p>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Wallet size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              IRPF retenido en ventas
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-900">
            {formatCurrency(ventasAgg.irpfRetenido)}
          </p>
          <p className="text-xs text-amber-700 mt-1">Retenido por tus clientes</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={20} className="text-blue-600" />
          <h4 className="font-bold text-gray-900">
            Modelo 303 · IVA{' '}
            <span className="text-gray-500 text-sm font-normal">
              ({QUARTER_LABEL[String(quarter)]})
            </span>
          </h4>
        </div>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              IVA repercutido (ventas)
            </p>
            {Object.keys(ventasAgg.ivaPorTipo).length === 0 ? (
              <p className="text-gray-400 text-xs">Sin operaciones</p>
            ) : (
              Object.entries(ventasAgg.ivaPorTipo)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([pct, { base, cuota }]) => (
                  <div key={pct} className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Base {pct}%: {formatCurrency(base)}
                    </span>
                    <span className="font-medium">{formatCurrency(cuota)}</span>
                  </div>
                ))
            )}
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-600">Base imponible (ventas)</span>
              <span className="font-medium">
                {formatCurrency(ventasAgg.base)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total IVA repercutido</span>
              <span className="font-bold">
                {formatCurrency(ventasAgg.ivaRepercutido)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              IVA soportado (compras)
            </p>
            {Object.keys(comprasAgg.ivaPorTipo).length === 0 ? (
              <p className="text-gray-400 text-xs">Sin operaciones</p>
            ) : (
              Object.entries(comprasAgg.ivaPorTipo)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([pct, { base, cuota }]) => (
                  <div key={pct} className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Base {pct}%: {formatCurrency(base)}
                    </span>
                    <span className="font-medium">{formatCurrency(cuota)}</span>
                  </div>
                ))
            )}
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-600">Base imponible (compras)</span>
              <span className="font-medium">
                {formatCurrency(comprasAgg.base)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total IVA soportado</span>
              <span className="font-bold">
                {formatCurrency(comprasAgg.ivaSoportado)}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`flex justify-between border-t-2 pt-3 mt-3 text-base ${
            ivaAIngresar >= 0 ? 'border-blue-200' : 'border-emerald-200'
          }`}
        >
          <span className="font-bold">
            {ivaAIngresar >= 0 ? 'A ingresar (casilla 71)' : 'A devolver'}
          </span>
          <span
            className={`font-bold ${
              ivaAIngresar >= 0 ? 'text-blue-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(Math.abs(ivaAIngresar))}
          </span>
        </div>
        {hayImputacionParcial && (
          <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
            * Las compras se computan ponderadas por su % de imputación
            (afectación a la actividad).
          </p>
        )}
      </Card>
    </div>
  );
};

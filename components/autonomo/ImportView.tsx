import React, { useState, useMemo } from 'react';
import {
  Upload,
  Users,
  Truck,
  FileText,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  Client,
  Supplier,
  Invoice,
  ReceivedInvoice,
  Owner,
} from '../../types';
import { Button, Card } from '../ui';
import { formatCurrency } from '../../utils';
import { parseCsv, readFileAsText } from './csv';
import {
  cleanNif,
  indexByNif,
  inferIvaPct,
  mapToClient,
  mapToInvoice,
  mapToReceivedInvoice,
  mapToSupplier,
  num,
  parseStelDate,
} from './stelorderImport';

type Section = 'clientes' | 'proveedores' | 'ventas' | 'compras';

interface Props {
  activeOwner: Owner;
  clientes: Client[];
  proveedores: Supplier[];
  facturas: Invoice[];
  facturasRecibidas: ReceivedInvoice[];
  onImportClients: (items: Client[]) => void;
  onImportSuppliers: (items: Supplier[]) => void;
  onImportInvoices: (items: Invoice[]) => void;
  onImportReceived: (items: ReceivedInvoice[]) => void;
}

interface PreviewRow {
  raw: Record<string, string>;
  isDuplicate: boolean;
  reason?: string;
  outOfYear?: boolean;
}

const currentYear = new Date().getFullYear();

const SECTION_META: Record<Section, { label: string; icon: any; tint: string }> = {
  clientes: {
    label: 'Clientes',
    icon: Users,
    tint: 'bg-purple-50 border-purple-100 text-purple-700',
  },
  proveedores: {
    label: 'Proveedores',
    icon: Truck,
    tint: 'bg-amber-50 border-amber-100 text-amber-700',
  },
  ventas: {
    label: 'Facturas de venta',
    icon: FileText,
    tint: 'bg-blue-50 border-blue-100 text-blue-700',
  },
  compras: {
    label: 'Facturas de compra',
    icon: ShoppingBag,
    tint: 'bg-orange-50 border-orange-100 text-orange-700',
  },
};

const yearFromStelDate = (s: string | undefined): number | undefined => {
  const iso = parseStelDate(s);
  if (!iso) return undefined;
  return new Date(iso).getFullYear();
};

export const ImportView: React.FC<Props> = ({
  activeOwner,
  clientes,
  proveedores,
  facturas,
  facturasRecibidas,
  onImportClients,
  onImportSuppliers,
  onImportInvoices,
  onImportReceived,
}) => {
  const [section, setSection] = useState<Section>('clientes');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [onlyCurrentYear, setOnlyCurrentYear] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const clientesByNif = useMemo(() => indexByNif(clientes), [clientes]);
  const proveedoresByNif = useMemo(() => indexByNif(proveedores), [proveedores]);
  const facturasRef = useMemo(() => {
    const s = new Set<string>();
    facturas.forEach((f) => s.add(`${f.serie}-${f.numero}`));
    return s;
  }, [facturas]);
  const recibidasRef = useMemo(() => {
    const s = new Set<string>();
    facturasRecibidas.forEach((f) => s.add(f.numeroExterno.toLowerCase()));
    return s;
  }, [facturasRecibidas]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setRows([]);
    setFileName(file.name);
    try {
      const text = await readFileAsText(file, 'windows-1252');
      const parsed = parseCsv(text, ';');
      if (parsed.rows.length === 0) {
        setError('El CSV no contiene filas');
        return;
      }
      const previews = parsed.rows.map((raw) => decorate(raw));
      setRows(previews);
    } catch (err) {
      setError('Error al leer el CSV');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const decorate = (raw: Record<string, string>): PreviewRow => {
    if (section === 'clientes') {
      const nif = cleanNif(raw['CifNif']);
      const dup = clientesByNif.has(nif);
      return {
        raw,
        isDuplicate: dup,
        reason: dup ? 'NIF ya existe' : undefined,
      };
    }
    if (section === 'proveedores') {
      const nif = cleanNif(raw['CifNif']);
      const dup = proveedoresByNif.has(nif);
      return {
        raw,
        isDuplicate: dup,
        reason: dup ? 'NIF ya existe' : undefined,
      };
    }
    if (section === 'ventas') {
      const ref = raw['Referencia'] || '';
      const m = ref.match(/^([A-Za-z]+)(\d+)$/);
      const key = m ? `${m[1].toUpperCase()}-${Number(m[2])}` : ref;
      const dup = facturasRef.has(key);
      const y = yearFromStelDate(raw['Fecha']);
      const out = onlyCurrentYear && y !== currentYear;
      return {
        raw,
        isDuplicate: dup,
        reason: dup ? `Factura ${ref} ya importada` : undefined,
        outOfYear: out,
      };
    }
    // compras
    const numExt =
      (raw['Ref. documento proveedor'] || raw['Referencia'] || '').toLowerCase();
    const dup = numExt ? recibidasRef.has(numExt) : false;
    const y = yearFromStelDate(raw['Fecha']);
    const out = onlyCurrentYear && y !== currentYear;
    return {
      raw,
      isDuplicate: dup,
      reason: dup ? 'Nº externo ya registrado' : undefined,
      outOfYear: out,
    };
  };

  // Recalcular flags cuando cambia onlyCurrentYear sin tener que volver a parsear
  React.useEffect(() => {
    if (rows.length === 0) return;
    setRows((prev) => prev.map((p) => decorate(p.raw)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyCurrentYear, section, clientesByNif, proveedoresByNif]);

  const eligibles = rows.filter((r) => !r.isDuplicate && !r.outOfYear);

  const handleImport = () => {
    if (eligibles.length === 0) return;
    if (section === 'clientes') {
      const mapped = eligibles.map((r) => mapToClient(r.raw, activeOwner.id));
      onImportClients(mapped);
      setToast(`${mapped.length} cliente(s) importados`);
    } else if (section === 'proveedores') {
      const mapped = eligibles.map((r) => mapToSupplier(r.raw, activeOwner.id));
      onImportSuppliers(mapped);
      setToast(`${mapped.length} proveedor(es) importados`);
    } else if (section === 'ventas') {
      const mapped = eligibles.map((r) =>
        mapToInvoice(r.raw, { ownerId: activeOwner.id, clientesByNif })
      );
      onImportInvoices(mapped);
      setToast(`${mapped.length} factura(s) de venta importadas`);
    } else {
      const mapped = eligibles.map((r) =>
        mapToReceivedInvoice(r.raw, {
          ownerId: activeOwner.id,
          proveedoresByNif,
        })
      );
      onImportReceived(mapped);
      setToast(`${mapped.length} factura(s) de compra importadas`);
    }
    setRows([]);
    setFileName('');
    setTimeout(() => setToast(''), 4000);
  };

  const renderPreviewRow = (r: PreviewRow, idx: number) => {
    const dim = r.isDuplicate || r.outOfYear;
    if (section === 'clientes' || section === 'proveedores') {
      return (
        <tr key={idx} className={dim ? 'opacity-50' : ''}>
          <td className="px-3 py-2 text-xs">{r.raw['Referencia']}</td>
          <td className="px-3 py-2 text-sm font-medium">
            {r.raw['Nombre jurídico'] || r.raw['Nombre']}
          </td>
          <td className="px-3 py-2 text-xs font-mono">{r.raw['CifNif']}</td>
          <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[260px]">
            {[r.raw['Localidad'], r.raw['Provincia']]
              .filter(Boolean)
              .join(', ')}
          </td>
          <td className="px-3 py-2">{renderFlag(r)}</td>
        </tr>
      );
    }
    if (section === 'ventas') {
      const base = num(r.raw['Total base']);
      const total = num(r.raw['Total importe']);
      return (
        <tr key={idx} className={dim ? 'opacity-50' : ''}>
          <td className="px-3 py-2 text-xs font-mono">{r.raw['Referencia']}</td>
          <td className="px-3 py-2 text-xs">{r.raw['Fecha']}</td>
          <td className="px-3 py-2 text-sm font-medium truncate max-w-[200px]">
            {r.raw['Cliente'] || r.raw['Nombre del cliente']}
          </td>
          <td className="px-3 py-2 text-right text-xs">{formatCurrency(base)}</td>
          <td className="px-3 py-2 text-right text-xs font-bold">
            {formatCurrency(total)}
          </td>
          <td className="px-3 py-2 text-xs">{r.raw['Estado']}</td>
          <td className="px-3 py-2">{renderFlag(r)}</td>
        </tr>
      );
    }
    const base = num(r.raw['Total base']);
    const imp = num(r.raw['Total impuestos']);
    const iva = inferIvaPct(base, imp);
    const total = num(r.raw['Total importe']);
    return (
      <tr key={idx} className={dim ? 'opacity-50' : ''}>
        <td className="px-3 py-2 text-xs font-mono">{r.raw['Referencia']}</td>
        <td className="px-3 py-2 text-xs">{r.raw['Fecha']}</td>
        <td className="px-3 py-2 text-sm font-medium truncate max-w-[200px]">
          {r.raw['Proveedor'] || r.raw['Nombre del proveedor']}
        </td>
        <td className="px-3 py-2 text-right text-xs">{formatCurrency(base)}</td>
        <td className="px-3 py-2 text-right text-xs">{iva}%</td>
        <td className="px-3 py-2 text-right text-xs font-bold">
          {formatCurrency(total)}
        </td>
        <td className="px-3 py-2 text-xs">{r.raw['Estado']}</td>
        <td className="px-3 py-2">{renderFlag(r)}</td>
      </tr>
    );
  };

  const renderFlag = (r: PreviewRow) => {
    if (r.isDuplicate) {
      return (
        <span
          title={r.reason}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold"
        >
          <AlertTriangle size={11} /> Duplicado
        </span>
      );
    }
    if (r.outOfYear) {
      return (
        <span
          title={`Fuera del año en curso (${currentYear})`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold"
        >
          <Info size={11} /> Otro año
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">
        <CheckCircle2 size={11} /> Listo
      </span>
    );
  };

  const headers = (() => {
    if (section === 'clientes' || section === 'proveedores') {
      return ['Ref.', 'Nombre', 'NIF', 'Ubicación', ''];
    }
    if (section === 'ventas') {
      return ['Nº', 'Fecha', 'Cliente', 'Base', 'Total', 'Estado', ''];
    }
    return ['Nº', 'Fecha', 'Proveedor', 'Base', 'IVA', 'Total', 'Estado', ''];
  })();

  const sectionMeta = SECTION_META[section];
  const Icon = sectionMeta.icon;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Importar de STEL Order</h3>
        <p className="text-sm text-gray-500">
          Los datos se asignan al titular <strong>{activeOwner.nombre}</strong>.
          Solo se importan filas no duplicadas.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.keys(SECTION_META) as Section[]).map((key) => {
          const meta = SECTION_META[key];
          const IconK = meta.icon;
          return (
            <button
              key={key}
              onClick={() => {
                setSection(key);
                setRows([]);
                setFileName('');
                setError('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                section === key
                  ? `${meta.tint} border-current`
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <IconK size={16} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <Card className={`${sectionMeta.tint}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon size={28} />
            <div>
              <p className="font-bold">{sectionMeta.label}</p>
              <p className="text-xs opacity-80">
                Sube el CSV exportado desde STEL Order (separador `;`, encoding
                Windows-1252)
              </p>
            </div>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border-2 border-current rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            {busy ? 'Leyendo...' : 'Subir CSV'}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>
        {fileName && (
          <p className="text-xs mt-3 font-mono opacity-80">📄 {fileName}</p>
        )}
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200 text-red-700">
          <p className="font-medium">{error}</p>
        </Card>
      )}

      {toast && (
        <Card className="bg-green-50 border-green-200 text-green-800">
          <p className="font-medium">{toast}</p>
        </Card>
      )}

      {(section === 'ventas' || section === 'compras') && rows.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyCurrentYear}
            onChange={(e) => setOnlyCurrentYear(e.target.checked)}
            className="w-4 h-4"
          />
          Solo importar facturas del año en curso ({currentYear})
        </label>
      )}

      {rows.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="text-sm">
              <span className="font-bold text-gray-900">{rows.length}</span>
              <span className="text-gray-500"> filas leídas · </span>
              <span className="font-bold text-green-700">{eligibles.length}</span>
              <span className="text-gray-500"> importables · </span>
              <span className="font-bold text-amber-700">
                {rows.length - eligibles.length}
              </span>
              <span className="text-gray-500"> omitidas</span>
            </div>
            <Button onClick={handleImport} disabled={eligibles.length === 0}>
              Importar {eligibles.length}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider sticky top-0">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows.map((r, i) => renderPreviewRow(r, i))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {rows.length === 0 && !error && (
        <Card className="bg-gray-50 border-2 border-dashed">
          <p className="text-sm text-gray-600">
            <strong>Notas sobre el mapeo:</strong>
          </p>
          <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc pl-5">
            <li>
              Las facturas de venta se importan con una línea agregada al 21%
              IVA. Si STEL Order marcó "Impuesto sobre el total = Sí", se
              activa IRPF al {15}% por defecto.
            </li>
            <li>
              En facturas de compra el % de IVA se infiere automáticamente del
              cociente impuestos / base (0, 4, 10 o 21%).
            </li>
            <li>
              La numeración se preserva (p. ej. JL00003 → serie "JL", número 3).
              Las facturas que crees después del import seguirán el correlativo.
            </li>
            <li>
              Cliente / proveedor se enlazan automáticamente por NIF si ya están
              creados en el sistema. Si no, queda el snapshot en la factura.
            </li>
          </ul>
        </Card>
      )}
    </div>
  );
};

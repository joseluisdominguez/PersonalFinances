import React from 'react';
import { X, Download, Edit2, FileText, Paperclip, Mail, MapPin, Banknote } from 'lucide-react';
import { Invoice, Owner, Client, InvoiceStatus } from '../../types';
import { Button, Card, Modal } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import {
  calcInvoiceTotals,
  calcLineBase,
  getInvoiceDisplayNumber,
} from './utils';
import { downloadAttachment } from './idb';

interface Props {
  invoice: Invoice;
  owner: Owner;
  cliente?: Client;
  onClose: () => void;
  onEdit: () => void;
  onDownloadPdf: () => void;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  pendiente: 'bg-amber-100 text-amber-800',
  vencida: 'bg-red-100 text-red-700',
  pagada: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  pagada: 'Pagada',
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const InvoiceDetail: React.FC<Props> = ({
  invoice,
  owner,
  cliente,
  onClose,
  onEdit,
  onDownloadPdf,
}) => {
  const totales = calcInvoiceTotals(
    invoice.lineas,
    invoice.aplicaIrpf,
    invoice.irpfPct
  );
  const numero = getInvoiceDisplayNumber(invoice);
  const snap = invoice.clienteSnapshot;
  const clienteNombre = snap?.nombre || cliente?.nombre || '—';
  const clienteNif = snap?.nif || cliente?.nif || '';
  const clienteDir = snap?.direccion || cliente?.direccion || '';
  const clienteEmail = cliente?.email;

  return (
    <Modal>
      <Card className="max-w-4xl w-full shadow-2xl border-none p-0 overflow-hidden bg-white">
        <div className="bg-gray-800 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{numero}</h3>
              <p className="text-xs text-white/70 mt-1">
                Emitida el {formatDate(invoice.fechaEmision)}
                {invoice.fechaVencimiento
                  ? ` · Vence ${formatDate(invoice.fechaVencimiento)}`
                  : ''}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${STATUS_STYLE[invoice.estado]}`}
            >
              {STATUS_LABEL[invoice.estado]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPdf}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gray-50 border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Emisor
              </p>
              <p className="font-bold text-gray-900">{owner.nombre}</p>
              <p className="text-sm text-gray-600">NIF: {owner.nif}</p>
              {owner.direccion && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin size={12} /> {owner.direccion}
                </p>
              )}
              {owner.email && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail size={12} /> {owner.email}
                </p>
              )}
              {owner.iban && (
                <p className="text-sm text-gray-600 flex items-center gap-1 font-mono">
                  <Banknote size={12} /> {owner.iban}
                </p>
              )}
            </Card>
            <Card className="bg-gray-50 border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Cliente
              </p>
              <p className="font-bold text-gray-900">{clienteNombre}</p>
              {clienteNif && <p className="text-sm text-gray-600">NIF: {clienteNif}</p>}
              {clienteDir && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin size={12} /> {clienteDir}
                </p>
              )}
              {clienteEmail && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail size={12} /> {clienteEmail}
                </p>
              )}
            </Card>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Líneas
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">IVA</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineas.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2 text-gray-900">{l.descripcion}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {l.cantidad}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCurrency(l.precioUnitario)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {l.ivaPct}%
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(calcLineBase(l))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {invoice.notas && (
                <Card className="bg-amber-50 border-amber-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                    Notas
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">
                    {invoice.notas}
                  </p>
                </Card>
              )}
              {invoice.adjuntos && invoice.adjuntos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                    <Paperclip size={12} /> Adjuntos
                  </p>
                  <ul className="space-y-2">
                    {invoice.adjuntos.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 border rounded-lg"
                      >
                        <FileText size={16} className="text-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {a.nombre}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                            {formatSize(a.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadAttachment(a.id, a.nombre)}
                          className="p-1.5 text-gray-400 hover:text-blue-600"
                          title="Descargar"
                        >
                          <Download size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {invoice.fechaCobro && (
                <Card className="bg-green-50 border-green-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">
                    Cobrada
                  </p>
                  <p className="text-sm text-green-900">
                    {formatDate(invoice.fechaCobro)}
                  </p>
                </Card>
              )}
            </div>

            <Card className="bg-gray-50 border">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base imponible</span>
                  <span className="font-medium">
                    {formatCurrency(totales.baseImponible)}
                  </span>
                </div>
                {Object.entries(totales.ivaDesglose)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([pct, { base, cuota }]) => (
                    <div key={pct} className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        IVA {pct}% s/ {formatCurrency(base)}
                      </span>
                      <span>{formatCurrency(cuota)}</span>
                    </div>
                  ))}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total IVA</span>
                  <span className="font-medium">
                    {formatCurrency(totales.totalIva)}
                  </span>
                </div>
                {invoice.aplicaIrpf && (
                  <div className="flex justify-between text-red-600">
                    <span>Retención IRPF ({invoice.irpfPct}%)</span>
                    <span className="font-medium">
                      -{formatCurrency(totales.totalIrpf)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 pt-3 mt-2 text-base border-blue-200">
                  <span className="font-bold">Total factura</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(totales.total)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={onDownloadPdf}>
              <Download size={16} /> Descargar PDF
            </Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

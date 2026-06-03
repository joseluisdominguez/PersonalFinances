import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { Invoice, Owner, Client } from '../../types';
import {
  calcInvoiceTotals,
  calcLineBase,
  getInvoiceDisplayNumber,
} from './utils';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '2 solid #1d4ed8',
    paddingBottom: 12,
  },
  brand: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  invoiceMeta: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  small: { fontSize: 9, color: '#6b7280' },
  section: { marginBottom: 18 },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  block: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 4,
  },
  blockTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    padding: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1 solid #e5e7eb',
  },
  colDesc: { flex: 4 },
  colNum: { flex: 1, textAlign: 'right' },
  totals: {
    marginTop: 16,
    marginLeft: 'auto',
    width: '50%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: { color: '#6b7280' },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '2 solid #1d4ed8',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTop: '1 solid #e5e7eb',
    fontSize: 8,
    color: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notes: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    fontSize: 9,
  },
});

const fmt = (n: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n);

const fmtDate = (s?: string): string =>
  s
    ? new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(s))
    : '—';

interface Props {
  invoice: Invoice;
  owner: Owner;
  cliente: Client | undefined;
}

export const InvoicePdf: React.FC<Props> = ({ invoice, owner, cliente }) => {
  const totales = calcInvoiceTotals(
    invoice.lineas,
    invoice.aplicaIrpf,
    invoice.irpfPct
  );
  const numero = getInvoiceDisplayNumber(invoice);
  const clienteSnap = invoice.clienteSnapshot;
  const clienteNombre = clienteSnap?.nombre || cliente?.nombre || '—';
  const clienteNif = clienteSnap?.nif || cliente?.nif || '';
  const clienteDir = clienteSnap?.direccion || cliente?.direccion || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FACTURA</Text>
            <Text style={styles.small}>{owner.nombre}</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceNumber}>{numero}</Text>
            <Text style={styles.small}>
              Emisión: {fmtDate(invoice.fechaEmision)}
            </Text>
            <Text style={styles.small}>
              Vencimiento: {fmtDate(invoice.fechaVencimiento)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Emisor</Text>
              <Text style={styles.partyName}>{owner.nombre}</Text>
              <Text>NIF: {owner.nif}</Text>
              {owner.direccion ? <Text>{owner.direccion}</Text> : null}
              {owner.email ? <Text>{owner.email}</Text> : null}
            </View>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Cliente</Text>
              <Text style={styles.partyName}>{clienteNombre}</Text>
              <Text>NIF: {clienteNif}</Text>
              {clienteDir ? <Text>{clienteDir}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Descripción</Text>
            <Text style={styles.colNum}>Cant.</Text>
            <Text style={styles.colNum}>Precio</Text>
            <Text style={styles.colNum}>IVA</Text>
            <Text style={styles.colNum}>Importe</Text>
          </View>
          {invoice.lineas.map((l) => (
            <View key={l.id} style={styles.tableRow}>
              <Text style={styles.colDesc}>{l.descripcion}</Text>
              <Text style={styles.colNum}>{l.cantidad}</Text>
              <Text style={styles.colNum}>{fmt(l.precioUnitario)}</Text>
              <Text style={styles.colNum}>{l.ivaPct}%</Text>
              <Text style={styles.colNum}>{fmt(calcLineBase(l))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Base imponible</Text>
            <Text>{fmt(totales.baseImponible)}</Text>
          </View>
          {Object.entries(totales.ivaDesglose)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([pct, { base, cuota }]) => (
              <View key={pct} style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  IVA {pct}% s/ {fmt(base)}
                </Text>
                <Text>{fmt(cuota)}</Text>
              </View>
            ))}
          {invoice.aplicaIrpf ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Retención IRPF ({invoice.irpfPct}%)
              </Text>
              <Text>-{fmt(totales.totalIrpf)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{fmt(totales.total)}</Text>
          </View>
        </View>

        {invoice.notas ? (
          <View style={styles.notes}>
            <Text>{invoice.notas}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>{owner.iban ? `Pago a IBAN: ${owner.iban}` : ''}</Text>
          <Text>{owner.nombre} · NIF {owner.nif}</Text>
        </View>
      </Page>
    </Document>
  );
};

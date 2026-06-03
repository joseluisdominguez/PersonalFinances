# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto del Proyecto
Proyecto para finanzas personales con 5 secciones principales.
- Movimientos: Permitiendo filtrar por mes, permite añadir, ver y filtrar los movimientos categorizando por Gastos / Ingreso.
- Recurrentes: Configuración de movimientos recurrentes para que en la vista de movimientos, al empezar un mes por ejemplo, pueda añadirse.
- Balances: Balance de cada cuenta bancaria permitiendo ver el total de las cuentas mes a mes.
- Inversiones: Estado global de las inversiones permitiendo filtrar por año.
- Autónomo: Facturación y fiscalidad para varios titulares (clientes, proveedores, facturas emitidas/recibidas, PDF, modelos 303 y 130).

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build to dist/
npm run preview   # Preview the production build
```

No linting, formatting, or test commands are configured.

## Architecture

This is a fully client-side personal finance app (React 19 + Vite + TypeScript). There is no backend — all state is persisted to `localStorage` under the key `finanzas_app_data`.

**State management**: Centralized in `App.tsx` via `useState`. All views receive data and callbacks as props — no global state library.

**Data flow**: `App.tsx` loads from localStorage (or falls back to mock data), passes slices of `AppData` down to view components, and provides `onSave`/`onDelete` callbacks that update state and re-persist to localStorage.

### Core types (`types.ts`)

```
AppData
├── movimientos: Transaction[]           # Individual income/expense entries
├── recurrentes: RecurringTransaction[]  # Recurring payment templates
├── balances: Balance[]                  # Monthly bank account balances
├── inversiones: Investment[]            # Investment portfolio entries
├── config: AppConfig                    # User-defined categories and banks
├── owners: Owner[]                      # Autónomos (titulares fiscales)
├── clientes: Client[]                   # Clientes por titular
├── facturas: Invoice[]                  # Facturas emitidas
├── proveedores: Supplier[]              # Proveedores por titular
├── facturasRecibidas: ReceivedInvoice[] # Facturas de compra/gasto
└── activeOwnerId?: string               # Titular activo para el módulo Autónomo
```

`Transaction` supports accrual accounting via `fechaInicioDevengo`/`fechaFinDevengo` fields and an `amortizacion` flag for spreading costs over periods.

Los binarios de los adjuntos (`Attachment[]` en `Invoice` y `ReceivedInvoice`) viven en IndexedDB; en `AppData` solo se persisten los metadatos (`id`, `nombre`, `mime`, `size`). El backup se exporta como **ZIP** (`finanzas_backup_AAAA-MM-DD.zip`) con estructura `data.json` + carpeta `attachments/<id>` para los binarios. El import acepta `.zip` (formato actual) y `.json` (compatibilidad con backups antiguos sin adjuntos). Al importar reemplazando se hace `clearAttachments()` antes de reescribir IDB para evitar referencias huérfanas. Implementado con `jszip` en `App.tsx`.

### Views (`components/`)

| File | Purpose |
|------|---------|
| `TransactionsView.tsx` | Income/expense entry, list/grouped/chart views, filters, sorting, amortization |
| `BalanceView.tsx` | Monthly bank balance entry per account with area charts |
| `InvestmentsView.tsx` | Portfolio tracking with multiple investment types and payment history |
| `RecurringView.tsx` | Recurring expense templates with frequency and monthly burn calculation |
| `ConfigView.tsx` | Add/remove categories (with colors) and banks |
| `ui.tsx` | Shared primitives: `Card`, `Button`, `Input`, `TextArea`, `Select`, `ConfirmDialog` |

### Módulo Autónomo (`components/autonomo/`)

| File | Purpose |
|------|---------|
| `AutonomoView.tsx` | Contenedor: selector global de titular activo + sub-nav (Analítica · Facturas · Compras · Clientes · Proveedores · Titulares). Si no hay titulares, muestra empty state + `OwnersView`. |
| `OwnersView.tsx` | CRUD de titulares (datos fiscales del emisor: nombre, NIF, dirección, IBAN, serie de facturas, IRPF por defecto). |
| `ClientsView.tsx` | CRUD de clientes filtrados por titular activo. Buscador por nombre / NIF / email. |
| `SuppliersView.tsx` | CRUD de proveedores filtrados por titular activo. |
| `InvoicesView.tsx` | Listado de facturas emitidas. Filtros: buscador libre (número, cliente, notas) + año + trimestre + pills por estado. Columnas ordenables (número, fecha, cliente, total) con default número desc. Acciones por fila: clonar como borrador, descargar PDF (dynamic import), editar, eliminar. La fila entera abre el detalle; los controles activos (`<select>` de estado, botones) llevan `stopPropagation`. Marca como `vencida` automáticamente al renderizar si la fecha de vencimiento ha pasado. |
| `InvoiceEditor.tsx` | Editor de factura emitida: numeración automática `Serie-Año-NNNN`, líneas dinámicas con IVA por línea, switch IRPF (default desde cliente o titular), snapshot fiscal del cliente embebido, adjuntos. |
| `InvoiceDetail.tsx` | Vista de detalle (solo lectura) de factura emitida. Cabecera con número + estado, bloques emisor / cliente, tabla de líneas, notas, adjuntos descargables, totales. Acciones: editar (cierra detalle y abre editor) y descargar PDF. |
| `ReceivedInvoicesView.tsx` | Listado de facturas recibidas. Mismos filtros (buscador por número / proveedor / categoría / notas, año, trimestre, estado) y patrón de ordenación que las emitidas. Default sort: fecha desc. Fila entera clicable abre detalle. |
| `ReceivedInvoiceEditor.tsx` | Editor de factura recibida: líneas (base + IVA), retención IRPF a nivel factura, categoría libre, adjuntos. |
| `ReceivedInvoiceDetail.tsx` | Vista de detalle (solo lectura) de factura recibida. Bloques proveedor / receptor, líneas con cuota IVA por línea, totales con IVA soportado, notas y adjuntos. |
| `AnalyticsView.tsx` | Selector año/trimestre. 4 KPIs (ingresos, gastos, IVA a ingresar/devolver, IRPF retenido). Modelo 303 con desglose por tipo de IVA y resultado. Modelo 130 con casillas 01-03-04-06 y resultado (20% × rendimiento neto − retenciones soportadas). Las facturas en `borrador` no computan fiscalmente. |
| `InvoicePdf.tsx` | Plantilla A4 con `@react-pdf/renderer`. Se carga vía dynamic import para no inflar el bundle inicial. |
| `AttachmentsField.tsx` | Componente reutilizable: subir / listar / descargar / eliminar adjuntos. Soporta drag & drop nativo (con indicador visual) y click. Implementado con un único contenedor clicable (NO `<label>` envolviendo el input) para evitar el doble disparo del selector de archivos en macOS. Binarios en IndexedDB. |
| `idb.ts` | Wrapper minimalista de IndexedDB (`putAttachment`, `getAttachment`, `deleteAttachment`, `downloadAttachment`, `clearAttachments`). DB `finanzas_autonomo`, object store `attachments`. |
| `utils.ts` | Cálculos: `calcInvoiceTotals`, `calcReceivedInvoiceTotals`, `getNextInvoiceNumber`, `formatInvoiceNumber`, `isInvoiceOverdue`, `filterByYearQuarter`, `getQuarter`. Validación: `isValidIban` (ISO 13616 mod-97), `formatIban`, `normalizeIban`. Constantes `IVA_RATES` y `DEFAULT_IRPF_PCT`. |

Convenciones del módulo:
- Todas las entidades del módulo se aíslan por `ownerId`. El selector de titular activo está siempre en la cabecera del módulo.
- Numeración secuencial por owner + serie + año. La acción "Clonar" reusa la lógica de `getNextInvoiceNumber` para asignar el siguiente correlativo del año actual, resetea estado a `borrador`, vacía adjuntos y `clienteSnapshot`, y conserva el delta de días entre emisión y vencimiento.
- Snapshot fiscal del cliente embebido en cada factura emitida → editar al cliente no afecta facturas históricas.
- IBAN del titular: validación opcional (campo vacío = válido). Si tiene contenido, debe pasar el check ISO 13616 mod-97. En blur, se reformatea automáticamente con espacios cada 4 caracteres y ese formato es el que se guarda y se imprime en el PDF.
- Modelo 303 = IVA repercutido (ventas) − IVA soportado (compras). Negativo → "A devolver".
- Modelo 130 = 20% × (ingresos base − gastos base) − retenciones IRPF soportadas en ventas. Cálculo simplificado, con disclaimer visible.
- Listados de facturas (ventas y compras): orden de filtros consistente — buscador libre → año → trimestre → pills de estado. Trimestre se deshabilita cuando el año es "todos". Defaults: `filterYear='todos'`, `filterQuarter='todo'`, `filterStatus='todas'`.
- Patrón de fila clicable en tablas: `<tr onClick>` abre el detalle. Cualquier `<td>` que contenga controles interactivos (`<select>`, `<button>`) debe envolverse con `onClick={(e) => e.stopPropagation()}` a nivel `<td>` para no disparar el detalle.

### Utilities (`utils.ts`)

- `formatCurrency()` — EUR formatting
- `formatDate()` — Spanish locale (es-ES)
- `generateId()` — timestamp + random suffix
- `getMonthName()` — Spanish month names

## Key conventions

- All UI text is in Spanish.
- Tailwind CSS is loaded via CDN (`index.html`), not installed as a package — no purging or custom config.
- Path alias `@/*` resolves to the project root (configured in `vite.config.ts`).
- Node version is pinned to v22 (`.nvmrc`).
- Heavy dependencies (`@react-pdf/renderer`) are loaded via `import()` dynamic import so they only land in the user's browser when the feature is invoked. `jszip` se incluye en el bundle principal por ser usada por el botón Export/Import del header.
- IndexedDB is reserved for binary attachments. `localStorage` keeps the structured `AppData` JSON.
- Botones `Button` (`ui.tsx`) usan `inline-flex` para respetar `text-center` del contenedor padre — no usar `flex`.
- `Input` (`ui.tsx`) acepta prop `error?: string`: cuando hay error, el border pasa a rojo y se imprime el mensaje debajo. Patrón reutilizable para cualquier validación inline.
- Deploy: GitHub Pages. `npm run build` + push. Toda la BD vive en el navegador del usuario — el deploy es estático puro.

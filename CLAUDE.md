# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto del Proyecto
Proyecto para finanzas personales con 4 secciones principales.
- Movimientos: Permitiendo filtrar por mes, permite añadir, ver y filtrar los movimientos categorizando por Gastos / Ingreso.
- Recurrentes: Configuración de movimientos recurrentes para que en la vista de movimientos, al empezar un mes por ejemplo, pueda añadirse.
- Balances: Balance de cada cuenta bancaria permitiendo ver el total de las cuentas mes a mes.
- Inversiones: Estado global de las inversiones permitiendo filtrar por año.

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
└── config: AppConfig                    # User-defined categories and banks
```

`Transaction` supports accrual accounting via `fechaInicioDevengo`/`fechaFinDevengo` fields and an `amortizacion` flag for spreading costs over periods.

### Views (`components/`)

| File | Purpose |
|------|---------|
| `TransactionsView.tsx` | Income/expense entry, list/grouped/chart views, filters, sorting, amortization |
| `BalanceView.tsx` | Monthly bank balance entry per account with area charts |
| `InvestmentsView.tsx` | Portfolio tracking with multiple investment types and payment history |
| `RecurringView.tsx` | Recurring expense templates with frequency and monthly burn calculation |
| `ConfigView.tsx` | Add/remove categories (with colors) and banks |
| `ui.tsx` | Shared primitives: `Card`, `Button`, `Input`, `TextArea`, `Select`, `ConfirmDialog` |

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

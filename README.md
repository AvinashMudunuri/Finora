# Finora

Your financial life, clearly connected.

Finora is a personal finance application. This repository is the product. Product requirements live in [`docs/product/PRD.md`](docs/product/PRD.md); this README only describes the current implementation.

## Current scope

The app shows the existing dashboard: net worth as assets minus liabilities, an asset breakdown (bank, cash, investment, and liquid bank+cash), card liabilities, monthly income/spending/savings, accounts, recent transactions, and account filtering. A dedicated Accounts view lists each account’s name, type, stored balance, and currency, and shows the transactions linked to a selected account. A dedicated Cards view lists each card’s balance, limit, available credit, utilization, due date, and payment status, and shows the transactions linked to a selected card. A dedicated Transactions view lists every financial event with its date, amount, event type, and account/card context, and lets a user inspect one transaction at a time. A dedicated Spending view shows monthly income, spending, and savings for an explicit selected month, plus the income and spending transactions behind those totals.

The first domain slice now includes:

- **Account** — bank, cash, and investment positions
- **Card** — first-class credit cards, not account subtypes
- **Transaction** — income, expense, transfer, card purchase, card payment, and investment events

Balances live on the account or card they belong to. The dashboard now calculates:

- **Net worth** = bank + cash + investment − card outstanding balances
- **Asset breakdown** = bank, cash, and investment totals from stored account balances
- **Liquid assets** = bank + cash, excluding investment
- **Card utilization** = outstanding balance / credit limit
- **Monthly spending** = expenses + card purchases in the selected month
- **Monthly income** = income events in the selected month
- **Monthly savings** = monthly income − monthly spending

Income, transfers, card payments, and investment events are not spending. Credit limits are not assets or liabilities. These calculations assume the fixture snapshot is a single currency (USD) and do not convert FX.

Accounts and Cards are persisted through the same local Node HTTP process.

- Accounts: `GET|POST /api/accounts`, `PUT /api/accounts/:id` → `data/accounts.json` or `FINORA_ACCOUNT_STORE`
- Cards: `GET|POST /api/cards`, `PUT /api/cards/:id` → `data/cards.json` or `FINORA_CARD_STORE`
- Transactions: `GET /api/transactions` → `data/transactions.json` or `FINORA_TRANSACTION_STORE`

The backend reuses the existing Account, Card, and Transaction domain models and validation; it does not introduce a second financial model. Available credit is always `creditLimit - outstandingBalance`. The existing Transactions UI is read-only, so the Transactions API is GET-only. Missing transaction files seed the existing fixture dataset. There is no managed-transaction localStorage overlay.

A previous combined ledger (`finora.managed-ledger.v1`) can push local Account edits into an unused fixture-seeded backend once. Managed Cards (`finora.managed-cards.v1`, or leftover ledger cards) can push local Card edits into an unused fixture-seeded backend once. After those handoffs, localStorage is no longer the production source of truth for Accounts or Cards.

### Transactions API

| Method | Path | Success | Failure |
| --- | --- | --- | --- |
| GET | `/api/transactions` | `{ "transactions": [...] }` newest date first, then transaction ID descending | `500 { "kind": "unavailable", "error": "Transactions are temporarily unavailable." }` |

The Transactions product does not support create/edit, so POST/PUT are not provided. Responses never include filesystem paths or stack traces.

### Cards API

| Method | Path | Success | Failure |
| --- | --- | --- | --- |
| GET | `/api/cards` | `{ "cards": [...] }` | `500 { "kind": "unavailable", "error": "Cards are temporarily unavailable." }` |
| POST | `/api/cards` | `{ "card": {...} }` | `400 { "kind": "validation", "errors": { ... } }` |
| PUT | `/api/cards/:id` | `{ "card": {...} }` | `400` validation, `404 { "kind": "not_found", "error": "That card no longer exists." }`, or `500` unavailable |

POST/PUT accept the existing Card draft fields: `name`, `issuer`, `creditLimit`, `outstandingBalance`, `statementPeriodEnd`, `paymentDueDate`, `minimumPayment`, `paymentStatus`. Client-provided `availableCredit` is ignored. Validation errors are a field map, not an array. Responses never include filesystem paths or stack traces.

There is no authentication, bank connection, or cloud database. `e2e-*` Vite modes and unit tests keep the previous in-process fixture/local ledger path so those suites stay deterministic. The production build remains a Progressive Web App: it ships a web app manifest and a service worker, and `/api/accounts`, `/api/cards`, and `/api/transactions` are network-only.

## Unresolved product decisions

These stay open, as in the PRD:

- Geography — fixtures use USD as development data only
- Checking vs savings — both are `bank` accounts until the PRD decides otherwise
- Investment depth beyond a single current value
- Card utilization thresholds, rewards, and lifecycle rules
- Transaction categorization beyond explicit event types
- Manual / imported / live-connected data

## Local development

```bash
npm install
npm run dev
```

Preview the installable build with `npm run build && npm run preview`. That preview process also hosts the Account, Card, and Transaction APIs. `npm run server` serves `dist/` plus the same APIs from a standalone Node HTTP process.

## Testing, typecheck, lint, and build

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Technology

TypeScript, React, Vite, Vitest, and standard CSS.

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

All numbers come from **deterministic local fixture data**. Relationships are validated on load. There is no backend, bank connection, or live account sync. The production build is a Progressive Web App: it ships a web app manifest and a service worker so the fixture-backed app shell can be installed and opened offline.

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

Preview the installable build with `npm run build && npm run preview`.

## Testing, typecheck, lint, and build

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Technology

TypeScript, React, Vite, Vitest, and standard CSS.

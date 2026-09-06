# Finora

Your financial life, clearly connected.

Finora is a personal finance application. This repository is the product. Product requirements live in the Finora PRD; this README only describes the current implementation.

## Current scope

The app shows the existing dashboard: overview, accounts, recent transactions, and account filtering. A dedicated Cards view lists each card’s balance, limit, available credit, utilization, due date, and payment status, and shows the transactions linked to a selected card.

The first domain slice now includes:

- **Account** — bank, cash, and investment positions
- **Card** — first-class credit cards, not account subtypes
- **Transaction** — income, expense, transfer, card purchase, card payment, and investment events

Balances live on the account or card they belong to. The dashboard now calculates:

- **Net worth** = bank + cash + investment − card outstanding balances
- **Card utilization** = outstanding balance / credit limit
- **Monthly spending** = expenses + card purchases in the selected month

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

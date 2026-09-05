# Finora

Your financial life, clearly connected.

Finora is a personal finance application. This repository is the product. Product requirements live in the Finora PRD; this README only describes the current implementation.

## Current scope

The app still shows the existing basic dashboard: overview, accounts, recent transactions, and account filtering.

The first domain slice now includes:

- **Account** — bank, cash, and investment positions
- **Card** — first-class credit cards, not account subtypes
- **Transaction** — income, expense, transfer, card purchase, card payment, and investment events

Balances live on the account or card they belong to. Overview cash and net figures still use the existing dashboard math (bank + cash, minus card amounts owed). They are not a net-worth engine.

All numbers come from **deterministic local fixture data**. Relationships are validated on load. There is no backend, bank connection, or live account sync.

## Unresolved product decisions

These stay open, as in the PRD:

- Geography — fixtures use USD as development data only
- Checking vs savings — both are `bank` accounts until the PRD decides otherwise
- Investment depth and net worth — investment value is stored but not folded into overview totals
- Card utilization, rewards, and lifecycle rules
- Transaction categorization beyond explicit event types
- Manual / imported / live-connected data

## Local development

```bash
npm install
npm run dev
```

## Testing, typecheck, lint, and build

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Technology

TypeScript, React, Vite, Vitest, and standard CSS.

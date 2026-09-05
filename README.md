# Finora

Your financial life, clearly connected.

Finora is a personal finance application. This repository is the product.

## Current functionality

The first usable slice is a dashboard that shows:

- A net balance across the available accounts
- Checking, savings, and credit card accounts with balances
- Recent transactions
- Filtering of those transactions by account

Credit card balances are treated as amounts owed. They reduce the net total instead of being added to cash.

All numbers come from **deterministic local fixture data**. There is no backend, bank connection, or live account sync.

## Technology

- TypeScript
- React
- Vite
- Vitest
- Standard CSS

## Local development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Typecheck, lint, and production build

```bash
npm run typecheck
npm run lint
npm run build
```

## Current limitations

- Balances and transactions are static fixtures. They are not imported from a bank and are not recalculated from each other.
- Only the dashboard slice exists. Accounts and transactions cannot be created, edited, or connected yet.
- There is no authentication, persistence, or multi-user support.

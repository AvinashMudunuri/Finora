# Architecture evidence (HEAD 6c9160b)

## Layers

```
UI (src/app/App.tsx, src/components/*, src/main.tsx)
  → HTTP Gateway (src/infrastructure/{accounts,cards,transactions}/http*Gateway.ts)
      → HTTP (server/{account,card,transaction}Http.ts)
          → Application service (src/application/*/service.ts)
              → Domain (src/domain/{types,validate,calculations,finance,insights}.ts)
              → Persistence port (src/application/*/port.ts)
                  → JSON store (server/jsonFile*Store.ts)
```

Composition root: `server/accountRuntime.ts` + `server/vitePlugin.ts` + `server/standalone.ts`.
Frontend composition: `src/main.tsx` selects gateways via `uses*Backend()`.

## Dependency direction (inspected)

- `src/domain` has no `node:`, `fs`, `fetch`, or HTTP imports.
- `src/application` has no infrastructure/server imports.
- Stores implement application ports and call `assertValidFinanceData`.
- HTTP adapters call application services; they do not reimplement money math.
- UI imports domain `createAccount`/`createCard`/`updateAccount`/`updateCard` for
  optimistic local validation, then HTTP gateways for persistence.

## Composition

`createAccountDependencies(storePath)` wires `JsonFileAccountStore` plus
**fixture** cards and transactions — not the live card/transaction stores.

`createCardDependencies(storePath)` wires `JsonFileCardStore` plus
**fixture** accounts and transactions.

`createTransactionDependencies(storePath)` wires only `JsonFileTransactionStore`.

Default paths (`process.cwd()` + env override):

- `FINORA_ACCOUNT_STORE` → `data/accounts.json`
- `FINORA_CARD_STORE` → `data/cards.json`
- `FINORA_TRANSACTION_STORE` → `data/transactions.json`

Standalone also uses `FINORA_ACCOUNT_HOST`, `FINORA_ACCOUNT_PORT`, `FINORA_STATIC_DIR`.

## Frontend gateway selection

`usesAccountBackend` / `usesCardBackend` / `usesTransactionBackend`:
`false` when `import.meta.env.MODE` is `test` or starts with `e2e-`.

## Hidden process state

- Store file paths from `process.env` / cwd.
- Vite mode from `import.meta.env.MODE`.
- One-time migration flags in localStorage.
- In-memory React state after optimistic apply.

No circular imports observed between domain, application, and server.

# Persistence evidence (HEAD 6c9160b)

## Stores

| Entity | File | Store class | Version const | Env |
|---|---|---|---|---|
| Accounts | `data/accounts.json` | `JsonFileAccountStore` | `ACCOUNT_STORE_VERSION = 1` | `FINORA_ACCOUNT_STORE` |
| Cards | `data/cards.json` | `JsonFileCardStore` | `CARD_STORE_VERSION = 1` | `FINORA_CARD_STORE` |
| Transactions | `data/transactions.json` | `JsonFileTransactionStore` | `TRANSACTION_STORE_VERSION = 1` | `FINORA_TRANSACTION_STORE` |

Envelope: `{ version: 1, <entities>: [...] }`.

## Write path

All three stores:

1. `mkdirSync(dirname(filePath), { recursive: true })`
2. `writeFileSync(filePath, JSON.stringify(...) + "\n", "utf8")`

There is no temp-file + `renameSync`. A crash mid-write can leave a truncated file.
The next read treats malformed JSON as `*StoreError` → HTTP 500 `unavailable`.
Missing file seeds from fixtures on first `list()`.

Error types (`AccountStoreError`, `CardStoreError`, `TransactionStoreError`)
do not include filesystem paths.

## Validation at persist

Each store calls `assertValidFinanceData` with **the live entity array being
written** and **fixture counterparts** for the other two entities.

Consequence: a newly created account is not visible to the card or transaction
store's referential checks. Acceptable today because transactions are GET-only
and no product operation writes two stores in one request.

## Isolation

Tests use `mkdtempSync` store paths. Runtime uses cwd/env paths.
No file lock. Concurrent Node processes or overlapping requests last-write-win
the entire entity array.

## Source of truth

Production-like modes (dev / preview / standalone, `MODE` not `test`/`e2e-*`):
backend JSON files.

`test` and `e2e-*`: in-process fixtures / localStorage managed ledger.
One-time migrations retire `finora.managed-ledger.v1` and
`finora.managed-cards.v1` after a skip-or-push decision.

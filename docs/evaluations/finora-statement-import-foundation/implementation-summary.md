# Implementation summary

Finora remains a consumer-owned statement cockpit. This slice adds an import pipeline without a second financial model.

## Seam

Demo fixtures stay in `src/data/fixtures.ts` and the existing HTTP JSON stores.

Confirmed imports write `finora.user-ledger.v1` in `localStorage`. App can show **imported** or **demo** data. The two ledgers are never merged.

## Pipeline

`StatementExtractor` (`csv` | `pdf` now; `xlsx` | `ofx` reserved):

detect → extract → classify → reconcile → fingerprint → preview → user confirm → persist → existing `Account` / `Card` / `Transaction` → existing calculations → six surfaces.

## Domain

`TransactionEventType` gained `unknown` (needs review). Calculations were not rewritten. `unknown` is excluded from income and spending because those formulas still key off `income` and `expense`/`card_purchase` only.

Transfers stay `transfer` in preview. Persist does not invent a counterparty; without an explicit funding/counterparty account the row becomes `unknown` so it cannot inflate income or spending.

Card create from a statement requires outstanding, minimum payment, due date, period end, payment status, and a user-entered credit limit. None of those are invented.

## UI

Import lives on Transactions. Statement history is a list on that same panel, not a seventh destination.

## Out of this slice

XLSX, OFX/QFX, OCR, bank aggregation, auth, multi-user, cloud sync, new destinations, new insight kinds, new formulas.

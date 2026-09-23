# Requirement → evidence

| # | Requirement | Evidence |
| --- | --- | --- |
| 1–2 | Select CSV / text PDF | `StatementImport` file input; `detectExtractor`; App test upload; browser CSV upload |
| 3–7 | Parse, preview, review, warn, confirm | `previewImport` + review table; App test; browser preview → review → import |
| 8 | Duplicates | `duplicates.test.ts`; persist rejects same file |
| 9–12 | Accounts / Transactions / Spending / Dashboard | Overlay `shown*` in `App.tsx`; App test + browser after import |
| 13–14 | Card statement + min/due/outstanding | `pdf.test.ts`; `service.test.ts` card persist; no invented min payment |
| 15 | Multiple accounts | User ledger appends distinct accounts |
| 16 | Transfers not income/spending | `classify.test.ts`; Spending after import still $87.42 |
| 17 | Existing calculations | `calculations.test.ts` fixture totals unchanged; `isSpendingEvent` untouched |
| 18 | Demo isolated | `finora.user-ledger.v1`; Show demo data |
| 19 | No aggregation | No Plaid/Yodlee/etc. in source |
| 20 | Tests | 439 passed |
| 21 | typecheck / lint / build / PWA | all passed; `generateSW` 32 entries |
| 22 | Browser 320–1440 | `evidence/overflow-evidence.json` |

Extractor interface reserves `xlsx` and `ofx` without implementing them.

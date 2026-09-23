# Statement import foundation — architecture

Inspected `origin/main` `7f3f780`. Implementation follows this seam. No bank aggregation.

## How data enters today

| Mode | Source |
| --- | --- |
| `test` / `e2e-*` | `src/data/fixtures.ts` in process |
| `development` / `production` | HTTP → JSON files seeded from those fixtures |

`App.tsx` holds `accounts`, `cards`, `transactions`. Domain calculations read those arrays only. That is the persist target after confirm.

## Seam

Do **not** write imports into `fixtures.ts` or `data/*.json`.

```
File (CSV | text PDF)
  → StatementExtractor
  → ExtractedStatement
  → normalize / classify / reconcile / fingerprint
  → preview (no persist)
  → user confirm
  → finora.user-ledger.v1 (localStorage)
  → App uses user ledger instead of demo fixtures
  → existing calculations + six surfaces
```

Demo fixtures stay the default and the test oracle. After the first confirmed import, the UI can show **My data** (user ledger) or **Demo data** (fixtures). They are never merged.

## Extractor interface (XLSX / OFX later)

```ts
type StatementExtractor = {
  kind: "csv" | "pdf" | "xlsx" | "ofx";
  canHandle(file: File): boolean;
  extract(file: File): Promise<ExtractedStatement>;
};
```

This slice implements `csv` and `pdf`. XLSX/OFX are not implemented.

## Canonical write

Persisted `Transaction` stays the existing type, plus:

- `source: "import"`
- `sourceFileId`
- `eventType` may be `unknown` (needs review)

`unknown` is **excluded** from income, spending, and savings (`isSpendingEvent` stays expense + card_purchase; income stays `income` only; `netWorthImpact` already returns 0 for other types).

`direction` (credit/debit) lives on the extracted line and preview. Calculations keep using existing event-type rules, not debit/credit.

## Statement record

Stored separately from transactions. Masked account only. No full PAN.

## Identification

Match existing user-ledger account/card by institution + masked tail + type. If 0 matches, confirm creates one from statement metadata. If 2+, user must pick. Card credit limit is not invented; if the statement omits it, the user must enter it before confirm.

## Currency

Fixtures remain USD. User ledger is single-currency (first imported statement). No FX. `formatCurrency` already takes an ISO code.

## Out of this slice

Auth, multi-user, cloud DB, OCR, aggregation, new destinations, new insight kinds, calculation rewrites.

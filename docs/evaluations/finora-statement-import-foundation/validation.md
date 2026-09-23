# Validation — statement import foundation

HEAD: uncommitted work on `aaep/finora-statement-import` (baseline `origin/main` `7f3f780`).

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 46 files, **439 passed** |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed; CSS 16.66 kB; JS 322.75 kB; PWA `generateSW` 32 entries (996.56 KiB) |

## Financial regression (demo fixtures, unchanged)

- Net worth `$23,168.43`
- Assets `$25,337.02`
- Liabilities `$2,168.59`
- Investment `$8,420.55`
- Monthly income `$3,200.00`
- Monthly spending `$87.42`

Fixture arrays are not written by import. After import, the UI can switch back to those totals via **Show demo data**.

## Browser (preview `:4175`, after SW unregister)

CSV `hdfc-savings.csv` → preview (3 transactions) → review → import.

| Check | Result |
| --- | --- |
| Transactions shows imported rows | Payroll — Imported Co; 3 transactions |
| Accounts shows imported account | Imported account · Bank |
| Spending | $87.42 (transfer excluded) |
| Dashboard | uses imported ledger; six destinations remain |
| Mobile menu @375 | Open menu → Transactions; import panel visible |
| Overflow 320–1440 | no content horizontal overflow |

Stale service worker from an earlier preview on the same port served an old bundle until unregistered. That is an evaluation-environment issue, not an import defect.

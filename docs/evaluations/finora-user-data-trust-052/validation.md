# Validation — User Data Trust & Import Review

HEAD: `4817ea4` (`Add CSV and text-PDF statement import without mixing demo fixtures`) on `aaep/finora-statement-import`.

Product source was not changed in this review. `docs/evaluations/finora-user-data-trust-052/` is the only intended add.

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 46 files, **439 passed** |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` (after e2e; production restored) | passed; CSS 16.66 kB; JS 322.75 kB |
| PWA | `generateSW` **32 entries** (996.56 KiB) |
| `build:e2e-all-current` | passed (overwrites `dist/`) |
| `build:e2e-overdue` | passed |
| `build:e2e-nw-decreased` | passed |
| `build:e2e-nw-unchanged` | passed |
| `build:e2e-high-util` | passed → `dist-e2e-high-util` |
| `build:e2e-no-attention` | passed → `dist-e2e-no-attention` |

e2e modes that write `dist/` leave a fixture bundle. Production `npm run build` was run again before browser review.

## Financial regression (demo fixtures)

Unchanged in tests and on Dashboard before import:

- Net worth `$23,168.43`
- Assets `$25,337.02`
- Liabilities `$2,168.59`
- Investment `$8,420.55`
- Monthly income `$3,200.00`
- Monthly spending `$87.42`

After HDFC CSV confirm, imported surfaces (August 2026):

- Income `$3,200.00`
- Spending `$87.42` (Whole Foods; NEFT excluded)
- Savings `$3,112.58`
- Account-funded `$87.42` · card purchases `$0.00`
- Net worth `-$23,087.42` (imported account closing / last running balance)
- Card payment: “No stored card payment is due.”

**Show demo data** restored 15 fixture transactions including Payroll — Acme Corp. User ledger remained in `localStorage`.

## Browser (`http://127.0.0.1:4175/`, SW unregistered, `localStorage` cleared)

| Step | Result |
| --- | --- |
| Transactions import entry | Present. Copy claims nothing is stored until confirm. |
| CSV `hdfc-savings.csv` | Preview: 3 found · income/spending/transfers · 3 new |
| Review | Inspect table. Transfer on NEFT. No editors. |
| Confirm | 3 imported rows. History **Needs review**. File name hidden. |
| Accounts | `Imported account` `-$23,087.42` |
| Cards | Empty (bank file) |
| Spending / Dashboard | Existing formula identities; see above |
| Re-import same file | `0 new · 3 already imported`; Create still selected; button **Import 0 new transactions** |
| Cancel / Back | Wizard reset on first path; mappings not written (auto-detect) |
| Overflow 320–1440 | Page `contentOverflowX` 0. Review table scrolls inside `.history-table-wrap` |
| Mobile 320 / 375 | Open menu present; import heading present; table needs horizontal scroll |

Stale service worker on `:4175` was unregistered before this pass.

## Probes (no product change)

- `evidence/payment-status-probe.json` — due-date collision
- `evidence/duplicate-create-path.json` — same file name
- `evidence/duplicate-renamed-file.json` — renamed file duplicates
- `evidence/ledger-after-confirm.json` — persist vs review type
- `evidence/overflow-evidence.json`
- `evidence/screenshots/`

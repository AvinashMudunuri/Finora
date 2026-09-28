# Validation

Branch: `aaep/finora-import-correctness-053` from `origin/main` `41f9612`.

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 46 files, **445 passed** (was 439) |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed; JS 323.49 kB; PWA `generateSW` **32 entries** (997.28 KiB) |
| `build:e2e-all-current` | passed |
| `build:e2e-overdue` | passed |
| `build:e2e-nw-decreased` | passed |
| `build:e2e-nw-unchanged` | passed |
| `build:e2e-high-util` | passed |
| `build:e2e-no-attention` | passed |
| production `npm run build` after e2e | passed |

`calculations.ts` is not in `git diff origin/main -- src`.

## Financial regression (demo fixtures)

Dashboard before import:

- Net worth `$23,168.43`
- Monthly income `$3,200.00`

Existing `calculations.test.ts` still expects net worth `$23,168.43`, September spending `$87.42`, Visa minimum `$35.00`.

After funded bank persist (unit): August income `$3,200`, spending `$87.42` with NEFT stored as `transfer`.

## Browser (`:4175`, SW unregistered)

| Scenario | Result |
| --- | --- |
| HDFC CSV with NEFT | Preview transfers `$0.00`; review NEFT **Needs review**; Import disabled |
| Current-status PDF (`Payment due date` + `Payment status: current`) | Persist `paymentStatus: "current"`; Cards **Current**; Dashboard no card-payment-due |
| Card purchase line | Stored `card_purchase` |
| Overflow 320 / 375 / 1440 | page `contentOverflowX` 0 |

## Tests added (existing tests kept)

- PDF: overdue, current, due-date-only
- persist: refuse unfunded transfer; persist transfer with funding; preview type alignment; card_payment when funded
- StatementImport: NEFT cannot confirm as Transfer

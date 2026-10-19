# Validation

Branch: `aaep/finora-import-identity-054` from `origin/main` `f7c8fb7`.

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 47 files, **455 passed** (was 445) |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed; JS 322.74 kB; PWA `generateSW` **32 entries** (996.55 KiB) |
| `build:e2e-all-current` | passed |
| `build:e2e-overdue` | passed |
| `build:e2e-nw-decreased` | passed |
| `build:e2e-nw-unchanged` | passed |
| `build:e2e-high-util` | passed |
| `build:e2e-no-attention` | passed |
| production `npm run build` after e2e | passed |

`calculations.ts` is not in `git diff origin/main -- src`.

## Financial regression (demo fixtures, Show demo data)

- Net worth `$23,168.43`
- Assets `$25,337.02`
- Liabilities `$2,168.59`
- Investment `$8,420.55`
- September income `$3,200.00`
- September spend `$87.42`
- September savings `$3,112.58`
- Visa minimum `$35.00` (Card payment due on demo)

## Browser (`:4175`, SW unregistered, localStorage cleared)

| Scenario | Result |
| --- | --- |
| `checking.csv` Create | `acc-imp-1`, 2 transactions, `sourceFileId` `stmt-edb75cea` (not the file name) |
| `checking-copy.csv` Create | `0 new · 2 already imported`; Import disabled |
| `second-bank.csv` Create | `acc-imp-2`; payroll/cafe on the second id; first account balance unchanged |
| Overflow 320–1440 | `contentOverflowX` ≤ 0 |

## Tests added (existing tests kept)

- `identify.test.ts`: unique name match; two Visas ambiguous; one Visa unique
- persist: Create vs matching name; explicit select; renamed refuse; two banks; two cards same issuer
- duplicates: content id / line-set match without file name
- StatementImport: renamed copy cannot confirm

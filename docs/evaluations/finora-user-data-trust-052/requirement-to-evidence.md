# Requirement → evidence

## Import trust

| User must understand | Result | Evidence |
| --- | --- | --- |
| What file was imported | **Partial.** `fileName` is stored. Preview institution line is empty for the HDFC CSV. History shows `Imported statement · Imported account`, not `hdfc-savings.csv`. | Browser preview; `ledger-after-confirm.json` |
| Which account it belongs to | **Partial.** User picks account vs card. First CSV creates `Imported account`. Empty Create can still auto-match on persist. | `identify.ts`, `StatementImport.tsx` |
| How many records were detected | **Pass for kept rows.** “3 transactions found”. Dropped rows have no count. | Preview snapshot |
| How many will be imported | **Pass with caveats.** “3 new · 0 already imported” / confirm button. Create-path preview can disagree with persist. | Re-import preview; findings 3 |
| Which were rejected | **Fail.** Warnings unused in UI. | `csv.ts` `warnings.push`; `StatementImport` |
| Which are ambiguous | **Partial.** “N need review” on review. No type correction. Transfer can later become unknown. | Review vs ledger |
| Whether duplicates were detected | **Partial.** Count shown. Same-file+same-account blocked. Renamed+Create is not. | `duplicates.ts`; probe JSON |
| Whether warnings exist | **Fail.** | Finding 4 |
| Guess whether import succeeded | **Partial.** History status + transaction list after confirm. Status “Needs review” is unexplained. No success toast. | After-confirm snapshot |

## Review correctness

| Field | Can user understand? | Can user correct? |
| --- | --- | --- |
| Date | Yes (table) | No |
| Description | Yes | No |
| Amount | Yes | No |
| Account | Preview party picker; not in the table | Pick before confirm only |
| Event type | Shown; can disagree with persist | No |
| Transfer | Shown as Transfer | No; may persist `unknown` |
| Card purchase | Shown when classified | No |
| Income / expense | Shown | No |

Correction capability is a **follow-up (E)**, except finding 2 (show persist outcome) which is required for trust.

## Warning visibility

See finding 4. Warnings: skipped CSV date/amount rows. Generated in `extractCsvStatement`. They do not change kept-row math. They should inform, not block, and they must be visible.

## Persistence safety

See finding 5. Auto-detect preview did not write `finora.user-ledger.v1`. Map → Continue does write mappings. Privacy: mappings are device-local JSON, not the file.

## PDF classification

Finding 1. Verified against current `inferPaymentStatus`. Affects card status, obligations, Dashboard card-payment, Insights. Classified as correctness.

## Duplicate / idempotency

Documented in finding 3 and `lifecycle.md`. Not documented in the product UI.

## Account boundaries

| Situation | Behavior |
| --- | --- |
| One bank | Creates `Imported account` (CSV) or uses picked account |
| Multiple banks | Code can append `acc-imp-N`. Identify is substring. No dedicated UI test |
| One / multiple cards | Create requires statement facts + user credit limit. Issuer/name substring can attach to the wrong card |
| Ambiguous identity | `identifyParty` returns `ambiguous` and persist asks the user to pick — if they reach persist with no selection. Preview does not show “ambiguous” |

The system **can** silently put transactions on the wrong party (finding 7). First HDFC CSV created a new bank and did not touch fixture accounts.

## Consumer questions

| Question | Answer today |
| --- | --- |
| What did Finora find? | Count + totals + inspect table. Not file name, not rejected rows. |
| What will it add? | New-count + confirm label. Can be wrong on Create. |
| What needs my attention? | “Need review” count. Warnings hidden. Persist may add more unknowns. |
| If I cancel? | Wizard resets. Mappings from Map → Continue stay. Transactions do not. |
| After I confirm? | User ledger overlay. History row. Surfaces recalculate. No undo. |
| Next month’s statement? | Same account + same lines: blocked. New file name + Create: can duplicate. |

## Regression (formulas unchanged)

Demo fixture `calculations.test.ts` still expects net worth `$23,168.43`, assets `$25,337.02`, liabilities `$2,168.59`, investment `$8,420.55`, monthly income `$3,200.00`, spending `$87.42`. After CSV import, imported Spending/Dashboard used the same income/spending/savings identities on August 2026. Transfers and `unknown` excluded from spending. Card minimum payment / attention formulas untouched (but feed on possibly wrong `paymentStatus`).

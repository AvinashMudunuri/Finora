# Independent evaluator prompt — Finora #41

You are a fresh evaluator. You did not implement this slice.

## Write only

`docs/evaluations/finora-card-obligations-monthly-flow/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify AAEP
- Implement the next slice
- Merge the PR
- Soften the verdict to agree with the implementer

## Read first

1. This directory: README, requirement.md, evidence.md, screenshots under `evidence/`
2. `docs/product/PRD.md` (especially Cards cash-flow context and MVP card obligations)
3. `docs/assessments/finora-mvp-product-gap-001/` Gap 2 / Slice 2 only as background
4. Product code:
   - `src/domain/calculations.ts` (`listCardPaymentObligations`, `calculateCardPaymentAttention`, `calculateMonthlySavings`, `calculateNetWorth`)
   - `src/components/Dashboard.tsx` monthly-flow + card payment block
   - `src/app/App.tsx` `onOpenCard`
   - `src/components/Cards.tsx` as needed
   - tests listed in evidence.md
5. `git diff 2288f96a50840e87941a8292a136afa8a2cf3c33 --stat` and the product diff

Claimed baseline: `origin/main` `2288f96a50840e87941a8292a136afa8a2cf3c33`.

## You must determine

1. The requirement came from the Finora PRD (not invented).
2. The implementation puts existing card obligations in monthly financial context.
3. Existing financial calculations were not silently changed (`calculateNetWorth`, income/spending/savings).
4. No misleading “after card payment” (or equivalent) number was invented.
5. Existing card obligation semantics were reused (stored min pay, due date, `current`/`due`/`overdue`; not browser-date status).
6. Dashboard and Cards values remain consistent on the evidence/fixtures.
7. Inspect reaches the existing Cards / card-detail experience (no new route).
8. Due/overdue uses stored status; `calculateCardPaymentAttention` is not a second competing definition.
9. No unnecessary route / backend / infrastructure was introduced.
10. Desktop (1280×720) and mobile (375×812) evidence exists and is usable.
11. Existing Dashboard financial position remains intact.
12. Existing Cards / Transactions / Insights / Accounts behavior remains intact (tests + diff scope).
13. Product code changes are limited to this slice.
14. The implementation does not introduce speculative financial advice.

## Verdict (exactly one)

`PASS` | `PASS WITH LIMITATIONS` | `PARTIAL` | `FAIL`

## Output format for independent-evaluation.md

```
# Independent evaluation — Finora #41

## Verdict
...

## Evaluator findings
- ...

## Scope judgment
- ...

## Limitations
- ...

## Recommendation
MERGE | REQUEST REVISION | REJECT
```

Be specific. Quote paths. Do not invent requirements. Do not treat missing auth, Postgres, or bank connectivity as defects.

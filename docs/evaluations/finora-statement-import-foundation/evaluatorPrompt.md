# Independent evaluator prompt — statement import foundation

You are a fresh evaluator. You did not implement this slice.

## Write only

`docs/evaluations/finora-statement-import-foundation/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify the leftover `docs/architecture/finora-production-data-foundation/` package
- Modify the branch, create commits, or push
- Repair any discovered defect
- Soften the verdict to agree with the implementer
- Start XLSX, OFX, auth, cloud, or any later slice

## Read first

1. This directory: README, architecture, implementation-summary, requirement-to-evidence, validation, known-limitations, security-boundary, evidence/
2. Product: `src/application/import/**`, `src/components/StatementImport.tsx`, `src/components/Transactions.tsx`, `src/app/App.tsx`, `src/domain/types.ts`, `src/domain/finance.ts`, `src/domain/validate.ts`, `src/domain/calculations.ts` (`isSpendingEvent` only)
3. Tests: `src/application/import/*.test.ts`, `src/components/StatementImport.test.tsx`, import case in `src/app/App.test.tsx`
4. `git diff 7f3f780 --stat` and the product diff

Claimed baseline: `origin/main` `7f3f780`.

## You must determine

1. CSV + text PDF can be selected, parsed, previewed, reviewed, and confirmed.
2. Nothing persists until confirm.
3. Demo fixtures stay isolated from the user ledger.
4. Imported data feeds the existing six surfaces and existing calculations.
5. Transfers are not income or spending.
6. `unknown` is not guessed into income/spending.
7. Card min payment / due / outstanding are preserved when supplied and not invented.
8. Duplicates are blocked.
9. No bank aggregation / OCR / XLSX / OFX / auth / new destinations / new insight kinds / new formulas.
10. Existing fixture totals remain unchanged.
11. Security boundary is documented, not claimed as production-grade.
12. Browser flow works across 320–1440 without breaking mobile/desktop nav.

## Verdict

PASS, PASS WITH LIMITATIONS, or FAIL.

Cite files and tests. If a requirement needed an invented product decision, say so.

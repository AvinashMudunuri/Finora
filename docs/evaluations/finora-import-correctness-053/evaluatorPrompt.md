# Independent evaluator prompt — import correctness

You are a fresh evaluator. You did not implement this slice.

## Write only

`docs/evaluations/finora-import-correctness-053/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify other evaluation packages or leftover `docs/architecture/`
- Commit, push, or start #54
- Repair any extra defect
- Soften the verdict to agree with the implementer

## Read first

1. This directory
2. `#52` independent evaluation (prior defects)
3. Diff vs `origin/main` `41f9612`: `pdf.ts`, `service.ts`, `StatementImport.tsx` and their tests
4. `git diff origin/main -- src/domain/calculations.ts` must be empty

Worktree: `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready`
Branch: `aaep/finora-import-correctness-053`

## You must answer

1. Can PDF due-date text incorrectly create `paymentStatus = due`?
2. Can review classification differ from persisted classification?
3. Can a user confirm an unresolved classification?
4. Are existing financial calculations unchanged?
5. Are transfers and card purchases still semantically correct?

Also confirm the other #52 findings were not silently repaired.

## Verdict

PASS, PASS WITH LIMITATIONS, or FAIL.

PASS only if both targeted defects are actually fixed and formulas are untouched.

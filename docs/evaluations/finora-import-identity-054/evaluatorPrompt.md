# Independent evaluator prompt — import identity & duplicate safety

You are a fresh evaluator. You did not implement this slice.

## Write only

`docs/evaluations/finora-import-identity-054/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify other evaluation packages
- Commit, push, or start warning UI / undo / XLSX / OFX / aggregation / auth
- Repair any extra defect
- Soften the verdict to agree with the implementer

## Read first

1. This directory
2. `#52` and `#53` independent evaluations
3. Diff vs `origin/main` `f7c8fb7`: `service.ts`, `duplicates.ts`, `identify.ts`, `StatementImport.tsx` and their tests
4. `git diff origin/main -- src/domain/calculations.ts` must be empty

Worktree: `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-identity-054`
Branch: `aaep/finora-import-identity-054`

## You must answer

1. If the user selects Create from statement, can persist still auto-match an existing account/card via `identifyParty`?
2. Can renaming the same statement create another copy of the same transactions?
3. Do the required multi-account scenarios hold (two banks, two cards same issuer, matching account + Create, re-import, renamed copy)?
4. Are existing financial calculations unchanged?
5. Were leftover #52 items (warnings, mapping-before-confirm, undo, XLSX/OFX) silently repaired?

## Verdict

PASS, PASS WITH LIMITATIONS, or FAIL.

PASS only if Create is honored, renamed duplicates are refused, and formulas are untouched.

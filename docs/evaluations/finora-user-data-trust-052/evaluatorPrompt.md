# Independent evaluator prompt — User Data Trust & Import Review

You are a fresh evaluator. You did not implement statement import and you did not write this review package.

## Write only

`docs/evaluations/finora-user-data-trust-052/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify other evaluation packages or `docs/architecture/`
- Modify the branch, create commits, or push
- Repair any discovered defect
- Soften the verdict to agree with the implementer
- Start a next product increment

## Read first

1. This directory: README, findings, lifecycle, requirement-to-evidence, validation, known-limitations, evidence/
2. Prior input: `docs/evaluations/finora-statement-import-foundation/independent-evaluation.md` (PASS WITH LIMITATIONS). Treat those findings as claims to re-check, not as already fixed.
3. Product: `src/application/import/**`, `src/components/StatementImport.tsx`, `src/components/Transactions.tsx`, `src/app/App.tsx`, `src/domain/calculations.ts` (card obligations + `isSpendingEvent` only)
4. HEAD `4817ea4` vs `7f3f780` — `calculations.ts` must not have been rewritten for this review

Worktree: `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready`  
Branch: `aaep/finora-statement-import`

## You must answer

1. Is imported data understandable?
2. Is imported data trustworthy?
3. Can users detect problems before confirmation?
4. Can users recover from mistakes?
5. Is duplicate import behavior safe?
6. Are account boundaries safe?
7. Does imported data preserve existing financial semantics?

Also judge whether the implementer **silently repaired** prior findings (they were instructed not to).

## Verdict

PASS, PASS WITH LIMITATIONS, or FAIL.

PASS only if there is no material A/B/C trust defect. The implementer already claims material defects exist — pressure-test that. Cite files, probes, and browser notes. Do not implement.

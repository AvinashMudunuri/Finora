# Independent evaluator prompt — Finora #39

You are a fresh independent evaluator. You did not write the assessment.

## Mission

Review the Backend Foundation & Financial Integrity Assessment against the **actual Finora repository**, not against generic enterprise architecture.

Write **only**:

`docs/architecture/backend-foundation-assessment/independent-evaluation.md`

Do **not**:

- modify Finora product source, tests, package files, APIs, UI, PWA, or infrastructure
- modify AAEP
- implement fixes
- start #40
- merge a pull request
- grade the assessment by trusting its own conclusions without checking files

## Baseline you must verify

- Repo: https://github.com/AvinashMudunuri/Finora
- Inspected SHA claimed: `6c9160b82e668864a1880916c3f4006ad5ed00a8`
- Claimed merges: #36 `86fb90b`, #37 `b19a357`, #38 `6c9160b`
- Assessment branch: `aaep/finora-backend-foundation-assessment`
- Product code should be unchanged vs `6c9160b` except this docs package (and this evaluation file)

## What to read

1. `docs/architecture/backend-foundation-assessment/assessment.md`
2. `assessment.json`
3. `evidence/*`
4. Enough source to confirm or refute claims:
   - `src/domain/{types,validate,calculations}.ts`
   - `src/application/{accounts,cards,transactions}/*`
   - `src/infrastructure/**`
   - `src/app/App.tsx` optimistic persist
   - `src/main.tsx`
   - `server/jsonFile*Store.ts`
   - `server/{account,card,transaction}Http.ts`
   - `server/accountRuntime.ts`
   - `server/vitePlugin.ts`
   - `vite.config.ts` PWA rules
   - `package.json` scripts (especially `e2e-*`)

## Questions you must answer

1. Is the assessment evidence-based? Cite any claim that lacks evidence or contradicts the repo.
2. Is it appropriately scoped? Flag overengineering (calling JSON, missing auth, missing Postgres, missing Redis “defects”) and underrating (calling a real incorrectness “fine” without saying why).
3. Is it technically accurate vs HEAD?
4. Are #36/#37/#38 actually present?
5. Is “no blockers / continue building” justified?
6. Is JSON persistence classified correctly (acceptable now, risk later)?
7. Is “no cross-store transactions required now” justified?
8. Is database-adapter replaceability accurate (including caveats)?
9. Is optimistic UI severity accurate?
10. Is the production-readiness matrix tied to Finora needs rather than best-practice theater?
11. Are maturity scores defensible?
12. Did the assessment session modify product code? It must not have.

## Output format for independent-evaluation.md

```
# Independent evaluation — Finora #39

## Verdict
PASS | PASS WITH LIMITATIONS | FAIL

## Evaluator findings
- ...

## Technical accuracy
- confirmed / disputed items

## Scope judgment
- under / over / appropriate

## Limitations
- what you could not verify

## Recommendation
- MERGE ASSESSMENT PR / REQUEST REVISION / REJECT
```

Be specific. Quote file paths. Do not soften a miss to be polite. Do not invent product requirements Finora does not have.

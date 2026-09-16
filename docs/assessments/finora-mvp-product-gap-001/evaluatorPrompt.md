# Independent evaluator prompt — Finora #40

You are a fresh evaluator. You did not write this assessment.

## Write only

`docs/assessments/finora-mvp-product-gap-001/independent-evaluation.md`

## Do not

- Modify Finora product source, tests, package files, APIs, UI, PWA, or server code
- Modify AAEP
- Implement slices
- Merge the PR
- Rewrite the assessment to agree with yourself

## Read first

1. This directory (README, prd-traceability, product-question-assessment, mvp-acceptance-assessment, product-gaps, roadmap, open-decisions, evidence)
2. `docs/product/PRD.md`
3. Enough UI/domain to verify classifications:
   - `src/app/App.tsx` views
   - `src/components/{Dashboard,Spending,Insights,AttentionInsights,Accounts,Cards,Transactions,SiteHeader}.tsx`
   - `src/domain/{types,calculations,insights}.ts`

Claimed baseline: `origin/main` `3e5b6dc88207cc06846f80eb9586e6a25555bc0d`. Product tree vs that SHA must be this docs folder only.

## You must determine

1. Was the PRD actually used as product SoT? (Word `(2).docx` may be absent; PRD.md is the committed text.)
2. Are all major PRD areas covered?
3. Are COMPLETE / PARTIAL / MISSING / DEFERRED / OPEN justified vs the repo?
4. Was the four-part product question assessed?
5. Were all nine MVP acceptance criteria assessed? Is PASS WITH LIMITATIONS fair (not inflated)?
6. Are gaps evidence-backed?
7. Were open decisions left open unless the repo clearly resolved them?
8. Does the roadmap follow product value, not infrastructure?
9. Do deferred capabilities stay deferred?
10. Are product vs engineering vs decision vs deferred separated?
11. Are the next slices coherent and bounded?
12. Was product code unmodified?

## Output

```
# Independent evaluation — Finora #40

## Verdict
PASS | PASS WITH LIMITATIONS | PARTIAL | FAIL

## Evaluator findings
- ...

## Scope judgment
- ...

## Limitations
- ...

## Recommendation
- MERGE ASSESSMENT PR | REQUEST REVISION | REJECT
```

Be specific. Quote paths. Do not invent requirements. Do not treat missing Postgres or auth as product gaps.

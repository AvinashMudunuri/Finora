# Independent evaluation — Finora #41

## Verdict
PASS

## Evaluator findings

The worktree `HEAD` is still `2288f96a50840e87941a8292a136afa8a2cf3c33` (“Assess Finora MVP product gaps against the PRD (#40)”). The slice is an uncommitted working tree on `aaep/finora-card-obligations-monthly-flow`. That is a packaging fact, not a product defect. The product diff against that SHA is only:

- `src/domain/calculations.ts`
- `src/components/Dashboard.tsx`
- `src/styles/index.css`
- `src/domain/calculations.test.ts`
- `src/components/Dashboard.test.tsx`
- `src/components/Insights.consistency.test.tsx`
- `.gitignore`

`src/app/App.tsx`, `src/components/Cards.tsx`, `src/domain/finance.ts`, `package.json`, and every other product surface are unchanged. This evaluator independently ran `npm test -- --reporter=dot` on the worktree: **36 files, 376 tests passed**. Typecheck / lint / production build were not re-run here; they are accepted from `evidence.md` because the product surface that would break them is the same narrow diff.

1. **Requirement is from the Finora PRD, not invented.** `docs/product/PRD.md` (Cards) requires: “The product should make card obligations visible in the person's cash-flow and monthly financial context, not only as a standalone card balance.” MVP also requires “Show card utilization and card obligations.” #40 Gap 2 / Slice 2 (`docs/assessments/finora-mvp-product-gap-001/product-gaps.md`, `roadmap.md`) names the same gap and allows “Monthly flow (or Dashboard monthly-flow row)” with due/overdue cards, minimum payment next to that month’s savings, and Inspect to Cards. The slice correctly refuses PRD insight type “A card obligation is approaching.”

2. **Existing obligations are placed in monthly financial context.** `src/components/Dashboard.tsx` adds a `flow-obligation` block inside the existing Monthly flow panel (`aria-labelledby="monthly-flow-heading"`), after Income / Spending / Savings. It lists stored minimum payments for cards that already qualify as due/overdue. Desktop `evidence/desktop-1280-due-monthly-flow.png` and mobile `evidence/mobile-375-due-monthly-flow.png` show Visa Rewards · Due, minimum $35.00, due Sep 22, 2026, beside unchanged I/S/S. Amex Everyday (`paymentStatus: "current"` in `src/data/fixtures.ts`) does not appear.

3. **Existing financial calculations were not silently changed.** `git diff` on `src/domain/calculations.ts` only extracts the previous `calculateCardPaymentAttention` filter/sort into `listCardPaymentObligations` and defines attention as `listCardPaymentObligations(cards)[0] ?? null`. `calculateNetWorth`, `calculateMonthlyIncome`, `calculateMonthlySpending`, and `calculateMonthlySavings` are byte-identical to baseline. Savings remains `income.total - spending.total`. Dashboard still calls `calculateMonthlySavings` / `calculateNetWorth` for the same Overview and Monthly flow figures.

4. **No “after card payment” (or equivalent) number was invented.** The block copy is: “Stored minimum payment for cards that are due or overdue. This is not deducted from savings.” Screenshots keep Savings at $3,112.58 with the note “Income − spending.” `Dashboard.test.tsx` asserts `flow.savings === flow.income - flow.spending` and that `/should I pay|after card payment/i` is absent. Outstanding is not subtracted from savings or shown as a remainder.

5. **Existing card-obligation semantics were reused.** Qualification is stored `Card.paymentStatus === "overdue" || === "due"` (`isAttentionPaymentStatus` in `calculations.ts`). Displayed fields are stored `minimumPayment`, `paymentDueDate`, and `paymentStatus`, formatted with existing `formatCurrency` / `formatDate` / `paymentStatusLabel` from `src/domain/finance.ts`. There is no `Date`, `Date.now`, or browser-clock comparison in the new path. A due card with `minimumPayment: 0` still lists (domain test); that is stored status, not a new rule.

6. **Dashboard and Cards values match the fixture / evidence.** Production fixture Visa: outstanding $1,842.19, min $35.00, due `2026-09-22`, status `due`. Monthly-flow screenshots show min $35.00 / Due / Sep 22, 2026. `evidence/desktop-1280-due-cards-inspect.png` shows the same card selected: outstanding $1,842.19, min $35.00, Payment status Due, due Sep 22, 2026, utilization 36.8%. Overdue mode only flips stored status: monthly flow and `evidence/desktop-1280-overdue-cards-inspect.png` both show Overdue, same amounts and due date. Overview liabilities $2,168.59 = 1842.19 + 326.40; net worth $23,168.43; assets $25,337.02. I/S/S $3,200.00 / $87.42 / $3,112.58 is unchanged between due and overdue captures, as the overdue helper only changes `paymentStatus`.

7. **Inspect uses the existing Cards path; no new route.** The new button calls `onOpenCard(obligation.cardId)`. `App.tsx` is not in the diff; it already does `setSelectedCardId(cardId); setView("cards")`. Dashboard test asserts `onOpenCard` is called with `"card-visa"`. Desktop Inspect screenshots land on the existing Cards detail (Add card / Edit this card, Visa Rewards fields), not a new URL or page.

8. **Due/overdue is stored status; attention is not a second definition.** `calculateCardPaymentAttention` is now the first list item. `src/domain/insights.ts` still consumes attention only. Domain tests keep the old attention cases and add `expect(calculateCardPaymentAttention(cards)).toEqual(listed[0])`. Dashboard lists overdue before due, then original card-list order — the same rank as `paymentAttentionRank`. Current cards are omitted on both surfaces.

9. **No unnecessary route, backend, or infrastructure.** No new API, store, migration, PWA workbox rule, or route. `build:e2e-overdue` already existed in `package.json`; `.gitignore` only adds `dist-e2e-overdue` (same pattern as `dist-e2e-high-util`) and `docs/evaluations/**/.chrome-profile/`. CSS adds `.flow-obligation*` using existing tokens.

10. **Desktop 1280 and mobile 375 evidence exists and is usable.** Present: `desktop-1280-due-financial-position.png`, `desktop-1280-due-monthly-flow.png`, `desktop-1280-due-cards-inspect.png`, `desktop-1280-overdue-monthly-flow.png`, `desktop-1280-overdue-cards-inspect.png`, `mobile-375-due-financial-position.png`, `mobile-375-due-monthly-flow.png`, `mobile-375-overdue-monthly-flow.png`. Mobile monthly-flow captures are one column; Card payment copy, Visa identity, $35.00, due date, and Inspect wrap without horizontal page overflow. The obligation sits below the I/S/S cards (implementer scrolled to `#card-payment-heading`). Mobile header nav still clips (“Trans:”) on the overview capture; that is the existing `SiteHeader`, not the new block. Missing: mobile Cards landing after Inspect, and any browser shot of two due/overdue cards. Those are evidence gaps, not contradictions of the code.

11. **Existing Dashboard financial position remains intact.** Overview markup in `Dashboard.tsx` is untouched. Screenshots still show Net worth $23,168.43, assets $25,337.02, liabilities −$2,168.59, What changed +$3,112.58 / −$1,962.19. New UI is confined to Monthly flow.

12. **Existing Cards / Transactions / Insights / Accounts behavior remains intact.** Those components are not in the diff. Attention still uses `calculateCardPaymentAttention` via `AttentionInsights`. The only test relaxation is `Insights.consistency.test.tsx`: Dashboard `getByText("Visa Rewards · Due")` became `getAllByText(...).length > 0` because the same identity string now appears in Monthly flow and Attention. Insights still uses `getByText` (exactly one). That is a justified matcher change, not a behavior change. Independent `npm test`: 376 passed, including pre-existing Accounts / Cards / Transactions / Spending / Insights / Net Worth / Dashboard cases.

13. **Product code changes are limited to this slice.** Domain list extraction, Dashboard monthly-flow block, supporting CSS, tests, and gitignore hygiene. Evaluation pack under `docs/evaluations/finora-card-obligations-monthly-flow/` is untracked documentation, not product runtime.

14. **No speculative financial advice.** Copy states what the stored field is and that savings is not reduced. There is no payoff recommendation, “you should pay,” health score, or invented remainder. Attention panel copy is unchanged: “No recommendations are invented.”

Additional observations that do **not** move the verdict:

- The same due/overdue card still appears again under Attention. The PRD and Slice 2 do not require removing Attention.
- Home / Overview still has no separate “card snapshot” tile. Slice 2 explicitly placed this work on the monthly-flow row, not a new Overview stat.
- Scenario C (two qualifying cards) is proven in `calculations.test.ts` and `Dashboard.test.tsx` only. The production fixture has one due + one current, so browser evidence cannot show two-row ordering without a custom fixture.
- `listCardPaymentObligations` still carries `outstandingBalance` (same result type as attention) but Monthly flow does not render it. That matches the “outstanding stays on Cards / Attention” rule and is not a hidden after-payment figure.

## Scope judgment

This is a product-surface slice, not a formula, platform, or IA expansion. It implements #40 Slice 2 on the surface Slice 2 named: Dashboard Monthly flow, using stored card fields and the existing `onOpenCard` path. It does not add `/income`, `/savings`, bank connectivity, auth, Postgres, new insight kinds, Cards redesign, or net-worth / savings formula changes. Out-of-scope PRD items were not treated as defects.

The `.gitignore` chrome-profile rule is evaluation-pack hygiene sitting in the product ignore file. Harmless. It is not scope creep of the kind that would fail point 9 or 13.

## Limitations

- Current cards are omitted from the monthly-flow list. That is the existing payment-attention rule, not a missing field.
- Outstanding balance is not repeated on the monthly-flow row. Inspect / Cards / Attention remain the outstanding surfaces.
- There is no “after payment” cash number. The domain does not define one; inventing it would have failed point 4.
- Browser evidence does not include: current-only empty state, two due/overdue cards, or mobile Cards after Inspect. Those paths are covered by unit/component tests and, for Inspect, by unchanged `App.tsx` plus desktop screenshots.
- Overdue Attention (“Card payment overdue”) is claimed in `evidence.md` but not visible in the cropped overdue monthly-flow PNG. Attention code path was not changed; this is a capture gap.
- `e2e-overdue` is a Vite fixture mode, not a Playwright suite. Acceptable in this repository; do not read it as automated browser coverage.
- Work is uncommitted at evaluation time. Merge applies to the reviewed diff once it is committed; this file does not commit it.

## Recommendation
MERGE

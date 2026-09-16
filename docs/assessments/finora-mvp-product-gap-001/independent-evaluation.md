# Independent evaluation — Finora #40

Inspected `aaep/finora-mvp-product-gap-assessment` at `7899d92da4d805ff40c8584b9e5491f638dffe76`, parent `3e5b6dc88207cc06846f80eb9586e6a25555bc0d` (`origin/main`). Product tree compared to that SHA is this docs folder only. `C:\Codebase\Personal\Finora` was on `cursor/inspect-spending-from-insight` and was not used as the product baseline.

## Verdict
PASS WITH LIMITATIONS

## Evaluator findings

1. **PRD as product SoT — yes.** The assessment uses committed `docs/product/PRD.md`, not chat or AAEP infra. No Word `(2).docx` exists in the checkout; that absence is stated and does not matter because the committed PRD contains vision, principles, IA, Overview through Settings, MVP boundary, NFRs, open decisions, and the nine acceptance criteria. The assessment does not invent live aggregation, Postgres, Redis, auth, or a ledger rewrite as product gaps.

2. **Major PRD areas — covered, with one soft hole.** Vision, principles, target user, every IA noun (Home through Settings), MVP include/exclude, calculation/explainability NFRs, and every listed open decision are in `prd-traceability.md`. AAEP strategy / build-sequence sections are correctly omitted (engineering mechanism, not product gaps). Security, privacy, reliability, auditability, and maintainability have no matrix rows. That is a coverage gap, not a mis-score: those NFRs are not specified as MVP product surfaces, and auth remains OPEN.

3. **COMPLETE / PARTIAL / MISSING / DEFERRED / OPEN — mostly justified; three scores are too generous or too harsh.**
   - **Justified COMPLETE:** Accounts (`src/components/Accounts.tsx` CRUD, types, per-account txns, investment labeled “Current value”); Transactions (all six `TransactionEventType` values in `src/domain/types.ts`; no create/edit, which MVP does not require); Spending monthly overview + MoM + drill-down (`src/components/Spending.tsx`); Net worth math and inspectability (`calculateNetWorth` in `src/domain/calculations.ts`; Dashboard Overview + history); Cards as a first-class type/nav/CRUD surface; explainability/consistency; brand resolved (`src/components/SiteHeader.tsx`, `src/pwa/manifest.ts`).
   - **Justified PARTIAL / OPEN / DEFERRED / MISSING:** category spending OPEN (zero `category` hits under `src/`); rewards DEFERRED (no rewards field on `Card`); live aggregation / market data / rewards engines DEFERRED (`package.json` is React-only); Settings MISSING (`AppView` in `src/app/App.tsx` and `SiteHeader.tsx` is dashboard/accounts/cards/transactions/spending/insights only); Insights page is a second `AttentionInsights` (`src/components/Insights.tsx` vs Dashboard Attention).
   - **Home / Overview marked COMPLETE is generous.** PRD Home asks for “Card obligations / card snapshot.” Overview shows card *outstanding* as liabilities (`Dashboard.tsx` Liabilities) and due/min-pay only when Attention already fires. Min pay / due are not in Monthly flow. That is the same miss as Gap 2. COMPLETE overstates the Home bullet.
   - **Income / Savings PARTIAL + P1 overstates findability.** Dashboard Monthly flow already renders Income, Spending, and Savings as equal stat cards. Spending’s H1 is “Spending” but the lede and selected-month grid already treat the three as equals, with an Income evidence list. Users do not “only stumble into them.” The real miss is nav/H1 naming and the absence of an income/savings *change* story — not absence of the concepts.
   - **Investments PARTIAL is fair; P1 is high.** Overview already has an Investment asset line; Accounts lists type and “Current value.” The user does not have to guess which rows are investments. What is missing is an Overview-to-investment-accounts inspect path and an account-level breakdown of that single number. That is a P2 coherence gap unless holdings are in scope (they are OPEN).

4. **Four-part product question — assessed.** `product-question-assessment.md` scores A–D separately and keeps IA recommendations from spawning `/income`, `/savings`, `/investments`, or `/net-worth`. Area statuses as PARTIAL match the repo. The IA table is the strongest page in the pack.

5. **Nine MVP criteria — all assessed. Overall PASS WITH LIMITATIONS is fair; criterion 6 is inflated to PARTIAL.**
   - 1 PASS: Overview states NW, asset mix, liquid vs investment, card liability, monthly I/S/S. `Dashboard.test.tsx` asserts Overview without requiring “Emergency Savings.”
   - 2 PASS: `calculateNetWorth(accounts, cards)` — assets bank+cash+investment; liabilities card outstanding. Transfers are events, not a second asset.
   - 3 PASS: `Card` is not an `AccountType`.
   - 4 PASS: `Cards.tsx` shows outstanding, limit, available, utilization, statement end, due, min pay, status. Attention uses `HIGH_CARD_UTILIZATION_THRESHOLD = 0.7` and payment due/overdue.
   - 5 PASS: Spending lists monthly income/spend events; Accounts/Cards list associated txns; Transactions filters; Attention Inspect exists.
   - **6 should be PASS, not PARTIAL.** Acceptance text is “visible and internally consistent.” Both are true: same `calculateMonthlyIncome` / `isSpendingEvent` (`expense` + `card_purchase`) / `calculateMonthlySavings` on Dashboard and Spending; transfers and `card_payment` excluded in math. First-class IA names are not in the acceptance sentence. Scoring PARTIAL borrows from the IA list to ding an acceptance criterion that the UI already meets.
   - 7 PARTIAL is acceptable as *page* duplication, not as “insights merely repeat dashboard numbers.” Shipped insights already explain due/util/MoM change with drivers (`src/domain/insights.ts`, `AttentionInsights.tsx`). Dashboard copy even admits “the same attention list as Insights.” The PRD sentence is about insight *content* vs Overview *numbers*; the assessment slightly misapplies it to route duplication. The duplication is still a real product-coherence gap. Unimplemented example kinds (large txn, cash reason, savings behavior) correctly stay OPEN, not FAIL.
   - 8 PASS: confirmed.
   - 9 PASS: 36 `*.test.ts(x)` files exist (domain, UI, consistency, App, HTTP/store). Evidence’s “367 tests passed” was not re-run here.
   - Overall **PASS WITH LIMITATIONS** still holds if #6 is flipped to PASS, because Insights-page duplication and thin investment inspect remain. It is not inflated to PASS. It is not NOT YET: the four questions are answerable from Dashboard plus Inspect.

6. **Gaps — evidence-backed, priority-inflated.**
   - Gap 2 (card obligations missing from monthly cash-flow) is the cleanest P1. PRD Cards: obligations visible in cash-flow / monthly context, not only as a standalone balance. Monthly flow in `Dashboard.tsx` is income/spend/savings only.
   - Gap 3 (Insights repeats Attention) is real and visible in source. Dashboard already renders the full `AttentionInsights` stack (drivers, NW evidence). It does not collapse evidence. The only delta is Insights passes `onShowDashboard` and Dashboard Attention does not.
   - Gap 1’s “cannot find income or savings as a place” is not how `Dashboard.tsx` / `Spending.tsx` behave. Reframe-the-H1 is a coherence slice, not a missing capability.
   - Gap 4 is real at account-breakdown-from-Overview; overstated as “cannot inspect without guessing.”
   - Gap 5 is the weakest of the five. PRD Spending says card vs bank “if that distinction is useful.” `isSpendingEvent` already distinguishes `card_purchase` vs `expense`. “P1 / P2” is a hedge, not a priority.

7. **Open decisions — left open unless the repo resolved them.** Brand is the only one correctly marked resolved. Categorization, liabilities beyond cards, extra insight kinds, auth, monetization, geo, card-type taxonomy, import-vs-live, mobile-vs-web stay open. Four implemented insight kinds are correctly called an engineering choice, not a closed PRD. No recommended slice is blocked by an open decision.

8. **Roadmap follows product value over infrastructure — yes on infra; weak on value order.** Explicitly not-next: Postgres, Redis, queues, auth, Settings, category spending, new insight kinds, `#41+` backend hardening. That discipline is correct. Slice 1 first is the weakest value call: I/S/S are already on the landing Monthly flow. Slice 2 is the higher-value PRD miss. Slice 3 is IA cleanup, not a new explanation unless Dashboard is actually shortened (it is not today). Slice 4 is bounded and correctly refuses `/investments` and holdings.

9. **Deferred stayed deferred.** Live aggregation, market data, rewards, auth/multi-user, cloud DB / Redis / queues / event sourcing / ledger rewrite, speculative AI advice, and new IA-name routes are listed as keep-deferred. None leaked into the next-slice list.

10. **Product vs engineering vs decision vs deferred — separated.** Optimistic Account/Card UI before JSON persist is real (`src/app/App.tsx` `handleCreateAccount` / `handleCreateCard` / `handleUpdate*` set state then fire the gateway). Fixture-sibling store validation is real (`server/jsonFileTransactionStore.ts` `write()` calls `assertValidFinanceData([...fixtureAccounts], [...fixtureCards], transactions)`). Both are kept out of the product roadmap. Open decisions are not relabeled as gaps. Deferred is not relabeled as P0.

11. **Next slices — coherent and bounded, with one false current-state claim.**
   - Slice 1: reframe existing Spending; no new routes/formulas/categories. Bounded. Over-justified.
   - Slice 2: add due/min-pay next to monthly savings; Inspect to Cards. Bounded. Best-grounded.
   - Slice 3: “Dashboard may collapse” is not current behavior. Both pages use the same component with full evidence. The slice is still valid if it *changes* Dashboard to a short list and keeps evidence on Insights; as written it sounds like a gap that already exists in Dashboard.
   - Slice 4: account-level investment inspect on existing surfaces; no holdings, market data, or `/investments`. Bounded.
   - Optional card-vs-bank split on Slice 1 is the right placement.

12. **Product code unmodified — confirmed.** `git diff --name-only 3e5b6dc…7899d92` is only:
    `docs/assessments/finora-mvp-product-gap-001/{README,evaluatorPrompt,evidence,mvp-acceptance-assessment,open-decisions,prd-traceability,product-gaps,product-question-assessment,roadmap}.md`
    No `src/`, `server/`, `package.json`, or lockfile edits. This evaluation file is new and is not part of `7899d92`.

## Scope judgment
- Assessment-only scope held. No product implementation, no slice work, no merge.
- P0 was not abused: missing IA names are not called blockers; Settings is P3; category spending is OPEN.
- The pack would send the next chat at a rename (Slice 1) before the sharper PRD miss (card obligations in monthly context). That is a prioritization error, not a scope-break into infra.
- Do not treat this assessment as proof that monthly income/savings are invisible. They are on Dashboard Monthly flow and on `Spending.tsx`.

## Limitations
- `Financial_Cards_App_PRD_for_AAEP(2).docx` was not available; evaluation used `docs/product/PRD.md` only.
- Suite was not re-run; 36 test files were counted, not the claimed 367 passing tests.
- `C:\Codebase\Personal\Finora` working tree is a different branch and was not treated as `3e5b6dc`.
- Responsive “mobile-first vs web-first” remains OPEN; breakpoints `719` / `720` / `960` in `src/styles/index.css` were checked, not a device pass.

## Recommendation
MERGE ASSESSMENT PR

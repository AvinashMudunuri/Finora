# MVP acceptance criteria

Source: `docs/product/PRD.md` “MVP Acceptance Criteria”.

Classifications: PASS · PARTIAL · FAIL

## 1. User can understand overall financial position

**PASS**

Dashboard Overview shows net worth, assets (bank/cash/investment/liquid), and card liabilities. Monthly flow shows income, spending, and savings for the latest stored activity month. Tests in `Dashboard.test.tsx` assert these numbers come from `calculateNetWorth` / `calculateAssetBreakdown` / `calculateMonthlySavings`.

The user does not need to open every account. Limitation (not a fail): investments are a single line; card *upcoming* obligations are not in the monthly-flow row.

## 2. Net worth is calculated from underlying records

**PASS**

`calculateNetWorth(accounts, cards)`: assets = bank + cash + investment balances; liabilities = card outstanding. UI copy matches. `server/calculations.integration.test.ts` and `History.consistency.test.tsx` reuse the same function. Transfers are not added into NW (they are events, not a second asset).

## 3. Cards are visible as a first-class entity

**PASS**

Cards are a distinct type, nav item, CRUD surface, and liability line — not an account subtype. `Cards.tsx`, `src/domain/types.ts` `Card`, `#35`/`#37`.

## 4. User can understand card balance, limit/utilization, and payment obligation

**PASS**

Cards view: outstanding, limit, available credit, utilization, statement end, due date, minimum payment, payment status. Attention surfaces due/overdue and high utilization. `Cards.test.tsx`, `calculations.ts` utilization and payment attention.

## 5. User can inspect transactions underlying summaries

**PASS**

Spending lists monthly income and spending events with Inspect. Accounts and Cards list associated transactions. Transactions view searches/filters and inspects counterparties. Attention insights Inspect spending, card, net-worth evidence. `Spending.test.tsx`, `Accounts.test.tsx`, `Cards.test.tsx`, `Insights.test.tsx`.

## 6. Income, spending and savings are derived consistently

**PARTIAL**

Same functions everywhere: income = `eventType === "income"`; spending = `expense` + `card_purchase`; savings = income − spending. Transfers and `card_payment` are excluded, so they do not inflate savings. Dashboard, Spending, and history tables share `calculateMonthlySavings`.

Not a full pass: Income and Savings are not first-class IA. The Spending page is the only period-scoped place to inspect income. A user following the PRD IA will look for Income/Savings and find a page named Spending.

## 7. Insights identify meaningful changes and point to evidence

**PARTIAL**

Deterministic attention: payment overdue/due, high utilization, meaningful spending change, meaningful NW change. Unchanged values are excluded from attention and kept on Dashboard “What changed”. Inspect + empty-state copy refuse a health judgment.

Not a full pass: Insights is the same list as Dashboard Attention (`AttentionInsights`). PRD: insights should not merely repeat dashboard numbers. Several PRD *example* insight types are unimplemented; those sit under OPEN “exact insight generation rules”, so they are not scored as FAIL.

## 8. Overview remains understandable without inspecting every account individually

**PASS**

Overview + monthly flow + attention. Account names are not required to read NW. `Dashboard.test.tsx` expects Overview without listing “Emergency Savings” as a required row.

## 9. Core calculations and workflows have automated tests

**PASS**

Domain calculation and validation tests; account/card/transaction UI tests; consistency tests; App workflow tests; HTTP/store tests for the backends. `e2e-*` are Vite fixture modes, not a second automation layer — they do not void this criterion.

## MVP acceptance overall

**PASS WITH LIMITATIONS**

The read-and-understand MVP in the PRD boundary is largely present. Limitations are product-shaped, not missing math:

1. Income/Savings are consistent but not first-class.
2. Insights duplicate Dashboard attention.
3. Category spending is an open decision, not an acceptance fail.
4. Investments are in the position number, not an investment product.

This is not inflated to PASS. It is not NOT YET: a user can answer the four questions from Dashboard with Inspect.

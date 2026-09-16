# Recommended next product slices

Prioritize user value and coherence. Do not start with backend infrastructure. Do not add routes to copy the PRD IA. Do not implement a slice that requires an unresolved open decision.

## Slice 1 — Monthly flow (reframe Spending)

- **PRD:** Income & Savings; Spending monthly overview; MVP I/S/S visible
- **Why:** The math exists; the user cannot find Income or Savings
- **User-visible outcome:** One existing view (today: Spending) presents selected-period income, spending, and savings as equals; copy states transfers and card payments are excluded from savings; period control unchanged
- **Dependencies:** None. Reuse `calculateMonthlyIncome` / `calculateMonthlySpending` / `calculateMonthlySavings`
- **Do not include:** New `/income` or `/savings` routes; new formulas; categories; transaction writes
- **Order:** First

## Slice 2 — Cards in monthly cash-flow context

- **PRD:** Card obligations visible in cash-flow / monthly context
- **Why:** Cards are first-class on their own page and invisible next to “what I retained”
- **User-visible outcome:** Monthly flow (or Dashboard monthly-flow row) shows due/overdue cards and minimum payment next to that month’s savings, with Inspect to Cards
- **Dependencies:** Slice 1 surface, or Dashboard monthly-flow section if Slice 1 slips
- **Do not include:** Rewards; new card types; changing payment-status rules
- **Order:** Second

## Slice 3 — Insights that explain (same kinds, more evidence)

- **PRD:** Insights explain change; do not repeat dashboard numbers
- **Why:** Insights is currently a second copy of Attention
- **User-visible outcome:** Dashboard keeps a short attention list. Insights keeps the same four kinds but always shows drivers / NW evidence / Inspect paths that Dashboard may collapse
- **Dependencies:** None
- **Do not include:** New insight kinds (OPEN); AI advice; health scores
- **Order:** Third

## Slice 4 — Investment position on existing Accounts / Overview

- **PRD:** Current investment value; NW contribution; breakdown by account when available
- **Why:** The investment number is unexplained
- **User-visible outcome:** Overview investment line opens the investment account(s); Accounts can filter or group type=investment; investment-event transactions are listed there
- **Dependencies:** None
- **Do not include:** Holdings/instruments (OPEN); market data (DEFERRED); `/investments` route; history/trend (PRD “later”)
- **Order:** Fourth

## Optional with Slice 1 — Card vs bank spending split

- **PRD:** Card vs bank spending where useful
- **Why:** Event types already distinguish `card_purchase` vs `expense`
- **User-visible outcome:** Monthly spending total split into card purchases vs bank/cash expenses, each inspectable
- **Dependencies:** Slice 1
- **Do not include:** Categories
- **Order:** Ship with Slice 1 if it stays small; otherwise immediately after

## Explicitly not next

- Category spending (OPEN)
- Settings
- Transaction create/edit
- Auth, Postgres, Redis, queues
- New insight types without a recorded product decision
- #41+ backend hardening as a product slice

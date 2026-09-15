# Core product question

PRD: Finora should answer *“What is my financial position right now, what changed, why did it change, and what should I pay attention to?”*

Statuses here: COMPLETE · PARTIAL · MISSING

## A. What is my financial position right now?

| Piece | Status | Why |
|---|---|---|
| Net worth | COMPLETE | Dashboard Overview primary stat; `calculateNetWorth` |
| Assets | COMPLETE | Bank / cash / investment / liquid breakdown on Overview |
| Liabilities | COMPLETE | Card outstanding as the only liability; copy states that |
| Liquid / cash | COMPLETE | Liquid = bank + cash; investments excluded; stated in UI |
| Investments | PARTIAL | Value appears as an asset line and as account type. No investment-focused experience or instrument breakdown |
| Cards | COMPLETE | Liabilities + View cards; Cards view has limit, outstanding, available, util, due, min pay, status |
| Monthly flow | COMPLETE | Income, spending, savings for latest activity month on Dashboard |

**Understandable without excessive navigation?** Yes for position. Overview states NW, composition, monthly flow, and card liability without opening Accounts. Investments and card *obligations in cash-flow context* still need a drill.

**Area status: PARTIAL** — position is shown; investment and card-in-cash-flow are thin.

## B. What changed?

| Piece | Status | Why |
|---|---|---|
| Spending change | COMPLETE | Dashboard “What changed” + Spending + attention (if meaningful) |
| Net-worth change | COMPLETE | Same; plus net-worth history table |
| Historical context | COMPLETE | Net worth history and Recent months (income/spend/savings) |
| Income / savings changes | PARTIAL | History table shows other months; no “income/savings changed” headline or attention item |
| Card-related changes | PARTIAL | Payment status and utilization are current-state attention, not a change-over-time story |

**Area status: PARTIAL**

## C. Why did it change?

| Piece | Status | Why |
|---|---|---|
| Spending drivers | COMPLETE | `listSpendingChangeDrivers` on Spending and in attention |
| Underlying transactions | COMPLETE | Inspect to Transactions; monthly lists on Spending |
| Account movement | PARTIAL | Accounts show associated txns; no “this account moved NW” story |
| Card movement | PARTIAL | Cards show associated txns; outstanding is stored, not explained by those txns |
| Traceability of calculations | COMPLETE | One domain module; UI copy names assets − liabilities and income − spending |

**Area status: PARTIAL** — spending/NW why-paths exist; account/card movement stories do not.

## D. What should I pay attention to?

| Piece | Status | Why |
|---|---|---|
| Card payment attention | COMPLETE | due / overdue in `listAttentionInsights` |
| High utilization | COMPLETE | Threshold 0.7; Inspect card |
| Spending changes | COMPLETE | Meaningful direction only (unchanged excluded from attention) |
| Net-worth changes | COMPLETE | Meaningful direction only |
| Other deterministic insights | PARTIAL | PRD examples (large txn, cash reason, savings behavior) are not implemented; exact rules are OPEN |
| Evidence and Inspect | COMPLETE | Shared `AttentionInsights`; empty copy refuses a health judgment |

**Area status: PARTIAL** — the shipped attention set is complete and evidence-based; Insights as a *page* does not add explanation beyond Dashboard.

## IA comparison (do not add routes by default)

| Area | PRD expects | Current state | Status | Recommendation |
|---|---|---|---|---|
| Home / Overview | Landing snapshot | Dashboard Overview | COMPLETE | Keep; do not add a second Home |
| Accounts | Holdings | Accounts view | COMPLETE | Keep |
| Cards | First-class | Cards view | COMPLETE | Keep; fold min-pay into monthly flow, not a new route |
| Transactions | Event stream | Transactions view | COMPLETE | Keep |
| Spending | Derived spend view | Spending view | COMPLETE for spend | Keep the view |
| Income | First-class income | Stats + lists inside Spending/Dashboard | PARTIALLY COMPLETE | Reframe Spending as monthly flow — **do not add /income** |
| Savings | Derived retained money | Stat on Dashboard/Spending | PARTIALLY COMPLETE | Same surface as Income — **do not add /savings** |
| Investments | Visible in the picture | Asset line + account type | PARTIALLY COMPLETE | Inspect via Accounts/Overview — **do not add /investments** until holdings exist |
| Net Worth | Core concept | Dashboard Overview + history | COMPLETE | **Do not add /net-worth** |
| Insights | Explain, don’t repeat | Same attention list as Dashboard | PARTIALLY COMPLETE | Deepen this page; do not add more insight routes |
| Settings | Preferences later | Missing | MISSING | Defer until a preference is actually required |

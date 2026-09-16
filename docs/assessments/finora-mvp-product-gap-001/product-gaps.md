# Product gaps

Do not treat every missing PRD noun as a blocker.

## Highest-priority gaps (max 5)

### 1. Income and savings are calculation-complete, not product-complete

- **Kind:** Product gap
- **PRD:** Income & Savings; IA Income / Savings; MVP “show monthly income, spending, and savings”
- **Current:** Same formulas on Dashboard and Spending; page and nav say Spending
- **User value:** The user cannot find “income” or “savings” as a place; they can only stumble into them
- **Decision needed:** No. Do not invent new formulas. Do not add routes.
- **Complexity:** Low–Medium
- **Priority:** P1
- **Slice:** Monthly flow (reframe Spending)

### 2. Card obligations sit on Cards, not in monthly cash-flow context

- **Kind:** Product gap
- **PRD:** Cards — “obligations visible in the person's cash-flow and monthly financial context”
- **Current:** Min pay / due / status on Cards; monthly flow is income/spend/savings only
- **User value:** Upcoming card cash need is easy to miss next to “what I retained this month”
- **Decision needed:** No new card fields
- **Complexity:** Low
- **Priority:** P1
- **Slice:** Cards in monthly flow

### 3. Insights repeat the dashboard attention list

- **Kind:** Product gap
- **PRD:** “Insights should explain meaningful financial changes, not merely repeat dashboard numbers”
- **Current:** `Insights.tsx` renders the same `AttentionInsights` as Dashboard
- **User value:** Second nav item without added explanation
- **Decision needed:** New *kinds* stay OPEN. Deepening evidence for existing kinds does not require a new rule set
- **Complexity:** Medium
- **Priority:** P1
- **Slice:** Insights depth

### 4. Investments are a number, not an experience

- **Kind:** Product gap (minimum PRD); deeper holdings OPEN / trend DEFERRED
- **PRD:** Current value, NW contribution, breakdown by account when available
- **Current:** Asset line + investment accounts + `investment` events
- **User value:** User cannot inspect “what makes up that investment number” without guessing which accounts
- **Decision needed:** Instrument/holding-level remains OPEN. Account-level breakdown does not
- **Complexity:** Low–Medium
- **Priority:** P1
- **Slice:** Investment position on existing Accounts/Overview

### 5. Spending has no card-vs-bank split

- **Kind:** Product gap (PRD: “if that distinction is useful”)
- **PRD:** Spending
- **Current:** Combined expense + card_purchase
- **User value:** Cards-as-first-class is weaker if spend origin is invisible
- **Decision needed:** No — eventType already distinguishes. Not category rules
- **Complexity:** Low
- **Priority:** P1 / P2
- **Slice:** Can ship inside Monthly flow

## Product decisions (not gaps)

| Topic | Why it is not a missing feature |
|---|---|
| Category-level spending | PRD open: categorization rules. No `category` on `Transaction` |
| Liabilities beyond cards | PRD open |
| Exact additional insight kinds | PRD open |
| Auth / multi-user | PRD open; not MVP |
| Live bank aggregation | MVP exclude |
| Rewards optimization | MVP exclude / later |
| Advanced market data | MVP exclude; investments “later” for trend |
| Settings contents | Preferences, privacy, data connections not specified for MVP |

## Engineering findings that affect product delivery

These are not product requirements. They affect trust of *mutations*, not the read MVP:

- Optimistic Account/Card UI can show success before JSON persist (`App.tsx`). Matters when we ask users to treat managed balances as truth.
- Fixture-sibling store validation will block transaction *writes* later. Transactions are read-only today.

Do not schedule backend hardening as the next product slice.

## Deferred capabilities

Keep deferred unless the PRD is changed:

- Live bank aggregation / institution connectivity
- Advanced investment-market data
- Rewards optimization
- Authentication / multi-user
- Cloud database, Redis, queues, event sourcing, ledger rewrite
- Speculative AI financial advice
- New routes that only mirror PRD IA names

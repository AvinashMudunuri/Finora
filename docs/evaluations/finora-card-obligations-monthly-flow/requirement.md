# Requirement — Finora #41

## PRD source

Committed `docs/product/PRD.md`:

> The product should make card obligations visible in the person's cash-flow and monthly financial context, not only as a standalone card balance.

Related PRD / #40 assessment:

- MVP: “Show card utilization and card obligations”
- Home / Overview: card obligations should be understandable without treating Cards as the only surface
- #40 Gap 2 / roadmap Slice 2: due/overdue cards and minimum payment next to that month’s savings, with Inspect to Cards

This slice does **not** implement PRD insight type “A card obligation is approaching” as a new insight kind. Attention already uses stored `due` / `overdue`.

## What the product now shows

Inside the existing **Monthly flow** panel (Income, Spending, Savings):

1. A **Card payment** context block.
2. Copy that the amount is the **stored minimum payment** for cards whose stored status is `due` or `overdue`, and that it is **not deducted from savings**.
3. For each qualifying card: name, stored payment status label, minimum payment, stored due date, **Inspect {card name}**.
4. When none qualify: “No stored card payment is due.”

Inspect calls the existing `onOpenCard(cardId)` path (`App.tsx` sets `selectedCardId` and `view: "cards"`). No new route.

## Financial semantics (existing, not invented)

| Concept | Meaning in this product | Where |
|---|---|---|
| Card outstanding | Liability / current balance. Used in net worth and Cards. | `Card.outstandingBalance`; `calculateNetWorth` |
| Minimum payment | Stored payment obligation | `Card.minimumPayment` |
| Due date | Stored payment timing | `Card.paymentDueDate` |
| Payment status | Stored `current` \| `due` \| `overdue`. Not derived from the browser clock. | `Card.paymentStatus` |
| Monthly savings | `income - spending` for the latest activity month | `calculateMonthlySavings` |
| Card payment attention | First due/overdue card: overdue first, then original card-list order | `calculateCardPaymentAttention` |

This slice’s displayed obligation **is** the stored minimum payment on cards that already qualify for payment attention. It is **not**:

- total outstanding
- monthly spending
- card purchases
- an “after card payment” remainder
- a recommended payoff amount

`listCardPaymentObligations` lists every due/overdue card using the same filter, rank, and list-order as `calculateCardPaymentAttention`. Attention remains the first item of that list.

Savings is unchanged: **Savings = Income − Spending**.

## Out of scope

Budgeting, forecasting, bill scheduling, payment execution, bank/card connectivity, rewards, categorization, new insight types, AI advice, health scores, auth, multi-user, new APIs, new stores, migrations, Redis, queues, new routes (`/income`, `/savings`, `/investments`, `/net-worth`), Cards redesign, Dashboard redesign, net-worth formula change, calendar-based status transitions.

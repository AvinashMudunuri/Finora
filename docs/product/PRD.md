# PRODUCT REQUIREMENTS DOCUMENT

**Personal Finance & Cards App**

Product handoff for an AAEP-powered implementation project

**Status:** Working product baseline

**Purpose:** Provide product context to a separate implementation chat/project that will build the application using the Autonomous AI Engineering Platform (AAEP).

## Product Summary

This product is a premium personal-finance application that treats cards as a first-class financial domain, not as a secondary feature of a generic banking dashboard.

The application should give a person a unified, trustworthy view of their financial life: accounts, cards, cash, investments, income, spending, savings, net worth, and the insights that explain how those numbers are changing.

The product should answer four questions quickly:

- What is my financial position right now?
- What changed?
- Why did it change?
- What should I pay attention to?

## Product Vision

Build a calm, intelligent financial cockpit that helps a person understand their complete financial position without switching between bank apps, card apps, investment apps, and spreadsheets.

The product should feel precise, modern, and trustworthy. It should reduce financial clutter rather than add more of it.

## Product Principles

- Financial life first. The product is not just a card tracker or a transaction list.
- Cards are first-class. Cards have their own identity, balances, limits, utilization, obligations, and activity.
- Trust over cleverness. Numbers must be explainable, consistent, and defensible.
- Actionable insights. Insights should explain change and risk, not merely decorate the dashboard.
- Low cognitive load. The most important information should be visible without hunting.
- Progressive complexity. Simple overview first, deeper drill-down second.
- AAEP-native engineering. The product should be implemented through the Autonomous AI Engineering Platform rather than through ad-hoc coding.

## Target User & Problems

The primary user is a person with multiple financial relationships: bank accounts, credit cards, cash, and possibly investments.

The product should solve these problems:

- Financial information is fragmented across institutions and apps.
- Balances exist, but they do not add up to a clear overall picture.
- Card spending is disconnected from cash, savings, and net worth.
- People see numbers, but not the story behind those numbers.
- Important changes in spending, utilization, or card obligations are easy to miss.

## Primary Information Architecture

The product should be organized around these primary areas:

- Home / Overview
- Accounts
- Cards
- Transactions
- Spending
- Income
- Savings
- Investments
- Net Worth
- Insights
- Settings

This information architecture is the product model. The implementation may evolve the navigation, but it should preserve these concepts.

## Home / Financial Overview

The Home / Overview screen is the primary landing experience.

It should give a snapshot of the person's current financial position, including:

- Net worth
- Cash / liquid position
- Investments
- Monthly spending
- Monthly income
- Savings
- Card obligations / card snapshot
- A small number of meaningful insights

The exact visual hierarchy, grouping, and time periods should be validated in design and implementation, but the overview should never hide the person's overall position behind operational details.

## Accounts

Accounts represent the person's financial holdings and sources of funds.

The account model should support at least:

- Bank accounts
- Cash
- Investment accounts
- Other account types as the product evolves

Core account capabilities:

- Add and manage accounts
- View current balance or value
- Identify account type
- Understand how the account contributes to overall financial position
- Inspect associated transactions
- Keep the source identity of the account distinct from derived financial summaries

## Cards — First-Class Domain

Cards are not merely another account type or a filter on transactions.

A card should have its own identity and financial meaning.

A card record should support at least:

- Card identity / name
- Issuer
- Credit limit
- Outstanding balance
- Available credit
- Utilization
- Statement period
- Payment due date
- Minimum payment
- Payment status
- Rewards information where the product later supports it
- Associated card transactions

The product should make card obligations visible in the person's cash-flow and monthly financial context, not only as a standalone card balance.

## Transactions

Transactions are the event stream that explains movement across accounts and cards.

The product should support transaction inspection across:

- Income
- Expense
- Transfer
- Card purchase
- Card payment
- Investment-related activity where later supported

Transaction design principle:

- Preserve the event type separately from presentation labels or category labels.
- Do not collapse distinct financial events into a single generic "transaction" concept if that hides meaning.

## Spending

Spending is a derived financial view, not just a filtered transaction list.

The spending experience should help the user understand:

- What was spent in the selected month or period
- Where the spending went at a category level
- How much came from cards versus bank accounts, if that distinction is useful
- Whether spending is rising, falling, or unusually concentrated
- Which transactions sit underneath a spending total

## Income & Savings

Income should be visible as a first-class financial concept, not only as a transaction type.

Savings should be treated as a derived outcome of income, spending, and retained value, not as a vague motivational label.

The product should make it possible to answer:

- How much income arrived in the selected period?
- How much was spent?
- How much was retained?
- Did transfers or card payments distort the savings picture?

## Investments

Investments should appear in the product as part of the person's overall financial position.

At minimum, the product should support:

- Current investment value
- Contribution of investments to net worth
- Breakdown by account or instrument when available
- Later expansion into trend and history

The first version does not need a full brokerage product. It does need investments to be visible in the financial picture rather than omitted.

## Net Worth

Net worth is a core product concept.

The product should compute and present:

Net Worth = Assets − Liabilities

The implementation must explicitly define:

- which records count as assets
- which records count as liabilities
- how transfers, card payments, and linked accounts are prevented from double counting

Net worth should be inspectable. The user should be able to understand what produced the number.

## Insights

Insights should explain change, risk, or attention-worthy behavior.

They should not merely repeat dashboard numbers.

Examples of useful insight types:

- Spending is higher or lower than recent normal
- A card is highly utilized
- A large transaction materially affected the month
- Cash position changed for a specific reason
- Savings behavior improved or deteriorated
- A card obligation is approaching

Insight requirements:

- Each insight should be evidence-based
- The user should be able to trace the insight back to the underlying records
- Insights should stay small in number and high in usefulness

## Settings

Settings should support:

- User preferences
- Account and card configuration
- Category management as the product evolves
- Privacy / security settings
- Data connection or data-source controls if later added

## MVP Boundary

The first product version should optimize for a trustworthy read-and-understand experience.

MVP should include:

- Create and manage accounts and cards in a controlled data model
- View balances and transactions
- Compute net worth from the underlying records
- Show monthly income, spending, and savings
- Show card utilization and card obligations
- Allow the user to inspect the transactions behind the totals
- Surface a small number of deterministic insights
- Present a polished overview of the person's financial position

MVP should not require:

- Live bank aggregation
- Full institution connectivity
- Advanced market-data systems
- Rewards optimization engines

unless those are separately specified later.

## AAEP Implementation Strategy

This PRD is the product source of truth. AAEP is the engineering mechanism.

The implementation should follow this loop:

1. Product requirement
2. Implementation task
3. Code / artifact generation
4. Validation
5. Engineering check / test
6. Evaluation
7. Repair
8. Re-validation
9. Completion

Do not force the product requirements into existing AAEP abstractions if those abstractions are the wrong shape. Adapt the engineering layer to the product, not the other way around.

## Suggested Product Build Sequence

1. Domain model for accounts, cards, transactions, and derived financial concepts
2. Deterministic fixture data
3. Overview / financial-position slice
4. Cards slice
5. Transactions slice
6. Spending / income / savings slice
7. Insights slice
8. End-to-end AAEP quality loop

## Non-Functional Requirements

- Correctness
- Traceability
- Security
- Privacy
- Reliability
- Auditability
- Maintainability
- Responsive user experience

## Product Decisions Still Open

The following items remain open and should not be silently invented:

- Product name / brand
- Geography and institution scope
- Whether the first version is fully manual, imported, or live-connected
- Exact card product model and supported card types
- Categorization rules
- Whether liabilities beyond cards are in MVP
- Depth of investment support
- Exact insight generation rules
- Authentication / account model
- Monetization
- Mobile-first versus web-first priority

## MVP Acceptance Criteria

The first product version is successful if:

- A user can understand their current financial position from the overview
- Net worth is computed from the underlying financial records
- Cards are presented as a first-class domain
- The user can see card balance, limit, utilization, and obligation
- The user can inspect the transactions behind spending and card activity
- Income, spending, and savings are visible and internally consistent
- Insights explain change or risk with evidence
- The overview is usable without needing to inspect every account individually
- Automated tests cover the core calculations and user workflows

## Relationship to AAEP

- Product requirements live in this PRD
- Engineering architecture lives in the AAEP repository
- Implementation state lives in the financial app Git repository
- Engineering execution happens through AAEP workflows
- Product decisions should be recorded in committed product artifacts or discussion, not only in chat

## Provenance & Scope Note

This document reconstructs the prior project context for a new implementation chat.

It is intentionally written as a working product baseline, not as a claim that every detailed implementation decision has already been finalized.

Where a decision is still open, it is marked as open rather than invented.

## Appendix A — Candidate First AAEP Product Workflow

A good first AAEP workflow for this product is:

1. Generate the domain model
2. Generate fixture data
3. Generate the net-worth calculation
4. Generate the card-utilization calculation
5. Generate the monthly-spending calculation
6. Generate validation / tests
7. Run AI evaluation
8. Repair if needed
9. Re-run tests
10. Mark the first product slice complete

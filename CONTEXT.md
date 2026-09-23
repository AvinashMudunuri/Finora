# Finora glossary

**Account** — stored bank, cash, or investment position. Balance is stored, not reconstructed from transactions.

**Card** — stored credit card. Outstanding, limit, minimum payment, due date, and payment status are stored fields. There is no Bill type.

**Transaction** — a stored financial event (`income`, `expense`, `transfer`, `card_purchase`, `card_payment`, `investment`, or `unknown`). Amount is always positive. Direction for display may come from an import line; calculations use event type.

**unknown** — imported event that could not be classified. It is not income, spending, or savings. It must not be guessed into those buckets.

**Statement** — metadata for one imported file (institution, masked identity, period, counts, status). Not a transaction and not an insight.

**User ledger** — consumer-owned accounts, cards, transactions, and statements. Isolated from demo fixtures.

**Demo ledger** — `fixtureAccounts`, `fixtureCards`, `fixtureTransactions`. Test and evaluation oracle. Never mixed with the user ledger.

**Spending** — `expense` + `card_purchase` only. Transfers, card payments, investment events, and `unknown` are not spending.

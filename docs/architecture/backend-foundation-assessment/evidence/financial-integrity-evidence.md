# Financial integrity evidence (HEAD 6c9160b)

## Single calculation module

`src/domain/calculations.ts` is the source for:

- `calculateNetWorth` (assets = bank+cash+investment balances; liabilities = card outstanding)
- `calculateCardUtilization` / available credit (`limit - outstanding`)
- high utilization threshold 0.7
- payment attention
- monthly spending / income / savings
- spending change and drivers
- net worth change and evidence

UI (`Dashboard`, `Spending`, `Insights`, `Cards`) imports these functions.
Server integration tests (`server/calculations.integration.test.ts`,
`cardCalculations.integration.test.ts`, `transactionCalculations.integration.test.ts`)
assert the same functions over store-loaded data. The HTTP layer does not
reimplement the math.

## Validation module

`src/domain/validate.ts`:

- `assertValidFinanceData` — unique IDs; card availableCredit consistency;
  transaction relationship rules by `eventType`
- `createAccount` / `updateAccount` / `createCard` / `updateCard`
- `availableCredit` derived at build time: `creditLimit - outstandingBalance`

Transaction relationship rules (domain, not stores):

- income/expense: exactly one `accountId`
- investment: account must be type `investment`
- transfer: two distinct accounts, no card
- card_purchase: only `cardId`
- card_payment: funding `accountId` + `cardId`

IDs are stable strings. Updates keep `current.id`. Creates allocate
`acc-N` / `card-N`.

## Product model (not a defect)

Card outstanding and account balances are **stored fields**, not derived from
transactions. Changing a card outstanding changes net worth without rewriting
transactions. Fixture transactions exist for history/insights, not as a
double-entry ledger that must reconcile to balances.

## Optimistic mutation (Accounts and Cards)

`App.handleCreateAccount` / `handleUpdateAccount` / card equivalents:

1. Domain validate locally
2. Apply to React state immediately
3. Return `{ ok: true }` to the form
4. `void persistRemote*` — HTTP in the background
5. On HTTP failure: set load-error banner; optimistic row remains until reload

A successful form result does **not** guarantee durable JSON write.
Reload after a failed persist drops the optimistic entity (backend never stored it).

## Cross-entity writes

No current product operation writes more than one store per request.
Transactions have no mutation API. Cross-store transactions are not required today.

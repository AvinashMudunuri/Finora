# Runtime robustness

## Existing behavior (authoritative)

- Missing first account/card/transaction uses `accounts[0]?.id ?? ""` (and the card/transaction equivalents). Empty lists already have UI copy in Accounts / Cards / Transactions / Insights.
- Gateway `list()` failures set `systemNotice` (`ACCOUNT|CARD|TRANSACTION_UNAVAILABLE_MESSAGE`) and keep bootstrap/fixture state on screen.
- HTTP mutate helpers catch network/parse failures and return `{ ok: false, errors: { form } }`. Persistence try/catch surfaces form errors; it does not throw through React.
- Domain validation (`createAccount`, `updateCard`, …) is the write boundary.

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| R-1 | HIGH | No application error boundary. A render throw unmounted the tree to a blank `#root`. | **Fixed.** `AppErrorBoundary` + Reload. Copy states stored records were not changed. Test: `AppErrorBoundary.test.tsx`. |
| R-2 | MEDIUM | Gateway load `catch` blocks swallowed the error object (user saw notice, console did not). | **Fixed.** `console.error("Finora could not load …", error)` then the existing notice. |
| R-3 | INFORMATIONAL | `persistRemoteAccount` / `persistRemoteCard` use `.then` without `.catch`. HTTP gateways already catch and return `ok: false`. | Not a defect at the current trust boundary. |
| R-4 | INFORMATIONAL | Optimistic local write + later remote failure leaves local state ahead of the JSON store and sets `systemNotice`. Existing semantics. | Not a defect. Do not invent sync/rollback. |
| R-5 | INFORMATIONAL | Empty / overdue / high-util / no-attention paths already have e2e fixture builds and unit tests. | Verified. No new empty-state product copy. |

## Not changed

Financial calculations, fixture shape assumptions, and empty-state wording. Existing calculation behavior remains authoritative.

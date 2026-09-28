# Implementation summary

Two shared-path fixes. `src/domain/calculations.ts` is unchanged.

## 1. PDF payment status

`inferPaymentStatus` (`pdf.ts`) now matches only:

- `payment status: overdue`
- `payment status: due`
- `payment status: current`

`Payment due date` no longer supplies `\bdue\b`. A file that says **Payment status: current** plus a due-date line stays `current`. A due-date line with no status line leaves `paymentStatus` undefined (card create still refuses invented status).

## 2. Review ↔ persist type

`resolvePersistedEventType` is the single rule for transfer / card_payment funding.

- Preview and review display that resolved type.
- `persistImport` refuses when a classified transfer or card payment would persist as `unknown`.
- Confirm is disabled until a funding/counterparty account is chosen (or the message is shown when none exist).

The user cannot confirm **Transfer** and store **unknown**.

## Not changed

Warnings UI, mapping-before-confirm, renamed-file duplicates, undo, Create/identity matching, XLSX/OFX, formulas, routes, stores.

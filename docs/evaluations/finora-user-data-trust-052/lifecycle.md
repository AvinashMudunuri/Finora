# Data lifecycle

```
File (CSV | text PDF)
  → detectExtractor
  → extract (csv.ts | pdf.ts)     extracted records + warnings
  → optional column map           may write columnMappings to localStorage
  → classifyLines                 classified records (keyword lexicon)
  → reconcileStatement            opening/closing check (mismatch shown)
  → splitDuplicates               preview counts (partyId from UI / first party)
  → preview + review UI           inspect-only
  → persistImport                 confirmed ledger events
  → finora.user-ledger.v1
  → App overlay (shownAccounts / shownCards / shownTransactions)
  → existing calculations.ts
  → Dashboard / Accounts / Cards / Transactions / Spending / Insights
```

## Four data kinds (do not collapse these)

| Kind | What it is | Where it lives |
| --- | --- | --- |
| Source file | Bytes the user picked. Never stored. | Memory during the wizard only |
| Imported records | Extracted/classified lines, then persisted `Transaction` rows with `source: "import"` | `UserLedger.transactions` + `statements` |
| Demo fixture data | Bundled snapshot. Unchanged by import | In-memory `accounts` / `cards` / `transactions` from fixtures |
| Calculated values | Net worth, income, spending, savings, card attention | Derived at render from the **shown** ledger |

`Show demo data` / `Show imported data` switches which ledger the six surfaces read. It does not delete the user ledger.

## Where data can be lost

- CSV rows without a usable date/amount become `warnings` and are dropped. The user never sees the warning.
- Scanned PDFs error out; no records.
- Transfer / card_payment without a funding account persist as `unknown`, not as the preview type.
- Cancel / Back clears the wizard. Mapped columns already written (map path) are **not** reverted.
- There is no undo after confirm.

## Where data can be duplicated

- Same file + same account: line fingerprints block persist.
- Same file + Create: same `sourceFileId` → validate rejects duplicate ids (cryptic error).
- **Renamed file + Create:** new `sourceFileId` + new `acc-imp-N` → duplicate events (`evidence/duplicate-renamed-file.json`).
- Demo and imported ledgers are not mixed; toggling cannot duplicate across them.

## Where data can become inconsistent

- Preview duplicate counts use `accounts[0]` when Create is selected; persist may create a new party.
- Review type can disagree with persisted `eventType`.
- PDF `paymentStatus` can disagree with the statement’s “Payment status: current” line.
- `identifyParty` substring match can attach a statement to a different card/account than the Create label.
- Account balance is last running-balance / closing / `0`, not a reconciled cash position. The HDFC sample closing is `-$23,087.42` while August savings is `+$3,112.58`.
- History stores `fileName` but the UI does not show it.

## Calculations

Import does not rewrite formulas. `unknown` is omitted from income/spending because those functions still key off `income` and `expense | card_purchase`. Card `due` / `overdue` still drive Dashboard and Insights attention. Finding 1 can therefore change attention without changing spending math.

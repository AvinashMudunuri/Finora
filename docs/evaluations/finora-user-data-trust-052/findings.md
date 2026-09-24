# Findings — User Data Trust & Import Review

Product source was not modified. Prior limitations were re-verified, not repaired.

**Review verdict for human gate:** material A / B / C defects exist. **STOP.** Do not start a next product increment. Do not implement these here.

## Material repair candidates

Only issues that change whether a consumer can trust imported data before building on it.

### 1. PDF `paymentStatus` invented from “Payment due date” — **A**

**Finding.** `inferPaymentStatus` (`pdf.ts`) returns `"due"` when the text contains both `\bdue\b` and `payment status`. A line `Payment due date: 2026-09-22` supplies `\bdue\b`. The later `payment status: current` branch never runs.

**Evidence.** `evidence/payment-status-probe.json`. Input with **Payment status: current** plus a due-date line produced `paymentStatus: "due"`. `pdf.test.ts` only covers a statement that already says due.

**Affects financial semantics?** Yes, card attention — not income/spending/net-worth formulas.

- `applyCardFacts` copies `paymentStatus` onto the card (`service.ts`)
- `listCardPaymentObligations` / `calculateCardPaymentAttention` treat `due` | `overdue` as attention (`calculations.ts`)
- Dashboard monthly-flow **Card payment** uses those obligations
- Insights emit `card-payment-due`

Income, spending, transfers-exclusion, and card-purchase formulas are unchanged.

**Severity.** Correctness. A current card can look due after a normal statement PDF.

**Smallest correction.** Match only `payment status\s*[:-]\s*due` (keep overdue first). Do not treat `\bdue\b` anywhere in the file. Add one parser test: current + “Payment due date” → `current`.

**Separate increment.** Yes.

---

### 2. Review type ≠ persisted type — **A / B**

**Finding.** Review shows NEFT as **Transfer**. After confirm it is stored as `unknown` (“Needs review”) because no funding/counterparty account was chosen. The funding selector is hidden when the user ledger has no accounts yet (first import).

**Evidence.** Browser review table: `NEFT to ICICI Savings` / Transfer. `evidence/ledger-after-confirm.json`: `eventType: "unknown"`. History status becomes **Needs review**. `toTransaction` in `service.ts` downgrades transfer/card_payment without `fundingAccountId`.

**Severity.** The user confirmed a Transfer and received an untyped $31,000 debit. They cannot correct it.

**Smallest correction.** Preview/review must show the persist outcome (“Needs review — choose a funding account”) or refuse confirm until the user picks one. Do not add a type editor in the same change.

**Separate increment.** Yes.

---

### 3. Same statement under a new file name can duplicate the ledger — **A / C**

**Finding.** Duplicate detection is `partyId + date + amount + description` on `source === "import"` rows. `sourceFileId` also includes **file name**. Preview duplicate counts use `selectedAccountId || ledger.accounts[0].id`. Persist with **Create from statement** calls `identifyParty`; a CSV with no institution/name creates `acc-imp-N`.

| Re-import | Result |
| --- | --- |
| Same file name + same account | Blocked: “Those transactions are already imported.” |
| Same file name + Create | Blocked later by `Duplicate transaction id` (same `sourceFileId`) — not the consumer copy |
| **Renamed file + Create** | **Persists:** second account + 3 more events |

**Evidence.** `evidence/duplicate-create-path.json`, `evidence/duplicate-renamed-file.json`. Browser re-import of `hdfc-savings.csv` showed **0 new · 3 already imported** while **Create from statement** stayed selected and the button read **Import 0 new transactions**. Confirm of that path was not clicked in the browser; the renamed-file probe is the persist proof.

**Severity.** Next month’s download is usually a new file name. “Create from statement” is the default. Re-import is not safe.

**Smallest correction.** When the UI says Create, do not treat `accounts[0]` as the preview party. Fingerprint lines without requiring a new `partyId` for already-imported date/amount/description, **or** block persist when `sourceFileId` already exists. Do not invent a global transaction identity model beyond that.

**Separate increment.** Yes.

---

### 4. Warnings stored, never shown — **B** (prior finding, still true)

**Finding.** `extractCsvStatement` pushes skipped-row reasons into `statement.warnings`. `StatementImport` never reads `warnings`. Reconciliation **mismatch** is alerted; skipped rows are not. `persistImport` sets `partially_imported` when `warnings.length > 0` after confirm.

**Affects import correctness?** Skipped rows never become events. The user cannot see that a row was dropped. Status can become “Partially imported” with no explanation.

**Should they block confirm?** Not from current semantics — they are informational. They **must** be visible before confirm.

**Smallest correction.** Render `statement.warnings` on preview/review. Do not invent severity or block rules.

**Separate increment.** Yes.

---

### 5. Column mappings can persist before confirm — **C** (prior finding, still true)

**Finding.** Auto-detect path does **not** write `finora.user-ledger.v1` (browser: ledger key absent on preview). `confirmMapping` calls `onLedgerChange(rememberColumnMapping(...))`, which `writeUserLedger`s. Copy still says “Nothing is stored until you confirm.” `reset()` / Back does not revert mappings. A later file with the same headers reuses the stored map.

**Severity.** Accidental persistence and privacy of mapping choices; stale maps after cancel. Transactions are not written.

**Smallest correction.** Keep the mapping in component state until `persistImport` succeeds; write it in that same persist. Change the copy to match.

**Separate increment.** Yes. Do not redesign storage.

---

### 6. No recovery after confirm — **C**

**Finding.** There is no undo, delete-statement, or `clearUserLedger`. **Show demo data** hides the user ledger; it does not delete `finora.user-ledger.v1`. Wrong account, invented due status, or a duplicate import stay until the user clears site data.

**Severity.** Consumers cannot recover from a mistaken confirm.

**Smallest correction.** Delete last imported statement + its `sourceFileId` rows + created empty party if unused. That is a small increment, not this review.

**Separate increment.** Yes.

---

### 7. Silent identity match vs “Create from statement” — **A / C**

**Finding.** Empty `selectedAccountId` / `selectedCardId` looks like Create. `resolveIdentity` then runs `identifyParty`. One name/issuer substring match attaches to the existing party and `applyCardFacts` / `applyAccountBalance` overwrite stored facts. Two Visa cards can collapse via issuer substring (`identify.ts` is untested).

**Severity.** Transactions can land on the wrong card/account without an explicit pick. CSV first-import usually creates (no name). Card PDFs with an issuer line are the risk.

**Smallest correction.** Honor the UI: empty selection means create; only match when the user picked a party, or when identify returns a match **and** the UI shows that match as selected.

**Separate increment.** Yes.

## Other findings (not repair-now)

| ID | Class | Summary |
| --- | --- | --- |
| 8 | B | Preview omits file name. History stores `fileName` but shows `Imported statement · Imported account`. Institution paragraph is empty for typical CSV. |
| 9 | B | Review is inspect-only. Date, amount, account, event type cannot be corrected. Document as follow-up capability, do not add it here. |
| 10 | B | Duplicate lines are a count, not a list. Rejected rows have no count on preview. |
| 11 | B | Review table needs horizontal scroll at 320–414 (`.history-table-wrap`). Page `scrollWidth` does not overflow. |
| 12 | A | New account `balance: closingBalance ?? 0`. Sample CSV closing is the last running balance (`-23087.42`). Missing closing becomes `$0`. |
| 13 | F | CSV `currency` is always `"USD"` (`extractCsvStatement`). Known single-currency ceiling. |
| 14 | F | Text PDF is a `Tj` + `DATE desc AMT CR\|DR` parser. Not a bank-PDF product. No OCR. |
| 15 | F | No XLSX, OFX, aggregation, auth, new routes, new insight kinds, new formulas. |
| 16 | D | Duplicate / cancel / mapping-before-confirm behavior is not explained to the user. |
| 17 | E | Type correction, undo, statement-level identity, real bank-PDF parsing. |
| 18 | F | Card create still refuses missing outstanding / min / due / periodEnd / paymentStatus and user credit limit. Those fields are not invented — except payment status via finding 1. |

## What is already trustworthy

- Confirm is required before transactions persist (auto-detect path writes nothing).
- Demo fixtures stay in memory; user ledger is `finora.user-ledger.v1`.
- After HDFC CSV confirm, Spending/Dashboard use **existing** formulas: August income `$3,200.00`, spending `$87.42`, savings `$3,112.58`. NEFT `$31,000` is not spending. Card purchases `$0.00`. Account-funded `$87.42`.
- Demo fixture totals are unchanged (`calculations.ts` not in this increment). **Show demo data** returns the fixture transaction list.
- Same file + same account cannot double-import line fingerprints.
- Six destinations unchanged. Import stays on Transactions.

## Classification key

- **A** Correctness defect  
- **B** UX defect  
- **C** Data-safety defect  
- **D** Documentation / operational  
- **E** Future capability  
- **F** Intentional limitation  

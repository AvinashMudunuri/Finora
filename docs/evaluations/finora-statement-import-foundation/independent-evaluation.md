# Independent evaluation — Finora statement import foundation

## Verdict

**PASS WITH LIMITATIONS**

The slice is a real CSV → preview → review → confirm → `finora.user-ledger.v1` path that stays off demo fixtures and does not rewrite `isSpendingEvent` / income / spending formulas. It is not a complete consumer statement product, and several implementer claims are overstated or only unit-true.

This evaluator did not implement the slice. Product source was not modified. Defects were not repaired.

## Scope

- Worktree: `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready`
- Branch: `aaep/finora-statement-import`
- Claimed baseline: `origin/main` `7f3f780`
- Verified HEAD: `7f3f78073dc649f8dd94c23ea6a38925b1a35fba` (*Harden Finora for production readiness… (#50)*). The entire import slice is **uncommitted**.
- `git diff 7f3f780 --stat` only shows eight already-tracked files (`App.tsx`, `App.test.tsx`, `Transactions.tsx`, `finance.ts` / `.test.ts`, `types.ts`, `validate.ts`, `index.css`). The pipeline (`src/application/import/**`, `StatementImport.tsx`) is untracked, so `--stat` understates the slice. Judge the working tree, not that stat alone.
- `src/domain/calculations.ts` is **not** in the diff.
- Leftover untracked `docs/architecture/finora-production-data-foundation/` and `CONTEXT.md` are not this slice. They were not used as evidence.

Independent gates this evaluator ran:

| Gate | Result |
| --- | --- |
| `npm test` | 46 files, **439 passed** |
| `npm run typecheck` | passed |
| `npm run lint` / `npm run build` / browser `:4175` | **not re-run**. Relied on `validation.md` for those. Overflow JSON was not independently reproduced. |

## What holds

1. **CSV select → parse → preview → review → confirm.** `StatementImport` accepts `.csv`; `App.test.tsx` uploads a two-row HDFC-shaped CSV, asserts preview totals, review, persist, then Accounts shows `Imported account` and demo payroll is gone until **Show demo data**.
2. **Nothing financial persists until confirm — almost.** `persistImport` is the only transaction write. `applyUserLedger` in `App.tsx` will not flip `useImportedLedger` while `statements.length === 0`. Column mappings are the exception (below).
3. **Demo fixtures stay isolated.** Confirmed imports write `USER_LEDGER_STORAGE_KEY` (`finora.user-ledger.v1`) via `store.ts`. `App.tsx` overlays `shownAccounts` / `shownCards` / `shownTransactions`. `service.test.ts` asserts `fixtureTransactions` length 15 and `Everyday Checking` unchanged. `App.test.tsx` switches back to demo.
4. **Six surfaces can read the imported ledger.** Overlay is wired for Accounts, Cards, Transactions, Spending, Insights, and Dashboard. App test only proves Transactions + Accounts. Spending/Dashboard after import are code-wired, not UI-tested.
5. **Transfers are not income or spending.** `classify.test.ts` keeps NEFT out of `previewTotals.spending`. `persistImport` + `calculateMonthlySpending` in `service.test.ts` is `$87.42` with the `$31,000` NEFT present. `isSpendingEvent` is still `expense || card_purchase` (`calculations.ts`). `calculateMonthlyIncome` still keys off `eventType === "income"` only.
6. **`unknown` is excluded by omission, not by a new formula.** `TransactionEventType` gained `unknown`; `validate.ts` allows it; `eventTypeLabel("unknown")` is `"Needs review"` (`finance.test.ts`). There is **no** `calculations.test.ts` case for `unknown`. Exclusion is true because income/spending were not rewritten.
7. **Card create does not invent credit limit, outstanding, min, due date, period end, or payment status.** `persistImport` refuses each missing field (`service.ts` `resolveIdentity`). `service.test.ts` covers credit-limit refusal and preserve-when-supplied for a fully populated card statement. Missing outstanding / min / due / periodEnd / paymentStatus are **code-guarded, not tested**.
8. **Duplicates.** `duplicates.test.ts` + `persistImport` reject a second identical bank file (`service.test.ts`). Fingerprint is date + amount + description + party, and only `source === "import"` rows count.
9. **No bank aggregation.** No Plaid / Yodlee / MX / Open Banking in `src/`. File stays on-device (`security-boundary.md` is honest: not production-grade).
10. **XLSX / OFX are type-only.** `StatementKind` includes `xlsx` \| `ofx`. `STATEMENT_EXTRACTORS` implements `csv` and `pdf` only. File input `accept` is CSV/PDF.
11. **Existing fixture totals were not rewritten.** `calculations.test.ts` still expects net worth `$23,168.43`, September income `$3,200.00`, September spending `$87.42`.

## What does not hold, or only holds with caveats

### Warnings are not shown

Requirement “see warnings” is not met in the UI. `extractCsvStatement` pushes skipped-row reasons into `statement.warnings`. `StatementImport.tsx` never reads `warnings`. A reconciliation **mismatch** is alerted; skipped opening/closing (`reconcile` `skipped`) is silent. `partially_imported` can be stored because `warnings.length > 0` (`service.ts`) while the consumer never saw the skipped rows.

Review is inspect-only. Event types cannot be corrected before confirm.

### Payment status is invented from “Payment due date”

`inferPaymentStatus` (`pdf.ts`) returns `"due"` when the text contains both `\bdue\b` and `payment status`. “Payment due date” matches `\bdue\b`, so a statement that says **Payment status: current** plus a due-date line is stored as `"due"`. The `"current"` branch is dead whenever a due-date phrase exists. `pdf.test.ts` only uses a statement that already says `due`, so the bug is hidden.

Min / due date / outstanding are copied when present (`pdf.test.ts`, `service.test.ts`). Payment status is not safe.

### Multiple accounts: code only

`acc-imp-${accounts.length + 1}` will append a second bank. There is no test that two statements become two accounts, and no identify test (`identify.ts` is untested). Card match is a substring on name or issuer — a second Visa can attach to the first.

### Text PDF is a parser demo, not a consumer PDF product

`StatementImport.test.tsx` only rejects a scanned-looking PDF. There is no UI test that a text PDF previews and confirms. `pdf.test.ts` uses hand-written line-oriented `DATE desc AMT CR|DR` text. The evidence file `evidence/samples/text-card-statement.pdf` is a synthetic Tj dump, not a bank PDF. Known-limitations on OCR / image PDFs are accurate and binding.

### Browser 320–1440 is implementer-asserted

`evidence/overflow-evidence.json` is a scrollWidth table with **no screenshots**. `validation.md` spending `$87.42` after CSV import was not re-run here. Stale-SW unregister is an evaluation-environment story, not proof the preview is clean for a real consumer.

`App.test.tsx` CSV omits the NEFT row, so the UI path never proves transfer exclusion. That `$87.42` claim is `service.test.ts` + implementer browser notes, not the App test.

### “Nothing persists until confirm” is false for mappings

`confirmMapping` calls `onLedgerChange(rememberColumnMapping(...))`, which `writeUserLedger`s to `localStorage` before import confirm. No transactions yet, and the UI stays on demo until a statement exists — but device state is written.

## Invented product decisions (not implied by existing Finora)

| Decision | Where | Problem |
| --- | --- | --- |
| CSV currency is always `"USD"` | `extractCsvStatement` | HDFC-named sample is still USD. Currency is invented, not read. |
| New account balance `closingBalance ?? 0` | `service.ts` | Invents `$0` when the file has no running balance. |
| Transfers / card payments without a user-picked counterparty persist as `unknown` | `toTransaction` | Documented. Prevents invalid `transfer` / `card_payment` rows. **Not unit-tested.** `service.test.ts` card persist only asserts a `card_purchase` exists. |
| Keyword classification (payroll, NEFT, POS, …) | `classify.ts` | Invented lexicon. Ambiguous credits become `unknown` (tested). |
| Date `MM/DD` vs `DD/MM` swap when month > 12 | `parseFlexibleDate` | Invented heuristic; `01/02/2026` is always January 2. |
| `CurrencyCode` widened from `"USD"` to `string` | `types.ts` | Domain loosening so import can store INR later. CSV still forces USD. |
| Identity match by name/issuer substring | `identify.ts` | Invented; untested. |
| Statement history lives on Transactions | `StatementImport` | Not a seventh destination. Fine, but invented IA. |
| Review cannot edit event type | `StatementImport` | “Review” is a table, not a correction step. |

## Claim check (do not rubber-stamp)

| Claim | Verdict |
| --- | --- |
| 439 tests passed | **Confirmed** this run |
| typecheck passed | **Confirmed** this run |
| lint / build / PWA `generateSW` 32 entries | **Not re-run**; `validation.md` only |
| Browser CSV on `:4175` after SW unregister | **Not re-run**; no screenshots |
| Spending after import `$87.42` | True in `service.test.ts` for the three-line bank fixture. App test does not open Spending. |
| `unknown` excluded from income/spending | True by existing formulas; **no dedicated calculation test** |
| Card create requires user `creditLimit` + statement outstanding/min/due/periodEnd/paymentStatus | True in `resolveIdentity`. Only credit-limit refusal is tested. Parser can still invent `paymentStatus: "due"` |
| Transfers without counterparty persist as `unknown` | True in `toTransaction`. **No test asserts the persisted `eventType`** |
| XLSX/OFX reserved on extractor interface only | **True** |
| Leftover `docs/architecture/finora-production-data-foundation/` is not this slice | **True** (untracked leftover; different branch name in its README) |

## Required consumer outcomes

| Outcome | Result |
| --- | --- |
| Select CSV | Pass (`App.test.tsx`) |
| Select text PDF | Partial (input + parser + scanned reject; no UI success path) |
| Parse / preview / review / confirm | Pass for CSV; PDF unit-only |
| See warnings | **Fail** (warnings unused in UI) |
| Avoid duplicates | Pass for re-import of the same imported lines |
| See imported account / transactions | Pass (`App.test.tsx`) |
| See imported spending / dashboard | Wired; **not UI-tested** |
| Card min/due/outstanding preserved, not invented | Pass when supplied; create refuses omissions (under-tested) |
| Multiple accounts | Code only |
| Transfers out of income/spending | Pass (classify + persist math) |
| Preserve existing calculations | Pass (`calculations.ts` untouched) |
| Demo fixtures isolated | Pass |
| No bank aggregation | Pass |
| Tests / typecheck | Pass (this run) |
| Lint / build | Not independently verified |
| Work at 320–1440 | Overflow JSON only; **weak** |

## Verdict rationale

FAIL would require a broken persist path, fixture mutation, a calculation rewrite, or aggregation. None of those are present.

PASS would require the implementer claims to stand without caveats. They do not: warnings are invisible, payment status can be invented, PDF/UI/multi-account/Spending/Dashboard/320–1440 evidence is thin, and several persist rules are untested.

**PASS WITH LIMITATIONS** is the honest bar: a working CSV foundation with an honest security ceiling, plus a narrow text-PDF extractor that should not be sold as bank-PDF support.

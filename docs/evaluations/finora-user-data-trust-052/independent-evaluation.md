# Independent evaluation — Finora #52 user data trust

## Verdict

**FAIL**

Imported data can be confirmed as one thing and stored as another, silently duplicated under a new file name, and left with no consumer recovery. That is not a trustworthy import, even though the CSV happy path persists and existing income/spending formulas were not rewritten.

This evaluator did not implement statement import and did not write the #52 review package. Product source was not modified. Defects were not repaired. No next increment was started.

PASS is unavailable: the review bar is no material A/B/C trust defect. Several are independently confirmed on the shipping path, including the sample HDFC CSV.

## Scope

| Item | Result |
| --- | --- |
| Worktree | `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready` |
| Branch | `aaep/finora-statement-import` |
| HEAD | `4817ea48aa982919c3033fdacee636c48c74dc7d` — *Add CSV and text-PDF statement import without mixing demo fixtures* |
| Baseline | `7f3f780` |
| `git diff 7f3f780 -- src/domain/calculations.ts` | **Empty.** Formulas were not rewritten. |
| Git | No commit/push. Only this file added under the review package. |

Read: this package (README, findings, lifecycle, requirement-to-evidence, validation, known-limitations, evaluatorPrompt, evidence JSON), prior `docs/evaluations/finora-statement-import-foundation/independent-evaluation.md`, and product `pdf.ts` / `csv.ts` / `service.ts` / `duplicates.ts` / `identify.ts` / `store.ts` / `StatementImport.tsx` / `calculations.ts` (`listCardPaymentObligations`, `isSpendingEvent`).

Independent probes (read-only `node --experimental-strip-types`; no product change):

| Probe | Result |
| --- | --- |
| `parsePdfStatement` with **Payment status: current** + **Payment due date** | `paymentStatus: "due"` |
| HDFC CSV first persist | 3 rows; types `income`, `expense`, `unknown`; status `needs_review` |
| Same file + Create | `Duplicate transaction id: stmt-33610ca4-1` |
| Same file + same account | `Those transactions are already imported.` |
| Renamed file + Create | `acc-imp-1` + `acc-imp-2`, 6 events, types duplicated |
| Skipped CSV date row | warning `"A row is missing a usable date."` |
| `identifyParty` two Visa issuers | `ambiguous` (does **not** collapse) |
| `identifyParty` one Visa issuer | silent match to that card |

`npm test`, lint, build, and browser `:4175` were **not** re-run. `validation.md` 439/pass claims and `browser-evidence.json` notes are implementer-asserted. The `evidence/screenshots/` directory named in README is empty.

## Prior PASS WITH LIMITATIONS — not silently repaired

The foundation evaluator’s defects are still in HEAD. This review did not fix them; it documented them.

| Prior finding | Still true? | Where |
| --- | --- | --- |
| Warnings unused in UI | **Yes** | `csv.ts` `warnings.push`; `StatementImport.tsx` never reads `statement.warnings` |
| `inferPaymentStatus` invents `due` from “Payment due date” | **Yes** | `pdf.ts` lines 174–184; `pdf.test.ts` still only uses a statement that already says `due` |
| Identify untested; substring match | **Yes** | no `identify.test.ts`; `matchesCard` is name **or** issuer `includes` |
| Transfers without funding persist as `unknown` | **Yes**, and now persist-proven | `toTransaction`; independent probe + `ledger-after-confirm.json` |
| Mapping write before confirm | **Yes** | `confirmMapping` → `rememberColumnMapping` → `writeUserLedger` |
| CSV currency always `"USD"` | **Yes** | `extractCsvStatement` |
| New account `closingBalance ?? 0` | **Yes** | `service.ts` |
| Text PDF is not a bank-PDF product | **Yes** | known-limitations still binding |
| No dedicated `unknown` calculation test | **Yes** | `isSpendingEvent` still `expense \|\| card_purchase` |

Nothing in `4817ea4` vs the prior tree looks like a silent repair of those items. `calculations.ts` is unchanged.

## Pressure-test of `findings.md`

The implementer’s STOP and the seven material candidates are mostly earned. A few claims are sharper or weaker than written.

### Finding 1 — PDF `paymentStatus` — **holds. A.**

`inferPaymentStatus` returns `"due"` when `/\bdue\b/` and `/payment status/` both match, **before** the `payment status: current` branch. A normal card PDF that names a due date and says current is stored as due.

Independent probe: input with both lines → `"due"`. Downstream is real: `applyCardFacts` copies it; `listCardPaymentObligations` / `calculateCardPaymentAttention` treat `due|overdue` as attention. Income/spending formulas are untouched — that does not make a false “card payment due” trustworthy.

`pdf.test.ts` still hides the bug. Smallest correction named by the implementer is the right size.

### Finding 2 — Review type ≠ persisted type — **holds, and is worse than the write-up on the sample. A/B.**

`classify.ts` marks NEFT as `transfer` with `needsReview: false`. Review therefore shows **Transfer** and **0 need review** (`eventTypeLabel("transfer")`). First import has `ledger.accounts.length === 0`, so the funding selector is not rendered. `toTransaction` then downgrades transfer without `fundingAccountId` to `unknown`.

Independent persist of `hdfc-savings.csv`: types `income`, `expense`, `unknown`; statement status `needs_review`. Matches `ledger-after-confirm.json` and `browser-evidence.json`.

The user confirms a Transfer and receives an untyped $31,000 debit — the **largest** line on the sample statement. There is no type editor after. `service.test.ts` still does not assert the persisted NEFT `eventType`.

### Finding 3 — Renamed file + Create duplicates — **holds. A/C.**

Fingerprint is `partyId + date + amount + description` on `source === "import"` (`duplicates.ts`). Preview party when Create is selected is `ledger.accounts[0]` (`StatementImport.refreshPreview`). Persist with empty `selectedAccountId` creates `acc-imp-N`. `sourceFileId` includes **file name**.

Independent probe matches the package JSON: same name + Create → cryptic id collision; same name + same account → consumer copy; **renamed + Create → second account and three more events**. Create is the default. Next month’s download is usually a new name. Re-import is not safe.

### Finding 4 — Warnings stored, never shown — **holds. B.**

Extractor warnings exist (`csv.ts`). UI never renders them. `persistImport` can set `partially_imported` from `warnings.length`. Independent skipped-row extract produced a warning the wizard cannot show. Reconciliation **mismatch** is the only pre-confirm alert.

### Finding 5 — Mappings persist before confirm — **holds. C, weaker financially.**

`confirmMapping` writes `columnMappings` via `onLedgerChange` → `writeUserLedger`. Auto-detect does not. Copy still says “Nothing is stored until you confirm.” `applyUserLedger` will not flip to the imported overlay while `statements.length === 0`, so this is device state / stale-map risk, not a transaction write. Real C. Not the reason this review fails.

### Finding 6 — No recovery after confirm — **holds. C.**

No undo, no delete-statement, no `clearUserLedger`. **Show demo data** only sets `useImportedLedger` false (`App.tsx`). `finora.user-ledger.v1` stays. Combined with 1–3, a mistaken confirm is durable until site data is cleared.

### Finding 7 — Silent identity vs Create — **holds for the single-match path; two-Visa collapse is overstated. A/C.**

Empty Create still calls `identifyParty` (`resolveIdentity`). Independent probe:

- **One** card whose issuer/name substring-matches → `{ kind: "card" }` and `applyCardFacts` can overwrite that card. The UI still says Create.
- **Two** Visa cards with issuer `"Visa"` → `ambiguous`. Persist then errors unless the user picked a party. They do **not** collapse into one card.

The implementer’s “Two Visa cards can collapse via issuer substring” is the wrong example. The live defect is silent **unique** substring match, especially card PDFs with an issuer line. First HDFC CSV has no institution/name (`extractCsvStatement`); that path creates. The code path is still unsafe.

### Other findings

8–11, 13–18 are fair. 12 (closing `-$23,087.42` vs August savings `+$3,112.58`) is a real consumer contradiction: account balance is last running/closing, not month-to-date. It is existing net-worth math fed a statement close, not a formula rewrite.

“What is already trustworthy” is mostly true for demo isolation, confirm-before-transactions on the auto-detect path, and transfer exclusion from spending **after** persist. It does not outweigh the confirmation lie or the renamed-file duplicate.

## Required answers

### 1. Is imported data understandable?

**No, not enough to trust what you are looking at.**

Kept-row count and income/spending/transfer totals are shown. Date, description, amount, and classified type appear on review.

Missing or misleading: file name (stored, not shown — history is `Imported statement · Imported account`), rejected-row count, warnings, persist type vs review type, and which party Create will actually attach to. Institution/name on a typical CSV is empty. Duplicate lines are a count, not a list.

### 2. Is imported data trustworthy?

**No.**

On the sample bank file, the user is shown a Transfer that is stored as `unknown`. On a current card PDF that mentions a due date, payment status is invented as `due` and can drive Dashboard/Insights attention. A renamed re-import with Create doubles accounts and events. Currency is forced to `"USD"`. New-account balance is closing or `0`.

Trustworthy parts: demo fixtures are not mutated; `persistImport` is the transaction write; `unknown` is omitted from income/spending because formulas still key off `income` and `expense | card_purchase`. That is not the same as trustworthy import.

### 3. Can users detect problems before confirmation?

**Only some, and not the ones that matter on the sample path.**

They can see kept totals, a duplicate **count**, and a reconciliation mismatch. They cannot see skipped-row warnings, cannot see that Transfer will become Needs review, cannot see that Create may match an existing card, and the review “need review” count is 0 for NEFT because classification marks it `needsReview: false`. Confirm copy can say “Import 0 new transactions” while Create is still selected.

### 4. Can users recover from mistakes?

**No.**

Review cannot edit date, amount, account, or type. After confirm there is no undo or statement delete. Show demo hides the user ledger; it does not remove it. Recovery is clear site data.

### 5. Is duplicate import behavior safe?

**No.**

Safe only for the same file name + same party fingerprint, or the same `sourceFileId` (blocked by a developer-facing id error). Unsafe for the default Create path when the file is renamed — the normal next-statement case. Preview can disagree with persist because preview uses `accounts[0]` while persist creates `acc-imp-N`.

### 6. Are account boundaries safe?

**No.**

First CSV with no name/institution creates a new `Imported account` and does not touch fixtures — that one path is isolated. After that, empty Create plus a unique name/issuer substring attaches to the existing party and can overwrite balances/card facts. There is no identify test. Two equal issuer matches refuse persist (`ambiguous`); that is safer than claimed, not a product guarantee the UI explains.

### 7. Does imported data preserve existing financial semantics?

**Formulas yes. Consumer meaning only until import invents or remaps inputs.**

`calculations.ts` is not in the `7f3f780` diff. `isSpendingEvent` is still `expense || card_purchase`. Transfers and `unknown` stay out of spending. After the sample CSV, August income `$3,200` / spending `$87.42` is the same identity as the foundation tests.

Semantics still break at the inputs: invented `paymentStatus: "due"` feeds `listCardPaymentObligations`; a duplicated renamed import doubles income and spending; account `balance` is statement closing (`-$23,087.42` on the sample) while monthly savings is `+$3,112.58`; review Transfer is not a persisted transfer.

## Verdict rationale

FAIL is not “the CSV parser does not work.” It works. FAIL is the trust question this increment asked.

- **PASS** requires no material A/B/C. Findings 1, 2, 3, 4, and 6 are material and independently confirmed. Finding 2 fires on the documented sample. Finding 3 fires on the default next-file path.
- **PASS WITH LIMITATIONS** was the right bar for the foundation slice (real CSV persist, honest OCR/XLSX ceiling, formulas untouched). It is the wrong bar once the question is “can a consumer trust imported data before building on it?” Limitations are scanned PDFs and no OFX. A confirmation that lies, a duplicate that persists, and a card marked due when the file says current are defects.
- The implementer was right to STOP and not start a next product increment. Finding 7’s two-Visa wording should be tightened to unique substring match; that does not salvage the rest.

Do not repair here. Do not start the next increment from this evaluation.

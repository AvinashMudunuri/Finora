# Independent evaluation — Finora #53 import correctness

## Verdict

**PASS WITH LIMITATIONS**

The two #52 financial-correctness defects this increment named are fixed on the paths that failed #52. `Payment due date` no longer invents `paymentStatus = "due"`. An unfunded transfer or card payment is shown as Needs review and cannot persist as `unknown`. `src/domain/calculations.ts` is not in the `origin/main` diff.

PASS is unavailable: review type is still not unconditionally the persist type. When Create is selected and `identifyParty` silently attaches to a different account than preview’s `accounts[0]`, review can show **Needs review** (`unknown`) and persist can store **transfer**. That is the unrepaired #52 identity finding colliding with the new rule, not a silent reintroduction of “confirm Transfer, store unknown.” It is still a confirmation mismatch.

FAIL is unavailable: both targeted shipping-path defects are actually dead, and formulas were not rewritten.

This evaluator did not implement #53 and did not write the review package. Product source was not modified. Defects were not repaired. #54 was not started.

## Scope

| Item | Result |
| --- | --- |
| Worktree | `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready` |
| Branch | `aaep/finora-import-correctness-053` |
| HEAD | `41f96123264ad8e10b30992c25b08782c2f81610` — *Record the user-data-trust review of statement import without changing product code. (#52)* |
| Baseline | `origin/main` `41f9612` |
| Product change | Uncommitted working tree only: `pdf.ts`, `service.ts`, `StatementImport.tsx` and their three tests |
| `git diff origin/main -- src/domain/calculations.ts` | **Empty.** Formulas were not rewritten. |
| Git | No commit/push. Only this file added under the review package. |

Read: this package (README, implementation-summary, requirement-to-evidence, validation, known-limitations, evaluatorPrompt, `evidence/browser-evidence.json`, `evidence/samples/text-card-current.pdf`), `#52` `independent-evaluation.md`, and the product diff for `pdf.ts` / `service.ts` / `StatementImport.tsx` plus tests.

Independent probes (`node --experimental-strip-types`; no product change):

| Probe | Result |
| --- | --- |
| `parsePdfStatement` with **Payment status: current** + **Payment due date** | `paymentStatus: "current"` |
| Same text with no status line | `paymentStatus` undefined |
| Explicit `payment status: due` / `overdue` | `"due"` / `"overdue"` |
| Sample `text-card-current.pdf` via `extractLiteralPdfStrings` | `"current"` |
| HDFC CSV persist, empty ledger, no funding | `{ ok: false }` — funding/counterparty error |
| `previewImport` of that CSV with no funding | NEFT `eventType: "unknown"`, `needsReview: true`, `needsFunding: true` |
| Same CSV persist with a counterparty account | types `income`, `expense`, `transfer`; August income `$3,200`, spending `$87.42` |
| Create selected + `identifyParty` matches `acc-hdfc` + funding = preview party `acc-first` | preview NEFT `"unknown"`; persist stores `"transfer"` on `acc-hdfc` |
| Card persist with funding | `card_purchase` + `card_payment` |
| Fixture September 2026 | income `3200`, spending `87.42`, net worth `23168.43` |
| Renamed-file + Create (second persist, new file name) | 3 accounts, 6 events |
| Skipped CSV date row | warning `"A row is missing a usable date."` |
| `identifyParty` one Visa issuer | silent `{ kind: "card" }` |

`npm test`: 46 files, **445 passed**. Lint, typecheck, build, e2e builds, and browser `:4175` were **not** re-run. `validation.md` gate claims and `browser-evidence.json` notes are implementer-asserted. `evidence/` has the sample PDF and JSON only — no screenshots for this evaluator to inspect.

## Other #52 findings — not silently repaired

The increment’s own known-limitations list is accurate. Diff vs `origin/main` is the six import files only. The leftover #52 items are still in HEAD.

| Prior finding | Still true? | Where |
| --- | --- | --- |
| `inferPaymentStatus` invents `due` from “Payment due date” | **No — this was the targeted repair** | `pdf.ts` now requires `payment status\s*[:-]\s*(overdue\|due\|current)` |
| Transfers without funding persist as `unknown` / review Transfer ≠ persist unknown | **No on the sample path — targeted repair.** Residual Create/identify desync remains | `resolvePersistedEventType` + persist refuse + Import disabled when `needsFunding && !fundingAccountId` |
| Warnings unused in UI | **Yes** | `csv.ts` still `warnings.push`; `StatementImport.tsx` has no `warnings` read |
| Identify untested; unique substring match | **Yes** | no `identify.test.ts`; one-Visa probe still silent-matches; `identify.ts` unchanged |
| Mapping write before confirm | **Yes** | `confirmMapping` → `rememberColumnMapping` → `onLedgerChange` |
| Renamed-file + Create duplicates | **Yes** | independent persist: second file name created a third account and six events |
| No undo after confirm | **Yes** | no `clearUserLedger`; `App.tsx` not in the diff |
| CSV currency always `"USD"` | **Yes** | `extractCsvStatement` |
| New account `closingBalance ?? 0` | **Yes** | `service.ts` create-account path unchanged |
| Text PDF is not a bank-PDF product | **Yes** | still `Tj` + line parser |
| No dedicated `unknown` calculation test | **Yes** | `isSpendingEvent` still `expense \|\| card_purchase`; `calculations.ts` untouched |

Nothing in the six-file diff looks like a silent repair of those leftover items.

## Pressure-test of the implementer package

The two shared-path fixes are real and small enough. Several claims are sharper than the code.

### PDF payment status — **holds. Targeted defect is dead.**

`inferPaymentStatus` no longer uses `/\bdue\b/` gated by a loose `/payment status/` anywhere in the file. The #52 current+due-date probe that returned `"due"` now returns `"current"`. Due-date-only returns `undefined`; card create still refuses an invented status. Explicit `payment status: due` / `overdue` still resolve. Downstream `applyCardFacts` / `listCardPaymentObligations` still treat only stored `due|overdue` as attention — they are no longer fed a false due from a due-date line.

Narrow leftover, not the #52 bug: the `due` regex is an unanchored prefix after the colon (`payment status: due now` would match). That is not “Payment due date.”

### Review ↔ persist type — **holds on the sample path; the “single rule” claim is overstated.**

`previewImport` remaps through `resolvePersistedEventType` before display. `persistImport` refuses when a raw `transfer` / `card_payment` would resolve to `unknown`. Review of the sample HDFC CSV with an empty ledger shows Needs review, not Transfer. Import is disabled. Persist returns the funding error. That is the #52 confirmation lie, gone.

The rule is only single when **preview `partyId` equals persist `partyId`**. UI preview still uses `selectedAccountId || ledger.accounts[0]?.id || "new"` on Create. Persist still runs `identifyParty` on Create. Independent probe: Create + statement name matching `HDFC Savings` + funding = first account (`acc-first`) → preview NEFT `"unknown"`, persist stores `"transfer"` on `acc-hdfc`. Confirm is enabled because `fundingAccountId` is set. The user confirms a Needs-review line and receives a transfer.

That path is the one this increment created as the intended bootstrap: a first transfer statement cannot confirm until an account exists; Create stays the default; identify is unchanged. It is not the empty-ledger sample, and it is not “confirm Transfer, store unknown.” It is still a review/persist disagreement. Requirement-to-evidence’s “Review type = persist type | Pass” is not unconditionally true.

### Unresolved confirm blocked — **holds for the targeted case.**

`disabled={needsFunding && !fundingAccountId}` plus the persist refuse. Empty ledger with NEFT cannot confirm. Funding equal to persist `partyId` also refuses at persist (UI may still allow the click; persist errors). Other `unknown` lines (not classified transfer/card payment) can still confirm. That was never this increment’s target.

### Formulas and transfer/card semantics — **holds.**

`calculations.ts` diff is empty. Fixture September income `$3,200`, spending `$87.42`, net worth `$23,168.43`. Funded bank persist: NEFT is `transfer`, spending stays `$87.42`. Card debit stays `card_purchase`; funded thank-you stays `card_payment`. `isSpendingEvent` is still `expense || card_purchase`.

## Required answers

### 1. Can PDF due-date text incorrectly create `paymentStatus = due`?

**No.**

`Payment due date` no longer supplies `\bdue\b`. Current + due date stays `current`. Due date with no status line leaves `paymentStatus` undefined. The sample text PDF parses to `current`. Explicit `payment status: due` still creates `due`.

### 2. Can review classification differ from persisted classification?

**Yes, on Create + silent identify. No on the #52 sample path.**

Empty ledger / no funding: both sides treat NEFT as `unknown`; persist refuses. Funded persist with the same `partyId` preview used: types match.

Create selected, `identifyParty` unique-matches a different account than preview’s first account, funding = that preview party: review `unknown`, persist `transfer`. Independently confirmed. Root cause is the unrepaired identity/`accounts[0]` preview lie, not a new parser bug.

### 3. Can a user confirm an unresolved classification?

**No for an unfunded transfer or card payment.**

Import is disabled without a funding account; persist refuses the same case, including funding === persist party. They cannot confirm Transfer and store `unknown`.

They can still confirm a line the review table marks Needs review when funding is chosen and identify remaps the party — and then persist stores `transfer`. That is question 2’s residual, not a reopen of the unfunded confirm.

### 4. Are existing financial calculations unchanged?

**Yes.**

`git diff origin/main -- src/domain/calculations.ts` is empty. Fixture September totals and net worth still match the existing calculation tests. `listCardPaymentObligations` still keys off stored `due|overdue` only.

### 5. Are transfers and card purchases still semantically correct?

**Yes, once persist is allowed to complete.**

A funded NEFT persists as `transfer` and is omitted from spending. A card debit persists as `card_purchase`. A funded “Payment — Thank you” persists as `card_payment`. Unfunded transfer/card-payment lines no longer persist as a silent `unknown`.

## Verdict rationale

- **PASS** requires both targeted defects actually fixed **and** no remaining hole in the increment’s own claims. The PDF defect is fixed. The sample confirmation lie is fixed. Formulas are untouched. Review = persist is not a guarantee once Create and `identifyParty` disagree. PASS would over-claim.
- **FAIL** would be the right bar if either named defect still shipped, or if `calculations.ts` had been edited. Neither is true.
- **PASS WITH LIMITATIONS** is the increment that was actually delivered: two shared-path fixes, leftover #52 trust defects still open and not silently repaired, plus one residual type desync that this repair did not close because it did not touch identity or the Create preview `partyId`.

Do not repair here. Do not start #54 from this evaluation.

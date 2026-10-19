# Independent evaluation — Finora #54 import identity and duplicate safety

## Verdict

**PASS**

Create is honored. Persist no longer calls `identifyParty`, so an empty Create selection cannot attach a statement to an existing account or card by name or issuer. A renamed copy of the same statement is refused and does not create another account or another copy of the lines. `src/domain/calculations.ts` is not in the `origin/main` diff.

FAIL is unavailable: the two shipping-path holes this increment named are dead on the paths that failed #52/#53, and formulas were not rewritten.

PASS WITH LIMITATIONS is unavailable for the required bar. The leftover #52 trust items (warnings UI, mapping-before-confirm, undo, XLSX/OFX) are still open and were not silently repaired. Full line-set equality can still duplicate overlapping-but-not-identical statements onto a new party; that ceiling is named in `duplicates.ts` and is not the renamed-copy case this increment had to close.

This evaluator did not implement #54 and did not write the review package. Product source was not modified. Defects were not repaired. No next increment was started.

## Scope

| Item | Result |
| --- | --- |
| Worktree | `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-identity-054` |
| Branch | `aaep/finora-import-identity-054` |
| HEAD | `f7c8fb71adaef57fa89054aa95f77564edfe64eb` — *Fix statement-import payment status and review/persist type mismatches without changing calculations. (#53)* |
| Baseline | `origin/main` `f7c8fb7` |
| Product change | Uncommitted working tree: `service.ts`, `duplicates.ts`, `StatementImport.tsx` and their tests; untracked `identify.test.ts`. `identify.ts` itself is **unchanged**. |
| `git diff origin/main -- src/domain/calculations.ts` | **Empty.** Same blob `975267c1ec616780871d6ff40911b470bf3591d9`. |
| `git diff origin/main -- src` names | Six files above. No `pdf.ts`, `csv.ts`, `store.ts`, `App.tsx`, routes, or calculations. |
| Git | No commit/push. Only this file added under the review package. |

Read: this package (README, implementation-summary, requirement-to-evidence, validation, known-limitations, evaluatorPrompt, samples, `evidence/browser-evidence.json`, screenshots), `#52` and `#53` `independent-evaluation.md`, and the product diff for `service.ts` / `duplicates.ts` / `identify.ts` / `StatementImport.tsx` plus tests.

Independent probes (`node --experimental-strip-types`; no product change):

| Probe | Result |
| --- | --- |
| `identifyParty` on HDFC statement vs existing `HDFC Savings` | `{ kind: "account", id: "acc-hdfc" }` — matcher still unique-matches |
| Persist Create, no `selectedAccountId`, same statement | New `acc-imp-3`; payroll on the new id; `acc-hdfc` balance stays `50` |
| Persist with `selectedAccountId: acc-hdfc` | Attaches; `acc-hdfc` balance becomes `13112.58`; no extra account |
| Re-import same `BANK` + same file name | `{ ok: false, "Those transactions are already imported." }` |
| Persist same `BANK` as `hdfc-copy.csv` | Same refuse; still 3 events, still one HDFC account |
| Two different bank statements, Create both | `HDFC Savings` and `ICICI Checking`; Corner Cafe not on the HDFC id |
| `identifyParty` on Visa Signature vs one existing Northlake Visa | `{ kind: "card", id: "card-imp-1" }` — would have auto-attached |
| Persist Create second Visa, same issuer | `card-imp-2` Visa Signature; first outstanding stays `1842.19` |
| #53 residual: Create + funding = first account | Preview NEFT `"transfer"`; persist stores `"transfer"` on the new id |
| Sample `checking.csv` → `checking-copy.csv` | Content id `stmt-edb75cea` both; copy refused; preview `0 new · 2 already imported` |
| Sample `second-bank.csv` after checking | `acc-imp-2`; first balance `7912.58` unchanged; Cafe `unknown` on the second id |
| Fixture Sept 2026 / net worth | income `3200`, spending `87.42`, net worth `23168.43` |
| Skipped CSV date row | warning `"A row is missing a usable date."` still stored |

`npm test`: 47 files, **455 passed**. Lint, typecheck, build, e2e builds, and browser `:4175` were **not** re-run. `validation.md` gate claims besides `npm test`, and overflow JSON, are implementer-asserted. Screenshots in `evidence/screenshots/` were inspected; they match the sample persist probes (`stmt-edb75cea`, Create still selected on the renamed copy, two `Imported account` rows, demo net worth `$23,168.43`).

## Other #52 findings — not silently repaired

The increment’s known-limitations list is accurate for the items this prompt named. Diff vs `origin/main` is the six import identity/duplicate files plus tests. The leftover consumer-trust items are still in HEAD.

| Prior finding | Still true? | Where |
| --- | --- | --- |
| Empty Create runs `identifyParty` and unique-matches | **No — this was the targeted repair** | `resolveIdentity` no longer imports or calls `identifyParty`. Empty selection creates. |
| Renamed-file + Create duplicates | **No — this was the targeted repair** | `statementContentId` + `hasImportedLineSet`; independent renamed persist refuses |
| Preview Create uses `accounts[0]` / `cards[0]` | **No — in scope here** | Preview party is `accountId \|\| "new"` / `cardId \|\| "new"` |
| Identify untested; unique substring match | **Matcher still unique-matches; now tested.** Persist does not use it | `identify.ts` unchanged; new `identify.test.ts`; two Visas still `ambiguous` |
| Warnings unused in UI | **Yes** | `csv.ts` still `warnings.push`; `StatementImport.tsx` has no `warnings` read |
| Mapping write before confirm | **Yes** | `confirmMapping` → `rememberColumnMapping` → `onLedgerChange` |
| No undo after confirm | **Yes** | no `clearUserLedger`; `App.tsx` not in the diff |
| XLSX / OFX | **Yes** | `accept=".csv,.pdf,text/csv,application/pdf"`; `StatementKind` still reserves `"xlsx" \| "ofx"` |
| CSV currency always `"USD"` | **Yes** | `extractCsvStatement` |
| New account `closingBalance ?? 0` | **Yes** | create-account path unchanged |
| Text PDF is not a bank-PDF product | **Yes** | `pdf.ts` not in the diff |
| First transfer/card-payment statement blocked without funding | **Yes** | intended #53 rule, still present |

Nothing in the six-file diff looks like a silent repair of warnings UI, mapping-before-confirm, undo, or XLSX/OFX.

## Pressure-test of the implementer package

The two shared-path fixes are real and small enough. The required-scenario table in `requirement-to-evidence.md` holds under independent persist, not only under the added tests.

### Create does not auto-match — **holds. Targeted defect is dead.**

`service.ts` dropped the `identifyParty` import. `resolveIdentity` attaches only when `selectedAccountId` / `selectedCardId` is set and present on the ledger. Otherwise it creates.

The matcher is not gone. Independent probe: Create-shaped input (no selection) against an existing `HDFC Savings` still unique-matches in `identifyParty`. Persist of that same input created `acc-imp-3`, left `acc-hdfc` at `50`, and put payroll on the new id. The #52/#53 shipping lie was persist overriding Create. That path is dead.

Same for cards. A second Visa statement with issuer `Northlake Bank` unique-matches the first imported Visa in `identifyParty`. Persist with Create still minted `card-imp-2` and did not overwrite the first card’s `1842.19`. That is the unique-issuer substring case #52 correctly named (and #52’s two-Visa collapse example still does not happen: `identify.test.ts` keeps two Visas `ambiguous`).

Explicit selection still attaches and may overwrite balance/card facts. That is the remaining intended path, not a Create leak. UI passes `selectedAccountId || undefined`, so the default “Create from statement” option stays empty.

### Renamed copy refused — **holds on the same-statement case.**

`sourceFileId` used to hash file name + byte length + header fingerprint. Persist now uses `statementContentId` (header fingerprint + line body). File name is display-only on the statement record.

Independent sample extract: `checking.csv` and `checking-copy.csv` share `stmt-edb75cea` (same id as `browser-evidence.json`). Second persist returns the consumer error. Preview is `0 new · 2 already imported`. Account count stays 1. `hasImportedLineSet` is true even when the previous `sourceFileId` is a filename-era hash (`duplicates.test.ts` `stmt-old-name`).

UI import is disabled when `newCount === 0` (`StatementImport.test.tsx` renamed-copy case). Persist also refuses before `resolveIdentity`, so Create cannot mint a second account as a side effect of a refused duplicate.

Named ceiling, independently confirmed: a **superset** of the same lines plus one extra debit persisted as a second account and copied Payroll / Whole Foods onto `acc-imp-2`. `hasImportedLineSet` is full imported line-set equality; `splitDuplicates` still keys fingerprints on `partyId`, so Create of a not-identical overlay bypasses both. `duplicates.ts` already names that ceiling. It is not “renaming the same statement.”

### Required multi-account scenarios — **hold.**

| Scenario | Independent result |
| --- | --- |
| Two banks | HDFC then ICICI Checking: two names, five events, Cafe not on HDFC. Sample CSVs: `acc-imp-1` / `acc-imp-2`, first balance unchanged. |
| Two cards, same issuer | Create second Visa Signature: two cards; first outstanding unchanged. `identifyParty` would have attached; persist did not. |
| Matching account + Create | New account; existing `acc-hdfc` untouched. |
| Matching account + explicit select | Attaches to `acc-hdfc`; no third account. |
| Re-import | Refuse. |
| Renamed copy | Refuse; import disabled in UI test. |

CSV extracts still have no institution/party name, so both sample banks are labeled `Imported account`. Distinct ids still separate them. That is the existing extractor gap, not identity collapse. Screenshots show the same two labels.

### Preview vs persist type after Create — **the #53 residual is dead on this path.**

#53’s leftover was Create + silent identify + funding = preview’s `accounts[0]` → review `unknown`, persist `transfer`. Preview party is now `"new"` when Create is selected. Independent probe: Create + funding = `acc-hdfc` → preview NEFT `"transfer"`, persist `"transfer"` on `acc-imp-2`. Types match. That is a consequence of this identity fix, not a silent #53 reopen and not a silent repair of the leftover items listed in question 5.

### Formulas — **holds.**

`calculations.ts` diff is empty. Fixture September income `$3,200`, spending `$87.42`, net worth `$23,168.43`. Demo screenshot shows the same net worth. `isSpendingEvent` was not touched. Sample Cafe remaining `unknown` is existing classifier behavior (`cafe` is not in the expense heuristic), not this increment.

## Required answers

### 1. If the user selects Create from statement, can persist still auto-match an existing account/card via `identifyParty`?

**No.**

Persist does not call `identifyParty`. Empty `selectedAccountId` / `selectedCardId` creates. Independent Create vs matching HDFC name, and Create vs a unique matching Visa issuer, both minted a new party and left the existing party’s facts alone.

`identifyParty` still unique-matches if invoked. It is unused on the persist and UI path.

### 2. Can renaming the same statement create another copy of the same transactions?

**No.**

Content id ignores file name. Full imported line-set match also refuses, including older filename-hashed `sourceFileId` groups. Independent `hdfc-copy.csv` / `checking-copy.csv` persists fail with “already imported.” Preview reports `0 new`. Import is disabled. No second account, no second copy of the lines.

A different statement that only *overlaps* those lines can still copy the overlap onto a new party. That is the named line-set ceiling, not a renamed copy.

### 3. Do two banks, two cards same issuer, matching account + Create, re-import, and renamed copy hold?

**Yes.**

All five required scenarios independently persisted as claimed. Two sample CSVs Create two ids. Two Visas with the same issuer Create two cards. Matching account + Create does not attach. Re-import and renamed copy refuse.

### 4. Are existing financial calculations unchanged?

**Yes.**

`git diff origin/main -- src/domain/calculations.ts` is empty. Fixture September totals and net worth still match the existing calculation tests and the demo screenshot.

### 5. Were leftover #52 items (warnings, mapping-before-confirm, undo, XLSX/OFX) silently repaired?

**No.**

Warnings are still stored and not shown. `confirmMapping` still writes column mappings before import confirm. There is still no undo. Accept is still CSV/PDF only. Those files were not in the product diff.

## Verdict rationale

- **PASS** requires Create honored, renamed duplicates refused, and formulas untouched. All three independently hold. The required multi-account matrix holds. Leftover #52 polish/recovery items were not quietly closed and passed off as identity work.
- **FAIL** would be the right bar if empty Create still attached via `identifyParty`, if a renamed copy still persisted a second set of events, or if `calculations.ts` had been edited. None of those is true.
- **PASS WITH LIMITATIONS** would be the right bar if a required scenario failed, or if the package claimed a stronger duplicate store than full line-set equality. It names the ceiling. CSV accounts titled `Imported account` are the existing extractor gap, not a failed two-bank split.

Do not repair here. Do not start warning UI, undo, XLSX, OFX, aggregation, or auth from this evaluation.

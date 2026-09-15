# Independent evaluation — Finora #39

## Verdict
PASS WITH LIMITATIONS

The assessment’s mission answers match this checkout. “No blockers / continue building” is justified for this proving-stage repo. Several claims are incomplete rather than false; none of those gaps reverse the classification of JSON, fixture-sibling validation, optimistic UI, adapter replaceability, or the maturity scores.

## Evaluator findings

- Inspected product SHA is `6c9160b82e668864a1880916c3f4006ad5ed00a8`. Branch `aaep/finora-backend-foundation-assessment` HEAD is `59d6ee126e6aa46d5eec0a4ce8ac3cef62b62481`. `git diff --name-status 6c9160b HEAD` is eleven added files under `docs/architecture/backend-foundation-assessment/` only. No product source, tests, `package.json`, APIs, UI, PWA, or server code changed in the assessment commit.
- #36 / #37 / #38 are on this history and match GitHub: #36 `86fb90b015c3e8fc931a8ab827eaedb63a1e3ec4` merged `2026-09-15T06:56:38Z`; #37 `b19a357003a135f6a4f4a7bc625eddd5e24fd914` merged `2026-09-15T12:39:15Z`; #38 `6c9160b82e668864a1880916c3f4006ad5ed00a8` merged `2026-09-15T14:00:56Z`. Ancestry `#36 → #37 → #38` is real.
- Independent `npm test -- --reporter=dot` on this tree: **36 files, 367 passed**. The quantitative test claim is true. `evidence/test-evidence.txt` still omits `src/brand/FinoraLogo.test.tsx` from its inventory (35 paths listed, 36 files exist). That is an evidence-pack miss, not a padded suite.
- Layering holds. `src/domain` has no `node:`, `fs`, or HTTP imports. `src/application` does not import `server/` or `src/infrastructure`. HTTP adapters call application services and do not reimplement `src/domain/calculations.ts`. UI money widgets import that module (`src/components/Dashboard.tsx`, `Spending.tsx`, `Cards.tsx`, `Accounts.tsx`, `AttentionInsights.tsx`). `src/components/Insights.tsx` does not; it delegates to `AttentionInsights.tsx`. The financial-evidence line “Insights imports these functions” is slightly loose.
- JSON persistence is a correct simplification now, not a defect. All three stores (`server/jsonFileAccountStore.ts`, `jsonFileCardStore.ts`, `jsonFileTransactionStore.ts`) `writeFileSync` the whole envelope with no temp-file + `renameSync`. Missing file seeds fixtures; malformed JSON is a store error → HTTP 500. That is acceptable for one local operator and a production gap before real data.
- Fixture-sibling validation is real and correctly treated as an evolution hazard, not a current API bug. `server/accountRuntime.ts` `createAccountDependencies` / `createCardDependencies` inject `fixtureCards` / `fixtureAccounts` / `fixtureTransactions`. Each JSON store’s `list()` and `write()` also call `assertValidFinanceData` with fixture counterparts. No HTTP path writes two stores or writes transactions (`server/transactionHttp.ts` is GET `/api/transactions` only). No current API can create a live-FK inconsistency. The assessment understates that the same fixture counterparts run on **read**: a hand-edited `data/transactions.json` that referenced a user-created account would 500 on GET, not only on a future write.
- Optimistic UI is the main current honesty gap, and calling it Important rather than a product-slice blocker is the right stage call. `src/app/App.tsx` `handleCreateAccount` / `handleUpdateAccount` / card equivalents `setState` and `return created` / `return updated` before `persistRemote*`. Gateways map fetch failures to `{ ok: false }` (`src/infrastructure/accounts/httpAccountGateway.ts`), so a failed persist can set the banner. The assessment’s “row remains until reload” is incomplete: `createAccount` / `createCard` allocate `acc-N` / `card-N` from the array they see. After a failed persist the UI array is ahead of disk, so the next successful create can reuse the phantom id and `persistRemote*` will **overwrite** that row (`current.some(item => item.id === account.id)`). That is still not a reason to stop all Finora work; it is a reason not to add more mutation surfaces until persist is awaited or rows are marked unsaved.
- HTTP 200 is honest. `createStoredAccount` / `updateStoredAccount` (and card equivalents) call `store.write` before the adapter `writeJson(..., 200, ...)`. `assessment.json` `http200GuaranteesWriteFileReturned: true` and `optimisticUiGuaranteesDurablePersist: false` match the code.
- Database-adapter replaceability is “mostly yes” for domain and application ports (`list` / `write` on `src/application/{accounts,cards,transactions}/port.ts`). The listed caveats (fixture siblings inside adapters and `accountRuntime`, whole-array `write`, version envelope) are real. Missing caveat: `server/accountHttp.ts`, `cardHttp.ts`, and `transactionHttp.ts` import `AccountStoreError` / `CardStoreError` / `TransactionStoreError` from the JSON store modules. A DB adapter is not a drop-in at the HTTP boundary unless those error types are shared or the adapters are edited. That does not imply rewriting `src/domain` or application services.
- `TransactionStore` is not a list-only port. `src/application/transactions/port.ts` still has `write()`. The application service is list-only; HTTP is GET-only; the JSON store still implements `write()`. The assessment’s “transactions: list” parenthetical is the product surface, not the port.
- PWA claim holds. `vite.config.ts` sets `navigateFallbackDenylist: [/^\/api\//]` and NetworkOnly for `/api/accounts`, `/api/cards`, `/api/transactions`. On list failure `App.tsx` keeps bootstrap/fixture state and sets `*LoadError`. Stale numbers beside a banner is accurate; fail-closed money widgets are a production change, not a now-blocker.
- Security/auth/Postgres/Redis/queues are correctly not defects. `package.json` production deps are `react` and `react-dom` only. Standalone binds `127.0.0.1:4174` by default (`server/standalone.ts`). No `.github/workflows`. `e2e-*` scripts are Vite `--mode` fixture builds; `uses*Backend()` is false for `test` and `e2e-*` (`src/application/*/contract.ts`).
- Production-readiness matrix is tied to this repo, not enterprise theater. CI as the only missing “NOW” hygiene item, and not a product blocker, is consistent with a local proving ground.
- Maturity scores are defensible: Domain 4 (one calc + validate module, USD/stored-balances are product limits), Application 3 (ports exist; fixture siblings will not survive txn writes), Backend 3, Persistence 2, API 3, Testing 3, Security 2, Observability 1 (`process.stdout.write` listen line in `server/standalone.ts`; no request log, request id, or `/api/health`), Production readiness 2. Domain 4 must not be read as ship-it; the document already says that.
- “No blockers / continue building” is justified. Do not read it as permission to add transaction writes or more optimistic mutations on the current composition. The assessment already gates those on live siblings and honest persist.

## Technical accuracy

Confirmed:

- Baseline SHAs, merge commits, merge timestamps, docs-only assessment commit, 36/367 tests.
- Domain purity, application isolation, HTTP-does-not-do-money-math.
- Accounts/cards mutate via POST/PUT; transactions GET-only; POST returns 200 not 201 (`server/accountHttp.ts`, `server/cardHttp.ts`).
- Standalone unknown-route fallback still says `"Unknown account operation."` (`server/accountRuntime.ts`); per-resource 404s say account/card/transaction operation. The “some fallbacks” debt note is accurate.
- `Cache-Control: no-store`, 64KiB body cap, no store paths in error types.
- High utilization threshold `0.7` (`HIGH_CARD_UTILIZATION_THRESHOLD` in `src/domain/calculations.ts`); available credit derived in `buildCard` as `limit - outstanding`.
- Stored balances are fields, not reconstructed from transactions.
- Migration keys `finora.account-backend-migrated.v1` / `finora.card-backend-migrated.v1`; localStorage ledgers `finora.managed-ledger.v1` / `finora.managed-cards.v1`. Skip-if-backend-already-diverged can drop extra local entities. `App.test.tsx` covers card migration onto a fixture-seeded backend.
- localStorage is not a second production authority after those flags; `test` / `e2e-*` bypass is test isolation.
- No Playwright suite in this repo (transitive Vitest browser optional dep in the lockfile does not count).

Disputed or incomplete:

- `evidence/test-evidence.txt` inventory is one file short (`src/brand/FinoraLogo.test.tsx`).
- “TransactionStore … (transactions: list)” vs actual `write()` on the port and JSON adapter.
- Adapter-replaceability caveats omit HTTP → JSON store error-class coupling.
- Fixture-sibling effect on **GET/list**, not only persist.
- Optimistic UI follow-on id reuse / overwrite after a failed persist + another create.
- “Insights imports calculations” — `Insights.tsx` does not; the insights surface does via `AttentionInsights.tsx`.
- Assessment.md skips section 3. Cosmetic.

Not found: any claim that JSON, missing auth, missing Postgres, or missing Redis is a current defect. No underrating of a live API correctness bug as “fine.”

## Scope judgment

Appropriate.

The document uses its own taxonomy (simplification / debt / defect / production gap / nice-to-have) and mostly sticks to it. Calling localhost-without-auth a production gap rather than a defect is correct for this app. Calling fixture-sibling composition a future defect triggered by transaction writes, not a now-blocker, is correct. Optimistic UI is current incorrectness on the mutation path; classifying it as Important for a proving app — and Must-fix before trusted real-user data — is the right severity, not a dodge.

Overengineering not present. Underrating is limited to the incomplete optimistic-id and HTTP-error-coupling notes above, not a wrong “continue building” call.

## Limitations

- Did not re-run Playwright or a real browser against the JSON API; there is no such in-repo path to run.
- Did not crash the process mid-`writeFileSync` to watch truncation; the missing rename is visible in source.
- Did not exercise two tabs or two Node processes; last-write-wins follows from whole-file `write()`.
- Did not inspect `C:\Codebase\Personal\Finora` (assessment says that checkout was on another branch). This evaluation used the provided temp clone only.
- Circular-import claim is from import-direction inspection, not a bundler cycle report.

## Recommendation
MERGE ASSESSMENT PR

Do not rewrite `assessment.md` for the nits above. This file is the record of them. Do not start #40, do not implement persist/honesty/CI in this window, and do not treat Domain 4 or “no blockers” as a license to add transaction writes or more optimistic mutations until live siblings and awaited persist exist.

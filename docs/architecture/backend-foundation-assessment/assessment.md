# Finora #39 — Backend Foundation & Financial Integrity Assessment

**Status:** Assessment only. No product code, dependencies, APIs, persistence, PWA, or AAEP were modified.

**Inspected repository:** [AvinashMudunuri/Finora](https://github.com/AvinashMudunuri/Finora)
**Inspected SHA:** `6c9160b82e668864a1880916c3f4006ad5ed00a8` (origin/main after #38)
**Inspection date:** 2026-09-15
**Branch for this artifact:** `aaep/finora-backend-foundation-assessment`

---

## Executive Summary

The backend foundation after #36 Accounts, #37 Cards, and #38 Transactions is **structurally sound enough to continue building Finora**. It is a working single-user JSON backend with a clean domain, application ports, and HTTP boundary. It is **not** production-hardened, and it does not need to be yet.

**Answer to the mission question:** continue on the current architecture. The minimum changes required before production-grade backend architecture are persistence durability (atomic writes / a real database), mutation honesty (stop treating optimistic UI as success), observability, backups, and then authentication/user isolation — each triggered by a real product requirement, not by enterprise fashion.

**Blockers before continuing product work:** none.

JSON persistence is the correct simplification for the current proving stage. It becomes an architectural risk when Finora has a real user whose data must survive concurrent writes, process crashes, or more than one identity. That point has not arrived.

---

## 1. Baseline

| Item | Value |
|---|---|
| Branch at inspection | `main` |
| HEAD | `6c9160b82e668864a1880916c3f4006ad5ed00a8` |
| Working tree | clean |
| #36 | `86fb90b015c3e8fc931a8ab827eaedb63a1e3ec4` merged 2026-09-15T06:56:38Z |
| #37 | `b19a357003a135f6a4f4a7bc625eddd5e24fd914` merged 2026-09-15T12:39:15Z |
| #38 | `6c9160b82e668864a1880916c3f4006ad5ed00a8` merged 2026-09-15T14:00:56Z |

History on main is `#38` → `#37` → `#36` → `#35`. All three backends are present: stores, HTTP adapters, application services, ports, HTTP gateways, and Vite/standalone composition.

The personal checkout at `C:\Codebase\Personal\Finora` was on `cursor/inspect-spending-from-insight` and is **not** this baseline.

Tests on the inspected SHA: **36 files, 367 passed**.

---

## Current Architecture

```
UI  →  HTTP Gateway  →  HTTP adapter  →  Application service  →  Domain
                                                              →  Store port  →  JSON file
```

Three entity verticals share one Node process:

| Entity | Mutations | Store | API |
|---|---|---|---|
| Account | create, update | `data/accounts.json` | GET/POST/PUT `/api/accounts` |
| Card | create, update | `data/cards.json` | GET/POST/PUT `/api/cards` |
| Transaction | read only | `data/transactions.json` | GET `/api/transactions` |

Composition: `server/vitePlugin.ts` (dev/preview) and `server/standalone.ts` (`127.0.0.1:4174` by default). Frontend `src/main.tsx` attaches HTTP gateways unless `MODE` is `test` or `e2e-*`.

Domain types (`Account`, `Card`, `Transaction`) are unchanged as the financial source of truth. Calculations live in `src/domain/calculations.ts`. Validation and relationship rules live in `src/domain/validate.ts`.

---

## What Is Working Well

1. **Domain purity.** `src/domain` has no filesystem, HTTP, or Node imports.
2. **One financial rule module.** Net worth, utilization, payment attention, monthly flow, spending change, and net-worth evidence are implemented once and consumed by UI and integration tests.
3. **Ports exist.** `AccountStore` / `CardStore` / `TransactionStore` are list+write (transactions: list) contracts. JSON is an adapter, not the domain.
4. **Application services own persistence orchestration.** HTTP adapters map status codes; they do not invent money math.
5. **Coherent API vocabulary.** Field-map validation, `not_found`, `unavailable`, `Cache-Control: no-store`, 64KiB body cap, no path leakage in errors.
6. **Transactions correctly stopped at GET.** The UI cannot mutate history; the API matches that.
7. **PWA does not cache API JSON.** NetworkOnly on the three `/api/*` routes plus `navigateFallbackDenylist` for `/api/`.
8. **Deterministic seed and test isolation.** Missing files seed from fixtures. Store tests use temp directories.
9. **Backend is the production-mode source of truth** for all three entities. localStorage is migration leftover or test/e2e mode.

This is good engineering **for the current stage**.

---

## 2. Assessment philosophy applied

| Classification | Meaning in this document |
|---|---|
| Correct simplification | Deliberate and acceptable now |
| Technical debt | Works today; will need work later |
| Architectural defect | Makes the current system incorrect, unsafe, or hard to evolve |
| Production readiness gap | Required when real users / real data / production scale arrive |
| Nice-to-have | Not justified by a current or near-term product need |

Absence of PostgreSQL, Redis, queues, auth, or cloud is **not** a defect.

---

## 4. Architecture assessment

### Separation of concerns

The intended direction holds:

- UI does not write JSON files.
- Domain does not know about HTTP or disk.
- Application does not import `server/` or `infrastructure/`.
- Infrastructure implements ports and talks HTTP.

### Composition root

One process composes three stores. Naming still says “account” (`accountRuntime`, `finoraAccountApi`, `FINORA_ACCOUNT_HOST`) after becoming a tri-entity server. That is debt, not a defect.

### Cross-domain coupling

The real coupling is **fixture counterparts at write time**. Account writes validate against `fixtureCards` + `fixtureTransactions`, not the live sibling stores. Same pattern for cards and transactions. Application `createAccountDependencies` / `createCardDependencies` also inject fixtures for `updateAccount` / `updateCard` relationship checks.

This is a **correct simplification** while transactions are immutable and no operation spans stores. It becomes a **defect** the moment Finora must persist a transaction that references a user-created account or card. The domain already knows how to check live IDs; the composition does not pass live siblings.

### Hidden global state

`process.env` store paths, `import.meta.env.MODE`, and localStorage migration flags. Acceptable for a local proving app. Not multi-user ready.

### Duplication

Three near-copy JSON stores and three near-copy HTTP adapters. Behavior is consistent; maintenance cost is the issue. **Technical debt.**

UI re-runs `createAccount` / `createCard` before the gateway. Server runs the same domain functions. Double validation is fine; the problem is the UI treating the local result as success (see Atomicity).

### Circular dependencies

None observed.

**Verdict:** architecture is structurally sound. The fixture-sibling composition is the main evolution hazard, not a current correctness bug.

---

## 5. Domain integrity assessment

Accounts, cards, and transactions remain one coherent model.

Business rules are centralized:

| Rule | Location | Consumers |
|---|---|---|
| Available credit | `validate.ts` (`limit - outstanding`) | create/update card, `assertValidFinanceData` |
| Utilization / high util 0.7 | `calculations.ts` | Dashboard, Cards, Insights |
| Payment attention | `calculations.ts` | Dashboard, Insights |
| Net worth | `calculations.ts` | Dashboard, Insights, integration tests |
| Monthly spending/income/savings | `calculations.ts` | Spending, Dashboard, Insights |
| Spending change / drivers | `calculations.ts` | Insights / Spending |
| Net worth change / evidence | `calculations.ts` | Dashboard, Insights |
| Transaction relationship rules | `assertValidFinanceData` | stores, updateAccount, updateCard |

Preferred state holds: **one domain rule, many consumers.** The server does not reimplement these calculations.

Balances are stored, not reconstructed from transactions. That is a product model, not duplicated math. Insights that walk transactions can disagree with stored balances if a user edits a card outstanding without a matching payment — by design in this slice.

---

## 6. Cross-entity integrity

Relationships:

- `Transaction.accountId` / `counterpartyAccountId` → Account.id
- `Transaction.cardId` → Card.id
- IDs are stable; updates cannot change id
- Domain forbids unknown references **when the counterpart arrays passed in are complete**

**Today the counterparts passed at persist are fixtures.** A transaction file that referenced a newly created account would fail store validation even if that account exists in `accounts.json`. The inverse (account exists, fixture transactions still point at original fixture IDs) continues to work because IDs are stable and there is no delete API.

No current API can create that inconsistency. Inventing live foreign keys or a referential-integrity service now would be overengineering.

**When real persistent users and transaction writes exist,** writes must validate against live sibling records (or a single database with foreign keys). That is a product-triggered change, not a now-blocker.

Renames keep IDs; transaction links survive. Duplicate IDs are rejected. Extra local entities migrated via `create()` receive new generated IDs (`acc-N` / `card-N`) — documented migration behavior, not silent merge.

---

## 7. Persistence architecture

### Is JSON acceptable for the current development/proving stage?

**Yes.** One operator, fixture-scale data, deterministic seed, env-overridable paths, temp-dir tests. A database would add operational cost without a product requirement.

### At what point does JSON become an architectural risk?

At the first of:

1. A real user whose data must survive a crash mid-write
2. Two writers (two tabs or two processes) regularly mutating the same store
3. More than one user identity on one process
4. Transaction volume large enough that full-file rewrite is slow or lossy
5. Need for backup/restore that is not “copy three files while the server is stopped”

### Durability details

| Concern | Current behavior | Classification |
|---|---|---|
| Atomicity | `writeFileSync` overwrite | Technical debt; production gap |
| Concurrent writes | last full-file wins | Acceptable now; required before shared use |
| Process safety | no lock | Acceptable now |
| Corruption | malformed JSON → 500, no auto-repair | Acceptable now; production needs recovery runbook |
| Partial writes | possible truncated file | Production gap |
| Crash recovery | re-seed only if file **missing**, not if corrupt | Production gap |
| Versioning | `version: 1` envelope | Working foundation |
| Schema evolution | unknown version → store error | Working; DB later needs migrations |
| Backup | none | Production gap |
| Seeding | fixtures on missing file | Correct simplification |

JSON is **not** classified as a defect.

---

## 8. Consistency between stores

Scenarios:

| Scenario | Today | Need cross-store transaction? |
|---|---|---|
| Transaction references missing Account | Domain would reject if live accounts were passed; store uses fixtures; no txn write API | No |
| Transaction references missing Card | Same | No |
| Account update succeeds, other op fails | No paired write exists | No |
| Card update changes net worth | Net worth is calculated from stored card outstanding; transactions unchanged | No — product model |
| Transaction persist changes spending | No persist API | No |
| Crash between two store writes | No request writes two stores | No |
| Stores at different “versions” of related data | Possible only via manual file edit or future txn writes | Not yet |

**Finora does not currently need cross-store transactions.** Every mutation is one entity list. Do not invent a distributed transaction architecture.

The first product operation that would require atomic multi-entity persistence is **creating a transaction that must also adjust account and/or card balances**, or any delete that must cascade. That operation does not exist.

---

## 9. Concurrency assessment

| Situation | What happens | Stage |
|---|---|---|
| Two browser tabs | Each has its own React state; last `write()` of the whole array wins | Acceptable for proving |
| Two overlapping PUTs | Lost update; no ETag / version field | Acceptable now |
| Simultaneous card and account updates | Different files; both can succeed | Fine |
| Transaction writes | None | n/a |
| Stale frontend after another tab writes | Until reload / remount list(); optimistic local rows can diverge | Acceptable now |
| Lost updates | Yes, last write wins | Production gap when a real user has two tabs |

Optimistic locking is **not required** until mutations are trusted or more than one writer is expected. Do not implement it in this assessment window.

---

## 10. API assessment

The API is **coherent enough to evolve**. Naming, error kinds, and cache headers are consistent across the three resources.

Gaps that are not redesigns:

- POST returns 200, not 201 (nice-to-have)
- Collection 404 copy still says “Unknown account operation” for some fallbacks (debt)
- No API versioning — **not justified**; one client
- Transactions have no query-string filter at the API; filtering is in-domain after full list — correct at fixture scale

Malformed JSON, unknown methods, unknown routes, and store failures are covered by HTTP tests. Error bodies do not leak paths.

---

## 11. API security assessment

The app is a **single-user local development server**.

| Topic | Current | Classification |
|---|---|---|
| Authentication | none | Production gap — mandatory at first shared or remote user |
| Authorization / isolation | none; one file per entity for the process | Production gap |
| Filesystem exposure | store paths not in responses; static rooted | Working |
| Path traversal | blocked in `serveStatic` | Working |
| Arbitrary file access / command exec | not present | Working |
| Injection | JSON parsed; drafts coerced; domain validates | Working for this surface |
| Stack traces | not returned | Working |
| CORS | none; same-origin | Correct simplification |
| CSRF | not relevant locally | Production gap if cookie-auth is added later |
| Rate limit | 64KiB body only | Production gap when exposed beyond localhost |
| DoS | full-file read/write; no concurrency cap | Acceptable locally |

Absence of auth is **not** a current defect.

---

## 12. Data ownership

| Entity | Production-mode source of truth | Other copies |
|---|---|---|
| Accounts | `data/accounts.json` via backend | Bootstrap script, React state, retired localStorage |
| Cards | `data/cards.json` via backend | Same |
| Transactions | `data/transactions.json` via backend | Same; no localStorage ledger for txns |

`uses*Backend()` false (`test`, `e2e-*`): fixtures / managed localStorage. That is test isolation, not a second production authority.

Migration flags `finora.account-backend-migrated.v1` and `finora.card-backend-migrated.v1` prevent re-push. After migration, localStorage keys are retired. **localStorage is not an unintended production authority** once those flags are set.

---

## 13. Migration architecture

Account and card migrations (`decide*Migration`):

- skip if local empty or local == fixtures
- push-local if backend still == fixtures and local diverged
- skip (and still retire local) if backend already diverged

Idempotent via the migrated flag. Deterministic given the same three snapshots. Recoverable only if the operator still has the retired localStorage or a file backup — skip-and-retire can drop extra local entities when the backend has already changed. That is a **known one-time proving tradeoff**, not a general migration framework.

Transactions have no localStorage migration; they seed from fixtures into the JSON store.

A later database can reuse the same idea: “if destination is still seed data, copy source; else leave destination.” The current functions talk HTTP gateways, so a DB cutover would be a new one-shot, not a reuse of these modules. That is acceptable.

---

## 14. Failure and recovery

| Failure | User sees | Data | Recovery |
|---|---|---|---|
| JSON missing | first list seeds fixtures | fixtures, not user edits | automatic |
| JSON malformed | 500 unavailable; UI banner | file left corrupt | manual replace/delete |
| Invalid entities in file | store error → 500 | refused | manual fix |
| Unreadable / unwritable file | 500 | last good file if write failed before replace | OS / permissions |
| Backend down | unavailable banner; bootstrap/fixture data remains on screen | no new writes | restart server |
| Reload during mutation | optimistic row gone if persist not finished | possible loss of that edit | re-enter |
| Process kill during `writeFileSync` | next request 500 if truncated | possible loss of that store | delete corrupt file to re-seed (loses that store) |

Development behavior is understandable. Production requires atomic replace, backups, and a recovery path that is not “delete the file.”

---

## 15. Atomicity and durability

Mutation path (accounts/cards):

```
request → HTTP parse → application → domain validate → store.write (writeFileSync) → 200
```

A **200 from the server** means `writeFileSync` returned. That is durable enough for a local disk if the process is not killed mid-syscall. It is **not** crash-safe.

The **UI path is weaker**:

```
form submit → domain validate → setState(success) → return ok → HTTP later
```

If HTTP fails, the form already succeeded. This is the #37 optimistic-UI behavior. Severity for a proving app: **important, not a blocker**. Severity before trusting Finora with real money data: **must fix** (await persist, or mark the row unsaved).

There is no case where the HTTP adapter returns 200 before `write()`. The honesty gap is UI-only.

Transactions have no mutation path.

---

## 16. Observability

What exists: almost nothing. Standalone prints one listen line. No request log, no error log, no metrics, no tracing, no request IDs, no health route.

**Sufficient for current development:** yes — Vitest failures and the UI banner are the feedback loop.

**Required before production:** request/error logs with a request id, persist-failure logs, and a liveness endpoint.

**Add first:** structured stderr logs on 5xx and store errors, plus `GET /api/health` that checks the three files can be read. Not a vendor platform.

---

## 17. Testing architecture

Strengths:

- Domain calculations and validation are heavily tested
- Each store has seed / malformed / write tests
- Each HTTP adapter has validation / 404 / 500 / no-leak tests
- Gateway integration tests map down-backends to user errors
- Financial integration tests run domain calculations on store-loaded data
- UI tests cover management, dashboard, spending, insights consistency
- `App.test.tsx` covers card localStorage migration onto a fixture-seeded backend

Gaps (do not add tests in this task):

- No CI, so the suite is optional
- No crash/partial-write tests
- No live cross-store integrity tests
- No two-writer tests
- No Playwright against the real backend
- `e2e-*` modes **bypass** the backend
- PWA stale-shell + API-down not tested

The suite **adequately protects domain math and the current API/persistence happy paths**. It does not protect production failure modes.

---

## 18. E2E test strategy

`e2e-*` are **Vite mode builds** that swap fixtures (`e2e-overdue`, `e2e-high-util`, …). They are not Playwright, not a production-like runtime, and they disable HTTP gateways.

The name is **misleading**. It documents deterministic UI states for manual/browser proof, not end-to-end backend tests.

Before production, Finora needs at least one automated path that hits the real JSON (or later DB) API in a browser. That can wait until mutations are honest and CI exists. Do not rename in this task.

---

## 19. PWA / backend interaction

NetworkOnly on API routes is the right policy for a financial app.

Residual risk: Workbox precaches `html`. Cached `index.html` may contain injected bootstrap from an older transform, or no bootstrap (fallback to in-bundle fixtures). `useEffect` then NetworkOnly-lists.

- API OK → state refreshed. Good.
- API fail → **bootstrap/fixture balances remain** plus an unavailable banner.

This is **not silent** if the banner is noticed. It can still present stale balances as visible numbers. For a financial product that is **important before production**. For current proving, the banner is enough.

Do not cache API JSON. Do not treat app-shell availability as data freshness. When production PWA matters, fail closed on money widgets if list() failed (hide numbers, keep the error). That is a product change, not a PWA redesign now.

---

## 20. Performance

Current cost: read entire JSON file per request; write entire array per mutation; UI calculates over in-memory arrays.

**Fixture-scale and small single-user data: acceptable.** Transaction count in fixtures is small; `listTransactions` sorts in memory.

Likely bottlenecks later: full-file rewrite on every PUT; every GET reparsing the file; no in-process cache. Do not add a cache now — it would hide persist bugs.

Multi-user production data makes this model unsuitable (see Scalability).

---

## 21. Scalability

| Stage | Verdict | Why |
|---|---|---|
| Current development/proving | **Appropriate** | One process, fixtures, ports already in place |
| Single real user | **Acceptable with limitations** | Need atomic writes + honest UI + backups first |
| Small production (one user, remote host) | **Risky** on raw JSON; **acceptable** after atomic persist or a single-node DB, auth if the host is reachable, logs, backups |
| Multi-user production | **Unsuitable** as-is | No identity, one file per entity, last-write-wins |
| Larger-scale production | **Unsuitable** | Needs a database, isolation, and usually background work only if product requires it |

No queues or Redis are justified by current product behavior.

---

## 22. Database readiness

**Could JSON adapters be replaced by database adapters without rewriting domain/application layers?**

**Mostly yes.** Domain is independent. Application services depend on `list`/`write` ports. HTTP adapters depend on services.

Caveats (not rewrites of domain):

1. Seed-from-fixture and `assertValidFinanceData(..., fixtures, ...)` live **inside** JSON adapters and `accountRuntime` composition. A DB adapter needs its own seed and must receive **live** sibling repositories for relationship checks — or the database enforces FKs and services stop passing counterpart arrays.
2. `write(entire array)` is an awkward DB port. A later adapter can still implement it as replace-all, or the port can grow `insert`/`update` when transaction mutations exist. Growing the port is expected; it does not imply rewriting calculations or types.
3. IDs are strings (`acc-1`, `card-visa`). They can remain application IDs in a `text` primary key.
4. Version envelopes become a schema_migrations table. Current `version: 1` is a starting point, not a migration system.

**Do not introduce PostgreSQL until a trigger in section 27 fires.**

---

## 23. Multi-user readiness

Not implemented because it is **not required**. The architecture does not make ownership unusually hard:

- Domain entities have no `userId` — adding a column/field is a schema+type change, not a rewrite of utilization math
- Persistence is process-global files — **this** is what makes isolation impossible without a new store shape
- API has no identity — add it at the HTTP boundary, pass owner into services
- Frontend has no session

“Architecture makes it difficult” applies to **JSON files as the isolation mechanism**, not to the domain. Do not add auth until Finora has a second person or a network exposure that is not loopback-only.

---

## 24. Production readiness matrix

| Area | Current State | Current Stage | Production Need | Priority |
|---|---|---|---|---|
| Domain | Coherent types, one calc module, relationship rules | Structurally sound | Keep as source of truth | NOW (keep) |
| Application | Services + ports per entity; fixture siblings | Sound for proving | Pass live siblings when txn writes exist | LATER / on trigger |
| Persistence | Versioned JSON, `writeFileSync` | Correct simplification | Atomic write or DB; backups | BEFORE PRODUCTION |
| API | Consistent REST-ish JSON | Sound enough to evolve | Same; optional 201 | NOT REQUIRED YET |
| Validation | Domain field-maps; HTTP 400 | Sound | Keep; do not fork | NOW (keep) |
| Error handling | 400/404/500, no path leak | Sound for proving | Log 5xx | BEFORE PRODUCTION |
| Concurrency | Last write wins | Acceptable | Optimistic version or DB tx | BEFORE PRODUCTION (if multi-tab real use) |
| Cross-store transactions | Not needed | Correct | Only if one op writes balances+txn | NOT REQUIRED YET |
| Authentication | None | Not required | Mandatory when not single-operator localhost | BEFORE PRODUCTION (if exposed) |
| Authorization | None | Not required | With auth | BEFORE PRODUCTION |
| User isolation | None | Not required | With multi-user | LATER |
| Database | None | Not required | When JSON risk triggers fire | LATER / on trigger |
| Migrations | One-time localStorage + version:1 | Acceptable | Real schema migrations with DB | LATER |
| Observability | Listen line only | Enough for dev | Logs + health first | BEFORE PRODUCTION |
| Security | Local bind, body cap, path guard | Enough for localhost | Auth, limits, no stale money UI | BEFORE PRODUCTION |
| Rate limiting | 64KiB | Enough locally | When reachable | BEFORE PRODUCTION |
| Backups | None | OK for fixtures | File/DB backup before real data | BEFORE PRODUCTION |
| Recovery | Delete corrupt file / re-seed | OK for proving | Restore from backup | BEFORE PRODUCTION |
| PWA | NetworkOnly APIs | Sound intent | Fail-closed money widgets on API error | BEFORE PRODUCTION |
| Testing | 367 unit/integration/UI | Strong for current scope | CI + one real-backend browser path | BEFORE PRODUCTION |
| CI/CD | None | Gap even for proving | Run `npm test` on PR | NOW (hygiene, not product) |
| Performance | Full-file I/O | Fine at fixture scale | Revisit with data growth | LATER |
| Scalability | Single process | Appropriate now | DB + isolation | LATER |

CI is the only “NOW” item that is missing. It is hygiene for the assessment repo, not a Finora product capability, and it is **not** a blocker for continuing slices.

---

## 25. Architecture maturity

Scale: 1 experimental · 2 working prototype · 3 structurally sound · 4 production capable · 5 production hardened

| Area | Score | Why |
|---|---|---|
| Domain | **4** | Types, validation, and calculations are production-shaped; USD-only and stored balances are product limits, not sloppiness |
| Application | **3** | Clear services/ports; fixture sibling injection will not survive txn writes |
| Backend | **3** | Real HTTP + composition + standalone; naming leftover; no logs |
| Persistence | **2** | Works; non-atomic JSON; fixture-relative integrity |
| API | **3** | Consistent, tested, evolvable; POST 200 and no identity |
| Testing | **3** | Deep unit/integration; no CI; e2e name mismatch; no crash tests |
| Security | **2** | Fine for loopback; nothing for a reachable host |
| Observability | **1** | Experimental: almost absent |
| Production readiness | **2** | Working prototype you can demo, not host for real money |

Do not read Domain 4 as “ship it.” Production readiness is 2.

---

## Architectural Findings

1. Layering and dependency direction are correct.
2. Fixture-sibling validation is the main structural compromise.
3. Store/HTTP triplication is debt.
4. `writeFileSync` is not an atomic store.
5. Optimistic UI is the main honesty gap.
6. Ports make a later DB adapter realistic.

---

## Financial Integrity Findings

1. Calculations are not forked across frontend and server.
2. Card available credit is derived and checked.
3. Transaction relationship rules exist in domain and are enforced when counterpart arrays are complete.
4. Stored balances are not a double-entry ledger — do not treat divergence from history as a backend defect.
5. Optimistic success can show a net-worth change that never hit disk.

---

## Persistence Assessment

JSON + version envelope + fixture seed + env paths is the right proving design. Replace it when a trigger in §27 fires, through the existing ports.

---

## API Assessment

Evolvable. Do not version. Do not add transaction writes until the product has a write UI and live-sibling validation.

---

## Security Assessment

Appropriate for localhost single-user. Auth is a production-readiness gap, not a current defect.

---

## Observability Assessment

Insufficient for production; sufficient for development. First additions: 5xx/store logs and health.

---

## Testing Assessment

Protects domain and current API well. Does not protect CI, concurrency, crash recovery, or production-like e2e.

---

## PWA Assessment

API NetworkOnly is correct. Stale shell + failed API can still show old numbers beside a banner. Fail-closed money UI is the production fix.

---

## Scalability Assessment

Appropriate now. Unsuitable for multi-user without a database and identity. No need for queues.

---

## 26. Critical findings

### A. Blockers

**None.** Continuing Finora product slices on this foundation is justified.

### B. Important

1. **Optimistic UI** — form success ≠ durable persist. Fix before real-user mutations are trusted.
2. **Non-atomic JSON writes** — crash can corrupt a store. Fix before real data (atomic rename or DB).
3. **Fixture-sibling composition** — must change before transaction (or any cross-entity) writes.
4. **PWA stale numbers on API failure** — fail-closed before presenting Finora as current truth offline/down.
5. **No backups / corrupt-file recovery** — required when data is not disposable fixtures.
6. **No observability** — required before any hosted process.
7. **No CI** — should exist before relying on the suite as a gate; not a product blocker.

### C. Technical debt

- Triplicated stores/HTTP helpers
- `accountRuntime` / `finoraAccountApi` naming
- `e2e-*` means Vite fixture modes
- POST 200 vs 201
- `write(entire collection)` port shape
- Double client/server validation (harmless)

### D. Acceptable simplifications

- JSON files instead of PostgreSQL
- No auth / Redis / queues / cloud
- Transaction GET-only
- No cross-store transactions
- No API versioning
- Last-write-wins
- Fixture seed
- localStorage only for test/e2e and one-time migration
- USD-only
- Stored balances not derived from transactions

---

## 27. Recommended evolution path

Recommend only what this repo justifies. Five industry stages are **not** all required on a calendar.

### Stage 1 — Stay on the current JSON backend (now)

**Why:** product is a local proving ground; layers are already clean.
**Trigger:** none — this is the default.
**If skipped:** N/A.
**When:** now.
**Do not build:** PostgreSQL, auth, Redis, queues, API versioning.

Optional hygiene: GitHub Actions `npm test` on PRs.

### Stage 2 — Honest mutations + crash-safe persist (before real user data)

**Why:** UI can report success without a durable write; `writeFileSync` can truncate a file.
**Trigger:** first real balances a person would be upset to lose, or any hosted deploy.
**If skipped:** silent loss on crash or failed HTTP; corrupt store → 500 until manual delete.
**When:** before treating Finora as more than a demo.
**Do not build:** multi-user, message buses.

Minimum: await persist in UI (or unsaved state); write to temp file then rename. A database is an alternative, not a requirement, at this stage.

### Stage 3 — Production persistence (when JSON risk triggers fire)

**Why:** concurrent writers, restore, or identity isolation.
**Trigger:** one of §7 JSON-risk conditions, or Stage 4 auth needing per-user rows.
**If skipped:** lost updates, no isolation, painful backup.
**When:** first condition in §7, not before.
**Do not build:** microservices or cache layers.

Implement as **new adapters behind existing ports**. Pass live sibling stores into application services when transaction writes land.

### Stage 4 — Authentication and ownership (when a second identity or a reachable host exists)

**Why:** localhost has no threat model that requires it; a reachable host does.
**Trigger:** another person, or bind beyond loopback.
**If skipped:** anyone who can hit the port reads/writes the only ledger.
**When:** that trigger, not “because backends have auth.”
**Do not build:** SSO, RBAC matrices, or orgs.

### Stage 5 — Observability and production security (with Stage 2–4, not as a platform project)

**Why:** cannot operate a hosted process without logs/health; cannot expose it without limits.
**Trigger:** process runs unattended or on a network.
**If skipped:** silent 500s; unbounded request cost.
**When:** with first hosted deploy.
**Do not build:** APM vendors, tracing meshes.

### Not justified

Background job processing, Redis, multi-region, API gateways, event sourcing, rewriting the domain into a ledger engine.

---

## 28. Industry best-practice assessment

**For the current stage, yes — with named gaps. For production, no.**

| Practice | Current-stage judgment | Production-grade judgment |
|---|---|---|
| Architecture | Ports, composition root, domain isolation — sound | Needs durable persist + identity at the edge |
| Domain modeling | Strong; one calc module | Strong enough to keep |
| Validation | Centralized field-maps | Keep |
| API boundaries | Clear, tested, boring JSON | Keep; add auth later |
| Persistence abstraction | Real ports; JSON adapter is honest | Adapter swap is feasible |
| Testing | Good unit/integration/UI | Missing CI and production-like e2e |
| Security | Correct for loopback | Not production |
| Observability | Dev-only | Not production |
| Scalability | Correctly not designed for N users | Would fail if forced |
| Deployment | Manual Vite/standalone | No pipeline |

This is **deliberate thin-slice backend engineering**, not accidental spaghetti and not a fake enterprise stack.

---

## Independent Evaluation

A fresh evaluator reviews this package and writes `independent-evaluation.md` in the same directory. That file is the authority for the verdict. Do not soften it.

---

## Completion notes

- Product source, tests, dependencies, APIs, UI, PWA, and AAEP were not changed for findings.
- #40 was not started.
- This document is the durable assessment; supporting files live in `evidence/`.

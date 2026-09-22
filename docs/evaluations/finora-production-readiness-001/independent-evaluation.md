# Independent evaluation — Finora production-readiness 001

## Verdict

**PASS WITH LIMITATIONS**

No genuine product defect was introduced by this increment. The five justified fixes are present, wired, and evidenced. Financial formulas, fixtures, destinations, and insight kinds were not touched. Remaining items in the assessment are classified, not silently repaired.

Limitations are process and leftover ops/a11y — not a broken product model. See [Limitations](#limitations).

## Scope evaluated

- Worktree: `C:\Users\Avinash.Mudunuri\AppData\Local\Temp\aaep-finora-prod-ready`
- Branch: `aaep/finora-production-readiness`
- HEAD: `c6a58cdd32fa4a23204ebdd3b2bb2c0f1c97cc7d` — *Harden production readiness without changing the product model.*
- Baseline `origin/main`: `a2148b9b88583c5787ee5a8c0789603bd1095519` — *Fix duplicate Finora logo on mobile header (#49)*
- Range: `a2148b9...c6a58cd` (one local commit; **not pushed**)
- This evaluator wrote only this file. Product code, tests, CSS, README, AAEP, git branch, and commit were not modified. No PR. No repair. No new slice.

Product files in the range (everything else is eval docs + README ops notes):

| File | Change |
| --- | --- |
| `src/app/AppErrorBoundary.tsx` | new — render-throw UI + `console.error("Finora failed to render.", …)` |
| `src/app/AppErrorBoundary.test.tsx` | new — heading, Reload, “Stored financial records were not changed.” |
| `src/main.tsx` | wrap `<App />` in `AppErrorBoundary`; `root.dataset.finoraMode = import.meta.env.MODE` |
| `src/app/App.tsx` | `console.error` in the three existing gateway `list()` catch blocks |
| `src/styles/index.css` | `--color-text-muted: #94a3b8` → `#64748b` |

Empty in this range: `src/domain/`, `src/data/`, `src/navigation/`, `src/components/`, `src/application/`, `src/infrastructure/`, `server/`.

## What I verified

### Automated gates (re-run in this worktree)

| Gate | Result |
| --- | --- |
| `npm test` | **414** passed / **39** files |
| `npm run typecheck` | pass |
| `npm run lint` | pass |

That matches the assessment (413 + one ErrorBoundary file). I did **not** re-run `npm run build` / PWA `generateSW` so this evaluation would not mutate `dist/`.

### AppErrorBoundary (PR-1)

`AppErrorBoundary` exists. `src/main.tsx` imports it and wraps `<App />` inside `StrictMode`. A render throw sets `hasError`, logs `Finora failed to render.`, and shows a Reload control (`window.location.reload()`) with copy that stored records were not changed. `AppErrorBoundary.test.tsx` asserts the heading, button, and that sentence. That test is part of the 414 that passed.

### Load-failure logging (PR-2)

Account, card, and transaction `list()` catch blocks still set the existing `systemNotice` messages. They now also `console.error` with the error object (`Finora could not load accounts|cards|transactions.`). Mutate paths were not rewritten.

### Build identity (PR-3)

`#root` receives `data-finora-mode` from `import.meta.env.MODE`. Live preview at `http://127.0.0.1:4174/` (already running; not started by this evaluator) reported `dataset.finoraMode === "production"`.

### Muted token (PR-4)

`--color-text-muted` is `#64748b` (same slate as `--color-text-secondary`). Live computed history `th` color is `rgb(100, 116, 139)`. That is AA-range contrast on white (~4.6:1). The CSS hunk does not add `overflow-x: hidden` / a new clip. `html` / `.app-shell` `overflow-x: clip` is already on `a2148b9`.

### README ops (PR-5)

README now documents store env vars, PWA NetworkOnly APIs, stale-SW preview note, `data-finora-mode`, and error-boundary / gateway-log behavior.

### Destinations unchanged

`src/navigation/primary.ts` is byte-identical to `a2148b9`. Locked order in `primary.test.ts` (still passing):

Dashboard, Accounts, Cards, Transactions, Spending, Insights.

Live desktop nav and the 375 drawer both list those six. Cards and Spending set `aria-current="page"` on the matching dest.

### Fixture financials and identities

Authoritative fixture values are unchanged (`src/data/fixtures.ts` not in the diff). Existing calculation / fixture / Dashboard / Spending / Cards tests still pass. Live preview `body.innerText` on Dashboard, Cards, and Spending showed:

| Quantity | Value | Where observed |
| --- | --- | --- |
| Net worth | `$23,168.43` | Dashboard |
| Assets | `$25,337.02` | Dashboard |
| Liabilities | `$2,168.59` | Dashboard |
| Investment | `$8,420.55` | Dashboard |
| September income | `$3,200.00` | Dashboard, Spending |
| September spending | `$87.42` | Dashboard, Spending |
| September savings | `$3,112.58` | Dashboard, Spending |
| Visa minimum | `$35.00` | Dashboard, Cards (`minimumPayment: 35` in fixtures) |
| Visa outstanding | `$1,842.19` | Cards |
| Amex outstanding | `$326.40` | Cards |

Identities:

- Assets − Liabilities = Net Worth: `25337.02 − 2168.59 = 23168.43`
- Income − Spending = Savings: `3200.00 − 87.42 = 3112.58`
- Card minimum is **not** deducted from savings: Visa `$35.00` is still shown; savings is still `$3,112.58`

### #48 nav / overflow (sampled live)

- Desktop (~1303px): horizontal Primary nav, six dests, overflow 0.
- 375×812: compact `Open menu`; drawer lists Close + the six dests; overflow 0. Escape closes the dialog and returns focus to `Open menu`.
- 320×800: Menu present. `html` overflow 15 (`scrollWidth` 320 / `clientWidth` 305); `body` overflow 0. Same scrollbar-gutter classification as #48, not destination overflow.

I did not re-measure every listed viewport (360 / 390 / 414 / 768 / 1024 / 1440). Source + the sampled live pages do not show a new global overflow hide.

## Agreement with the assessment

### Fixed — agree

| ID | Assessment | Independent result |
| --- | --- | --- |
| PR-1 | Error boundary + Reload | Present, wired in `main.tsx`, unit-tested, 414 green |
| PR-2 | `console.error` on gateway load failure | Three catch blocks only; notice path unchanged |
| PR-3 | `#root[data-finora-mode]` | Source + live `production` |
| PR-4 | muted `#64748b` | Token and computed `th` color match |
| PR-5 | README ops notes | Present |

### Verified — agree, with one caveat

Agree: six dests; fixture totals and identities; no calculation / fixture / IA change; #48 drawer still works on the sampled mobile widths; no new global overflow clip; forms/nav a11y claims were not regressable from this diff; no committed secrets / `dangerouslySetInnerHTML` in the increment; 414 / typecheck / lint.

Caveat: production JS/CSS gzip sizes and PWA precache counts were **not** independently rebuilt. I accept them as author measurements. The product hunk is too small to justify a new code-split.

### Deferred — agree

| ID | Assessment | Independent result |
| --- | --- | --- |
| PR-D1 | Skip-to-content | Real WCAG 2.4.1 gap. Not a blank-page or contrast defect. Correctly left out. |
| PR-D2 | Stale `autoUpdate` SW after deploy/preview | Operational. This session’s `:4174` already served `#64748b` / `data-finora-mode=production`; I did not unregister a SW. |
| PR-D3 | External error service | Deployment decision. `console.error` is the sink. |
| PR-D4 | Coverage reporter | Tooling. |
| PR-D5 | Auth-gated source maps | Keep Vite default until a host policy exists. |
| PR-D6 | Self-host Manrope | Privacy/latency tradeoff, not a functional break. |

### Not a defect — agree

No auth / multi-user / cloud DB; read-only transactions; six dests only; Spending still hosts income/savings; card liabilities only; `#44` overflow clip unchanged; in-panel table scroll at narrow widths; card min not deducted from savings; localStorage is not a secret store.

R-3 / R-4 in `runtime-robustness.md` (mutate `.then` without `.catch`; optimistic local write) are existing trust-boundary semantics. This increment did not make them worse.

## Disagreement

None on Fixed / Deferred / Not a defect.

The only qualification is on **Verified** bundle/PWA numbers: I did not re-run the production build. That is an evaluator limit, not a finding that the numbers are wrong.

`--color-text-muted` now equals `--color-text-secondary`. That is an intentional AA collapse, not a missed defect.

## Actual product defects introduced by this increment

- none

## Limitations

1. **Branch not pushed.** `aaep/finora-production-readiness` is `[origin/main: ahead 1]`. HEAD `c6a58cd` exists only locally.
2. **Production / PWA build not re-run** here, to avoid writing `dist/`.
3. **Overflow matrix not fully re-walked.** Independent live checks: ~1303, 375 (drawer + Escape + focus), 320 (15 / 0 gutter). Remaining widths accepted from unchanged CSS/nav plus author `overflow-evidence.json`.
4. **Leftover production-readiness items stay leftover:** no skip link, no CI/CDN/HTTPS contract, `autoUpdate` can serve a stale precache, no Sentry, Google Fonts at runtime. The assessment names them. They do not fail this increment.
5. Playwright used the already-running preview at `http://127.0.0.1:4174/`. AAEP was not changed.

## Recommendation

**Accept for human review.**

Do **not** merge from this evaluation. Do **not** request product changes. Do **not** open a skip-link, SW-update, or Sentry slice on the back of this pass.

Human reviewer should confirm they want `c6a58cd` pushed and reviewed as hardening-only, then decide merge separately.

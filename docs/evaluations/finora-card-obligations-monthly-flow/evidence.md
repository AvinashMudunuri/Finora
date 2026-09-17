# Evidence — Finora #41

## Starting state

Inspected on the implementation worktree before product edits, from `origin/main`.

| Item | Value |
|---|---|
| Remote | https://github.com/AvinashMudunuri/Finora |
| Baseline branch | `origin/main` |
| Starting SHA | `2288f96a50840e87941a8292a136afa8a2cf3c33` |
| Starting message | Assess Finora MVP product gaps against the PRD (#40) |
| Implementation branch | `aaep/finora-card-obligations-monthly-flow` |
| Personal checkout `C:\Codebase\Personal\Finora` | Not this baseline (`cursor/inspect-spending-from-insight`) |

Finora #40 is merged at this SHA. Product tree at start had Dashboard monthly flow (Income / Spending / Savings via `calculateMonthlySavings`) and card payment attention via `calculateCardPaymentAttention`. Card obligations were not shown inside Monthly flow.

### Relevant existing files (pre-change)

- `src/components/Dashboard.tsx` — monthly flow + Attention
- `src/domain/calculations.ts` — `calculateMonthlySavings`, `calculateCardPaymentAttention`, `calculateNetWorth`
- `src/domain/finance.ts` — `paymentStatusLabel`, currency/date format
- `src/components/Cards.tsx` — card list/detail
- `src/app/App.tsx` — `onOpenCard` → Cards view + selected card
- `src/data/fixtures.ts` — Visa `due` / Amex `current`; `e2e-overdue` mode uses Visa `overdue`

### Baseline tests

Command: `npm test -- --reporter=dot` at `2288f96` before this slice.

Result: **36 files, 367 tests passed**.

## Implementation files

| Path | Purpose |
|---|---|
| `src/domain/calculations.ts` | `listCardPaymentObligations`; `calculateCardPaymentAttention` is `list[0] ?? null` |
| `src/domain/calculations.test.ts` | List/empty/zero-min/overdue-before-due ordering |
| `src/components/Dashboard.tsx` | Card payment context under existing Monthly flow |
| `src/components/Dashboard.test.tsx` | Due context, Inspect, current-only empty, overdue-before-due |
| `src/components/Insights.consistency.test.tsx` | `getAllByText("Visa Rewards · Due")` — monthly flow + Attention |
| `src/styles/index.css` | `.flow-obligation*` using existing tokens |
| `docs/evaluations/finora-card-obligations-monthly-flow/` | This package |
| `.gitignore` | `dist-e2e-overdue` (same pattern as other e2e outDirs) |

No new API, route, store, or change to `calculateNetWorth` / `calculateMonthlySavings` / `calculateMonthlyIncome` / `calculateMonthlySpending`.

## Final tests

Command: `npm test -- --reporter=dot`

Result: **36 files, 376 tests passed**, exit 0.

Added coverage: 5 domain + 3 Dashboard (plus consistency matcher). Existing Accounts / Cards / Transactions / Spending / Insights / Net Worth / Dashboard tests remain.

## Validation gates

| Gate | Result |
|---|---|
| Tests | 376 passed |
| Typecheck | `npm run typecheck` — pass |
| Lint | `npm run lint` — pass |
| Production build | `npm run build` — pass |
| PWA | VitePWA `generateSW`, 32 precache entries, `dist/sw.js` written. Workbox API caching unchanged (`NetworkOnly` for `/api/accounts`, `/api/cards`, `/api/transactions`). |
| Architecture/engineering-check scripts | None in this repository |

## Browser validation

Production preview: `http://127.0.0.1:4176/` (`npm run build` + `vite preview`).

Overdue fixture: `npm run build:e2e-overdue -- --outDir dist-e2e-overdue` then preview `:4177`. `e2e-overdue` is a Vite fixture mode, not Playwright. `uses*Backend` is false in `e2e-*`.

Playwright MCP, viewports **1280×720** and **375×812**. Stale service workers were unregistered when a preview served an older Dashboard.

### Scenario A — stored due (production fixture)

- Monthly flow remains Income $3,200.00 / Spending $87.42 / Savings $3,112.58 (Income − spending).
- Card payment: Visa Rewards · Due, minimum $35.00, due Sep 22, 2026.
- Amex Everyday (current) is omitted.
- Inspect Visa Rewards opens Cards with Visa selected: outstanding $1,842.19, min $35.00, status Due, due Sep 22, 2026, utilization 36.8%.
- Overview unchanged: Net worth $23,168.43; assets $25,337.02; liabilities $2,168.59.

### Scenario B — stored overdue (`e2e-overdue`)

- Same monthly I/S/S and net-worth numbers (fixture amounts unchanged).
- Card payment: Visa Rewards · Overdue, minimum $35.00, due Sep 22, 2026.
- Attention still shows “Card payment overdue” for the same card.
- Inspect opens Cards with Payment status Overdue and the same outstanding / min / due date.

### Scenario C — multiple cards

Production fixture: one due + one current → only Visa listed (same as attention).

Unit/component: overdue before due, then original list order. No second scoring system.

### Scenario D — mobile 375×812

- Monthly flow + Card payment + Inspect remain readable in one column.
- `documentElement.scrollWidth === clientWidth` (360) on due and overdue.
- Obligation is below the fold; evidence scrolled to `#card-payment-heading`.

### Screenshots

| File | What |
|---|---|
| [desktop-1280-due-financial-position.png](./evidence/desktop-1280-due-financial-position.png) | Overview NW / assets / liabilities |
| [desktop-1280-due-monthly-flow.png](./evidence/desktop-1280-due-monthly-flow.png) | Monthly flow + due obligation + Inspect |
| [desktop-1280-due-cards-inspect.png](./evidence/desktop-1280-due-cards-inspect.png) | Cards detail after Inspect (Due) |
| [desktop-1280-overdue-monthly-flow.png](./evidence/desktop-1280-overdue-monthly-flow.png) | Monthly flow + overdue obligation |
| [desktop-1280-overdue-cards-inspect.png](./evidence/desktop-1280-overdue-cards-inspect.png) | Cards detail after Inspect (Overdue) |
| [mobile-375-due-financial-position.png](./evidence/mobile-375-due-financial-position.png) | Mobile overview |
| [mobile-375-due-monthly-flow.png](./evidence/mobile-375-due-monthly-flow.png) | Mobile monthly flow + due + Inspect |
| [mobile-375-overdue-monthly-flow.png](./evidence/mobile-375-overdue-monthly-flow.png) | Mobile monthly flow + overdue + Inspect |

## Financial consistency (same fixture)

| Field | Dashboard monthly flow | Cards / detail | Attention | Net worth |
|---|---|---|---|---|
| Visa identity | Visa Rewards | Visa Rewards | Visa Rewards | — |
| Outstanding | not shown in flow (intentional) | $1,842.19 | $1,842.19 | included in $2,168.59 liabilities |
| Minimum payment | $35.00 | $35.00 | $35.00 | — |
| Due date | Sep 22, 2026 | Sep 22, 2026 | Sep 22, 2026 | — |
| Status (prod) | Due | Due | Due | — |
| Status (e2e-overdue) | Overdue | Overdue | Overdue | — |
| Income / spending / savings | $3,200.00 / $87.42 / $3,112.58 | — | — | NW change +$3,112.58 uses same savings math |

## Known limitations

- Current cards do not appear in the monthly-flow obligation list (same rule as payment attention).
- Outstanding is not repeated in the monthly-flow row; Inspect / Cards / Attention remain the outstanding surfaces.
- No “after payment” cash number — the domain does not define one.
- `e2e-overdue` is a Vite mode, not a Playwright suite.
- Chrome `--screenshot` was not used for evidence (headless glyph artifacts); Playwright viewport captures are the screenshots above.

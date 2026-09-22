# Assessment

## Baseline (`a2148b9`, before this increment)

| Gate | Result |
| --- | --- |
| Commit | `a2148b9` — Fix duplicate Finora logo on mobile header (#49) |
| `origin/main` | same SHA |
| Tests | 38 files / **413** passed |
| Typecheck | pass |
| Lint | pass |
| Coverage | none configured |
| Production build (after justified edits) | 47 modules; JS 294.52 kB / gzip 80.12 kB; CSS 16.47 kB / gzip 3.67 kB |
| PWA | `generateSW`, 32 precache entries, 968.81 KiB |
| Secrets / `.env` | none committed |
| `dangerouslySetInnerHTML` | none |

The live tree already answered the four product questions on the frozen six destinations. No product slice was justified. The audit looked for production-impacting engineering gaps only.

## Fixed

| ID | Severity | Change |
| --- | --- | --- |
| PR-1 | HIGH | `AppErrorBoundary` wraps the tree so a render throw is a reload path, not a blank page. Logs `Finora failed to render.` |
| PR-2 | MEDIUM | Account / card / transaction gateway load failures already set `systemNotice`; they now also `console.error` with the error object. |
| PR-3 | LOW | `#root` gets `data-finora-mode` from `import.meta.env.MODE` so a production/e2e build is identifiable in the DOM. |
| PR-4 | MEDIUM | `--color-text-muted` `#94a3b8` (~2.86:1 on white) → `#64748b` (~4.60:1) so table headers, insight tones, and quiet notes meet WCAG AA. |
| PR-5 | LOW | README documents ops: store env vars, PWA NetworkOnly APIs, stale-SW preview note, error-boundary behavior. |

No financial formula, fixture, route, destination, or insight kind changed.

## Verified

- Production JS/CSS size is acceptable for this SPA; code-splitting was not justified.
- Six destinations remain Dashboard / Accounts / Cards / Transactions / Spending / Insights.
- #48 mobile drawer: open, Close, Escape, dest select, focus return to `Open menu`. Desktop horizontal nav unchanged at 768 / 1024 / 1440.
- Horizontal page overflow is 0 at 360–1440. At 320, `html` reports 15px and `body` reports 0 — scrollbar gutter, same as #48. Not a new clip.
- Fixture financials unchanged on Dashboard, Cards, and Spending (see [regression.md](./regression.md)).
- Forms already have labels, `aria-invalid`, `role="alert"` / `role="status"`. Primary nav uses `aria-current="page"`.
- Gateway mutate paths already return `{ ok: false }` instead of throwing.
- No committed secrets. No `dangerouslySetInnerHTML`. `/api/*` is NetworkOnly in Workbox.
- Existing 413 tests plus one ErrorBoundary test: **414** passed. Typecheck and lint passed.

## Deferred

| ID | Severity | Why not in this increment |
| --- | --- | --- |
| PR-D1 | MEDIUM | Skip-to-content link (WCAG 2.4.1). Header remounts per view; a skip link is real a11y polish, not a blank-page or contrast defect. |
| PR-D2 | HIGH (ops) | Stale service-worker precache after a new deploy/preview until `autoUpdate` activates. Needs a hosting/update decision, not a PWA redesign. |
| PR-D3 | MEDIUM | External error service (Sentry or equivalent). Requires an account and DSN — deployment decision. |
| PR-D4 | LOW | Coverage reporter / CI badge. Tooling, not a product defect. |
| PR-D5 | LOW | Production source maps behind authenticated hosting. Vite default emits none; keep it that way until a host policy exists. |
| PR-D6 | INFORMATIONAL | Self-host Manrope instead of Google Fonts. Privacy/latency tradeoff, not a functional break. |

## Not a defect

- No authentication, multi-user, or cloud database.
- No transaction CRUD, categories, budgets, forecasts, AI, holdings, or market data.
- Spending still hosts income/savings. No `/income` `/savings` `/investments` `/net-worth`.
- `html` / `.app-shell` `overflow-x: clip` from #44 remains; this increment did not add a new global hide/clip to paper over overflow.
- History tables may scroll horizontally inside `.panel` at 719px — intentional.
- Card minimum payment is not deducted from savings.
- localStorage is only a one-time migration leftover / e2e path, not a secret store.

## Outcome

Justified hardening only. Product model unchanged. Stop after independent evaluation. Do not open a capability #49.

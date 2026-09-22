# Regression

## Automated gates (after justified edits)

| Gate | Result |
| --- | --- |
| `npm test` | **414** passed / 39 files (was 413 / 38) |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run build` | pass — 47 modules, JS 294.52 kB / 80.12 kB gzip, CSS 16.47 kB / 3.67 kB gzip |
| PWA | `generateSW`, 32 entries, 968.81 KiB |
| e2e fixture builds | `build:e2e-all-current`, `overdue`, `nw-decreased`, `nw-unchanged`, `high-util`, `no-attention` — then a final `npm run build` so `dist/` is production |

New test: `src/app/AppErrorBoundary.test.tsx` — render throw shows heading, Reload, and “Stored financial records were not changed.”

Existing calculation / fixture / Dashboard / Spending / Cards tests were not edited.

## Financial regression (authoritative fixtures)

Observed in production preview `innerText` and existing unit tests:

| Quantity | Value | Surfaces |
| --- | --- | --- |
| Net worth | `$23,168.43` | Dashboard |
| Assets | `$25,337.02` | Dashboard |
| Liabilities | `$2,168.59` | Dashboard |
| Investment | `$8,420.55` | Dashboard, Accounts |
| September income | `$3,200.00` | Dashboard, Spending |
| September spending | `$87.42` | Dashboard, Spending |
| September savings | `$3,112.58` | Dashboard, Spending |
| Visa minimum | `$35.00` | Dashboard, Cards |
| Visa outstanding | `$1,842.19` | Cards |
| Amex outstanding | `$326.40` | Cards |

Identities:

- Assets − Liabilities = Net Worth (`25337.02 − 2168.59 = 23168.43`)
- Income − Spending = Savings (`3200.00 − 87.42 = 3112.58`)
- Card minimum is **not** deducted from savings (Visa `$35.00` still present; savings still `$3,112.58`)

No calculation module was modified.

## Browser / #48 nav

| Viewport | Overflow | Nav |
| --- | --- | --- |
| 1440×900 | 0 | desktop, six dests |
| 1024×768 | 0 | desktop |
| 768×1024 | 0 | desktop |
| 414×896 | 0 | Menu |
| 390×844 | 0 | Menu |
| 375×812 | 0 | Menu; Escape; focus → Open menu; all six dests |
| 360×800 | 0 | Menu |
| 320×800 | html 15 / body 0 | Menu; gutter, not dest overflow |

Desktop dest walk: Dashboard, Accounts, Cards, Transactions, Spending, Insights — each `h1` matched, `aria-current="page"` on the dest, overflow 0.

## IA freeze

No new route, destination, calculation, insight kind, or store.

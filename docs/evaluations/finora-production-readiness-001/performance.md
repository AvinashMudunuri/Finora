# Performance

## Measurements (production `vite build`)

| Asset | Raw | gzip |
| --- | --- | --- |
| `index-*.js` | 294.52 kB | 80.12 kB |
| `index-*.css` | 16.47 kB | 3.67 kB |
| `index.html` | 5.50 kB | 1.54 kB |
| `registerSW.js` | 0.13 kB | — |
| `manifest.webmanifest` | 0.44 kB | — |
| Modules transformed | 47 | |
| PWA precache | 32 entries / 968.81 KiB | mostly PNG brand/PWA icons |

Dependencies in the client bundle are React 19 + React DOM only. No chart library, no date-fns, no UI kit.

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| P-1 | INFORMATIONAL | Single JS chunk ~80 kB gzip is appropriate for a six-view SPA that remounts each destination. | Verified. No route-level split. |
| P-2 | INFORMATIONAL | Precache ~0.95 MiB is dominated by existing PNG wordmark / PWA icons, not JS. | Verified. Do not recompress brand assets in this increment. |
| P-3 | INFORMATIONAL | Calculations run in render from in-memory fixture/API state. Fixture size is 15 transactions. | Verified. Memoization would be speculative. |
| P-4 | LOW | Google Fonts (Manrope) is a render-blocking stylesheet with preconnect. | Deferred (PR-D6). Self-hosting is a deploy/privacy choice. |
| P-5 | MEDIUM | Stale Workbox precache can serve a previous `index-*.js/css` on the same origin until the new SW activates. Observed on `127.0.0.1:4174` (old `index-BNz8OleS.css`). | Documented. Unregister or wait for `autoUpdate`. Do not redesign the PWA. |

## Before / after this increment

ErrorBoundary + `console.error` + `data-finora-mode` did not move the production JS size off 294.52 kB / 80.12 kB gzip. The muted-token CSS change kept CSS at 16.47 kB.

No performance architecture was introduced.

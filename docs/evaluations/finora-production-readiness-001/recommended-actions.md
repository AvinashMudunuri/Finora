# Recommended actions

## Deploy this increment

1. Node `>=20.19.0` (Volta 22.14.0).
2. `npm ci` or `npm install`.
3. `npm test && npm run typecheck && npm run lint && npm run build`.
4. Serve `dist/` with the existing Account / Card / Transaction HTTP handlers (`npm run preview` or `npm run server`).
5. Bind the process to localhost unless you intentionally expose the JSON stores.
6. After publish, hard-refresh or wait for the new service worker. If numbers or CSS look stale, unregister the SW and delete `workbox-precache-v2-*`.
7. Confirm `#root[data-finora-mode="production"]` and fixture totals: NW `$23,168.43`, assets `$25,337.02`, liabilities `$2,168.59`.

## Next engineering (not product) — only if a human asks

| Priority | Item |
| --- | --- |
| 1 | Hosting decision: HTTPS static host + how the Node JSON API is reached (or keep `npm run server` as the whole app). |
| 2 | Service-worker update UX (reload prompt) if operators keep hitting stale precache. Do not switch to `overflow-x: hidden`. |
| 3 | Optional skip-to-content link (PR-D1). |
| 4 | Optional error reporting DSN (PR-D3) — do not add the SDK until the DSN exists. |
| 5 | Optional self-hosted Manrope (PR-D6). |

## Do not do next

- Do not create a capability increment numbered as the next product slice.
- Do not rename Spending.
- Do not add Dashboard cards, routes, insight kinds, auth, Redis, queues, or a cloud database.
- Do not reopen OPEN PRD decisions.

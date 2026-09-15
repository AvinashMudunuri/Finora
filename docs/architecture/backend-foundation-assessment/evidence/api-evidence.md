# API evidence (HEAD 6c9160b)

## Routes

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/accounts` | `{ accounts }` |
| POST | `/api/accounts` | `{ account }` — 200 on success |
| PUT | `/api/accounts/:id` | `{ account }` |
| GET | `/api/cards` | `{ cards }` |
| POST | `/api/cards` | `{ card }` — 200 on success |
| PUT | `/api/cards/:id` | `{ card }` |
| GET | `/api/transactions` | `{ transactions }` newest-first via `listTransactions` |

No POST/PUT for transactions. UI is read-only; contract is `list()` only.

## Shared HTTP behavior

- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: no-store`
- Body cap `MAX_BODY_BYTES = 64 * 1024` (accounts/cards writes)
- Malformed JSON → 400 `{ kind: "validation", errors: { form } }`
- Field validation → 400 `{ kind: "validation", errors }` field-map
- Missing entity → 404 `{ kind: "not_found", error }`
- Unknown method/path under the collection → 404
- Store/unexpected errors → 500 `{ kind: "unavailable", error }` user message
- Tests assert no filesystem path leakage

## Dispatch

Vite plugin `finoraAccountApi` on `configureServer` and `configurePreviewServer`.
Standalone `createAccountRequestListener` dispatches accounts → cards → transactions
→ static (with path-prefix guard) or JSON 404.

HTML bootstrap injection (accounts, cards, transactions) on `transformIndexHtml`
and standalone `index.html` serve.

## Security observations (current single-user local server)

- Bound default `127.0.0.1:4174`
- Static path traversal blocked via `normalize` + root prefix check
- No authentication / authorization / user isolation
- No CORS headers (same-origin Vite/standalone)
- CSRF not relevant for local same-origin JSON API at this stage
- No rate limit beyond 64KiB body
- No request IDs or structured logs
- No health endpoint

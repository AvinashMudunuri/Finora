# Security / configuration hygiene

## Verified

- No `.env`, tokens, or credentials in the repository.
- Optional store paths are `FINORA_ACCOUNT_STORE`, `FINORA_CARD_STORE`, `FINORA_TRANSACTION_STORE` — filesystem locations, not secrets.
- No `dangerouslySetInnerHTML`, `eval`, or `document.write` in app source.
- API error bodies do not include filesystem paths or stack traces (existing contract tests).
- PWA `scope` / `start_url` are `/`. Workbox `/api/accounts|cards|transactions` are NetworkOnly.
- Vite production build does not emit `.map` files (no `sourcemap: true`).
- `npm audit` was not part of the existing script set; no vulnerability scanner was already wired. Did not invent one.

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| S-1 | INFORMATIONAL | Account/card/transaction JSON is financial data at rest on the host filesystem / one-time localStorage migration. There is no authn. | **Not a defect.** Intentional MVP. Do not add authentication in this increment. |
| S-2 | LOW | Google Fonts loads from `fonts.googleapis.com` / `fonts.gstatic.com`. | Deferred (PR-D6). Privacy, not XSS. |
| S-3 | INFORMATIONAL | `localStorage` keys `finora.managed-ledger.v1` / `finora.managed-cards.v1` are migration leftovers. Production preview uses the HTTP stores. | Not a defect. |
| S-4 | LOW | Anyone who can reach the preview/server process can read and mutate the JSON stores. | **Not a defect** until auth is a product decision. Bind the process to localhost for personal use. |

## Not introduced

Authentication, CSP headers, rate limiting, or a cloud database.

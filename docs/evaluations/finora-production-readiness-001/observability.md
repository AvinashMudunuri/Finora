# Observability

This is a frontend MVP plus a local JSON HTTP process. Observability stays proportionate.

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| O-1 | MEDIUM | Render failures were invisible (blank page, no log). | **Fixed.** `componentDidCatch` logs `Finora failed to render.` plus the error and component stack. |
| O-2 | MEDIUM | Gateway load failures were user-visible but silent in the console. | **Fixed.** Structured `console.error` with the caught value. |
| O-3 | LOW | No runtime build identity. | **Fixed.** `#root[data-finora-mode]` = `development` \| `production` \| `e2e-*`. Verified `production` after cache clear. |
| O-4 | MEDIUM | PWA can hide a new deploy behind an old precache with no operator-facing version string. | Deferred (PR-D2). Documented in [deployment.md](./deployment.md). |
| O-5 | MEDIUM | No external error sink. `console.error` is lost on a user’s device. | Deferred (PR-D3). Do not add Sentry without a DSN and a host decision. |

## Console noise

The app does not log on the happy path. After this increment, console writes are:

- `Finora failed to render.` (boundary)
- `Finora could not load accounts|cards|transactions.` (gateway `list` catch)

That is an acceptable production noise level for this MVP.

# Deployment

## What the production build already is

```bash
npm install          # Node >=20.19.0; Volta pin 22.14.0
npm run build        # tsc -b && vite build
npm run preview      # static dist + Account/Card/Transaction APIs
npm run server       # standalone Node: dist + same APIs
```

PWA (`vite-plugin-pwa`):

- `registerType: "autoUpdate"`
- `generateSW`
- manifest: name Finora, `display: standalone`, `start_url: /`, `scope: /`, theme `#0B1B34`
- icons: 192 / 512 / maskable 512
- navigate fallback denylist: `/api/`
- runtime: `/api/accounts`, `/api/cards`, `/api/transactions` → NetworkOnly

`#root` carries `data-finora-mode="production"` on this build.

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| D-1 | HIGH (ops) | Same-origin preview kept serving `index-BNz8OleS.css` / `index-CPjMmvhA.js` from Workbox until SW + caches were unregistered. New hashes were `index-DN0LJLM1.css` / `index-BqDwscUY.js`. | Documented. After each deploy, wait for `autoUpdate` or unregister SW before verifying. Do not redesign the PWA. |
| D-2 | MEDIUM | Hosting is unspecified (no CI, no CDN, no HTTPS assumption in repo). `npm run server` is a local Node process writing JSON files. | Deployment decision. See checklist in [recommended-actions.md](./recommended-actions.md). |
| D-3 | INFORMATIONAL | e2e modes (`e2e-all-current`, `e2e-overdue`, …) overwrite `dist/` except `high-util` / `no-attention` (`dist-e2e-*`). Always finish with `npm run build`. | Documented in README. |
| D-4 | LOW | Offline: shell/assets may load from precache; `/api/*` will fail and surface the existing unavailable notices. | Verified by configuration. Acceptable for this MVP. |

## Environment

| Name | Required | Purpose |
| --- | --- | --- |
| `FINORA_ACCOUNT_STORE` | no | Override `data/accounts.json` |
| `FINORA_CARD_STORE` | no | Override `data/cards.json` |
| `FINORA_TRANSACTION_STORE` | no | Override `data/transactions.json` |

No other environment variables. Do not invent a `.env` template.

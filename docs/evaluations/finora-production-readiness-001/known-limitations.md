# Known limitations

## Intentional MVP (not defects)

- No authentication, multi-user, or cloud database.
- Transactions are read-only. No categories, budgets, forecasts, AI, holdings, or market data.
- Six destinations only. Spending still hosts income and savings.
- Card liabilities only. No loans or other non-card liabilities.
- Single-currency USD fixtures. No FX.
- `html` / `.app-shell` `overflow-x: clip` from #44 remains as an existing belt; this increment did not add a new global hide.
- History tables may scroll inside `.panel` below 720px.

## Operational

- `vite preview` / `npm run server` is the deploy shape. There is no CI, CDN, or HTTPS contract in-repo.
- `registerType: autoUpdate` can serve a previous hashed JS/CSS until the new service worker activates. Observed on a reused `127.0.0.1:4174` origin.
- `console.error` is the only failure sink. There is no versioned release identifier beyond `data-finora-mode`.
- Google Fonts is a third-party runtime dependency for Manrope.
- e2e Vite modes that share `dist/` overwrite the production tree; always rebuild production last.

## Accessibility remaining

- No skip-to-content link (WCAG 2.4.1). Header remounts per destination.
- Contrast on navy primary-card muted text (`#c5d0dc` on `#0b1b34`) was not a fail; only the light-background muted token was.

## Product observations (deferred, not implemented)

Dashboard length, “This month” shorthand, and Spending-as-income-host remain UX polish from the final MVP audit. They are not production-readiness defects and were not reopened.

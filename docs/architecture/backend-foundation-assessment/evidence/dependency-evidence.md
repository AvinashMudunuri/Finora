# Dependency and runtime evidence (HEAD 6c9160b)

## Runtime dependencies (package.json)

Production:

- `react` ^19.2.8
- `react-dom` ^19.2.8

No Express, no ORM, no PostgreSQL client, no Redis, no queue library,
no auth library.

Dev: Vite 8, Vitest 5, TypeScript 5.9, Testing Library, ESLint, vite-plugin-pwa.

Node `>=20.19.0`, Volta pin `22.14.0`.
Server entry: `node --experimental-strip-types server/standalone.ts`.

## PWA (vite.config.ts)

- `navigateFallbackDenylist: [/^\/api\//]`
- `runtimeCaching` NetworkOnly for `/api/accounts`, `/api/cards`, `/api/transactions`
- App-shell assets precached (`js,css,html,svg,png,webmanifest`)

Cached HTML/bootstrap can be older than the JSON stores. After load, gateways
fetch NetworkOnly. On API failure, React keeps bootstrap/fixture state and
sets an unavailable banner.

## CI/CD

No `.github/workflows` directory. No in-repo CI.

## e2e-* scripts

`build:e2e-all-current`, `build:e2e-overdue`, `build:e2e-nw-decreased`,
`build:e2e-nw-unchanged`, `build:e2e-high-util`, `build:e2e-no-attention`
are **Vite `--mode` fixture builds**, not Playwright. `uses*Backend()` is
false in those modes, so they do not exercise the JSON backend.

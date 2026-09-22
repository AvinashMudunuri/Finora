# Finora — Production Readiness Hardening

Engineering-quality increment only. Not a product/capability slice. Six-surface IA and financial semantics are frozen.

| File | Role |
| --- | --- |
| [assessment.md](./assessment.md) | Baseline, Fixed / Verified / Deferred / Not a defect |
| [performance.md](./performance.md) | Bundle, PWA precache, render cost |
| [accessibility.md](./accessibility.md) | Keyboard, names, contrast, structure |
| [runtime-robustness.md](./runtime-robustness.md) | Empty/malformed paths, error boundary |
| [observability.md](./observability.md) | Console, build identity, SW failures |
| [security.md](./security.md) | Secrets, DOM, PWA scope, localStorage |
| [deployment.md](./deployment.md) | Build, PWA, environment, stale cache |
| [regression.md](./regression.md) | Tests, lint, typecheck, build, browser, financials |
| [known-limitations.md](./known-limitations.md) | Intentional MVP limits and remaining ops gaps |
| [recommended-actions.md](./recommended-actions.md) | Deployment checklist and deferred ops work |
| [evaluatorPrompt.md](./evaluatorPrompt.md) | Independent evaluator brief |
| [evidence/](./evidence/) | Browser and overflow JSON |

**Baseline HEAD:** `origin/main` `a2148b9` (#47, #48, and #49 logo fix)

**Branch:** `aaep/finora-production-readiness`

Do not merge from the implementation session. Do not start another product slice.

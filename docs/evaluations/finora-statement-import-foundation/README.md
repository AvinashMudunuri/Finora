# Finora statement import foundation

CSV + text-based PDF → normalize → validate → preview → confirm → persist into a user ledger. No bank aggregation.

GitHub #50 is already the production-readiness PR. This slice is a new increment.

| File | Role |
| --- | --- |
| [architecture.md](./architecture.md) | Seam, extractor interface, fixture isolation |
| [implementation-summary.md](./implementation-summary.md) | What shipped |
| [requirement-to-evidence.md](./requirement-to-evidence.md) | Requirement → evidence |
| [validation.md](./validation.md) | Tests, gates, browser |
| [known-limitations.md](./known-limitations.md) | Parser ceiling, deferred formats |
| [security-boundary.md](./security-boundary.md) | Production-readiness leftovers |
| [evaluatorPrompt.md](./evaluatorPrompt.md) | Independent evaluator brief |
| [independent-evaluation.md](./independent-evaluation.md) | Written only by a separate evaluator |
| [evidence/](./evidence/) | Samples, screenshots, overflow notes |

**Baseline:** `origin/main` `7f3f780`

**Branch:** `aaep/finora-statement-import`

Do not start XLSX / OFX / auth / cloud after this package.

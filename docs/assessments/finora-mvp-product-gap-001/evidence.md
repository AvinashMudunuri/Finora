# Evidence — Finora #40

## Repository baseline

| Item | Value |
|---|---|
| Remote | https://github.com/AvinashMudunuri/Finora |
| Inspected | `origin/main` |
| HEAD SHA | `3e5b6dc88207cc06846f80eb9586e6a25555bc0d` |
| Message | Assess Finora backend foundation after #36/#37/#38 (#39) |
| Working tree at inspection | clean |
| Assessment branch | `aaep/finora-mvp-product-gap-assessment` |

Recent merged product/backend slices on this SHA:

| PR | Commit | What |
|---|---|---|
| #39 | `3e5b6dc` | Backend foundation assessment (docs) |
| #38 | `6c9160b` | Transactions backend GET |
| #37 | `b19a357` | Cards backend |
| #36 | `86fb90b` | Accounts backend |
| #35 | `bb29816` | Account and card management |
| #34 | `bd8ca21` | Dashboard position / change / attention / evidence |
| #33 | `77106ff` | Searchable, filterable, inspectable transactions |

`C:\Codebase\Personal\Finora` was on `cursor/inspect-spending-from-insight` and is not this baseline.

## Product source of truth

Used: `docs/product/PRD.md` (this SHA).

Not found on disk: `Financial_Cards_App_PRD_for_AAEP(2).docx`. The committed PRD contains the sections this ticket lists (vision, principles, IA, Overview through Settings, MVP boundary, AAEP strategy, build sequence, NFRs, open decisions, MVP acceptance).

## Application structure (product surfaces)

Views in `src/app/App.tsx` / `src/components/SiteHeader.tsx`:

- `dashboard` — `Dashboard.tsx` (labeled Dashboard; contains Overview)
- `accounts` — `Accounts.tsx`
- `cards` — `Cards.tsx`
- `transactions` — `Transactions.tsx`
- `spending` — `Spending.tsx` (also shows income and savings)
- `insights` — `Insights.tsx` → `AttentionInsights.tsx`

No Settings view. No Income, Savings, Investments, or Net Worth routes.

Domain: `src/domain/{types,validate,calculations,finance,insights}.ts`  
Data: `src/data/fixtures.ts`  
Backend (not the subject of this product assessment): `server/`, `src/application/`, `src/infrastructure/`

## Tests

Command: `npm test -- --reporter=dot` on `3e5b6dc` before assessment commits.

Result: **36 files, 367 tests passed**, exit 0.

`e2e-*` npm scripts are Vite fixture **modes**, not Playwright. They disable HTTP backends (`uses*Backend()` false).

## Validation (assessment must not change product)

After the assessment commit, `git diff 3e5b6dc...HEAD` must contain only `docs/assessments/finora-mvp-product-gap-001/`.

No `package.json` / lockfile / `src/` / `server/` edits.

Suite was run on the unmodified product tree at `3e5b6dc`. Assessment artifacts do not change product behavior.

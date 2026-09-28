# Requirement → evidence

| Requirement | Result | Evidence |
| --- | --- | --- |
| Explicit `payment status: due` → due | Pass | `pdf.test.ts`; existing CARD fixture |
| Explicit `payment status: overdue` → overdue | Pass | `pdf.test.ts` |
| Due date without status → not due | Pass | `pdf.test.ts`; node parse of `text-card-current.pdf` → `current` |
| Current + due date stays current | Pass | `pdf.test.ts`; browser persist `paymentStatus: "current"`; Dashboard “No stored card payment is due.” |
| Do not infer overdue from dates | Pass | Status regex requires `payment status:` |
| Review type = persist type | Pass | `resolvePersistedEventType`; `service.test.ts`; review shows NEFT **Needs review** |
| Unresolved transfer/card payment cannot confirm | Pass | persist error; Import button disabled; StatementImport test |
| No general editor / new routes / new formulas | Pass | Diff is import parser + preview/persist + tests |
| Fixture September totals unchanged | Pass | `calculations.ts` not in diff; Dashboard before import `$23,168.43` / `$3,200.00` |
| Transfers not spending | Pass | persist with funding: spending `$87.42` |
| Card purchases stay card purchases | Pass | persist + browser `card_purchase` |
| Genuine due/overdue attention unchanged | Pass | Existing fixture card tests; formulas untouched |

#52 items explicitly out of scope remain open: warnings, mapping timing, duplicates, undo, identity.

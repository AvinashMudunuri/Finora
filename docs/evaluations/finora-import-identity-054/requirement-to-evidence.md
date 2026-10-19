# Requirement → evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Explicit Create does not auto-match | `service.test.ts` “creates a new account when Create is selected even if a name matches”; `resolveIdentity` no longer calls `identifyParty` | Pass |
| Explicit selection still attaches | `service.test.ts` “attaches to an explicitly selected matching account” | Pass |
| Two bank accounts | `service.test.ts` two different statements; browser `checking.csv` + `second-bank.csv` → `acc-imp-1` and `acc-imp-2` | Pass |
| Two cards, same issuer | `service.test.ts` Visa Rewards then Visa Signature; `identify.test.ts` two Visas stay `ambiguous` | Pass |
| Re-import same statement | Existing persist test + content-id early refuse | Pass |
| Renamed copy | `service.test.ts` `hdfc-copy.csv`; browser `checking-copy.csv` → `0 new · 2 already imported`; Import disabled | Pass |
| Preview does not use first account as Create party | `StatementImport.tsx` partyId `accountId \|\| "new"` | Pass |
| Calculations unchanged | `git diff origin/main -- src/domain/calculations.ts` empty; demo net worth `$23,168.43` | Pass |
| No new routes / model / XLSX / OFX / auth | Diff is import service, duplicates, StatementImport, tests | Pass |

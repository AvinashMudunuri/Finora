# Implementation summary

## Defects

1. **Create did not mean create.** Empty `selectedAccountId` / `selectedCardId` still ran `identifyParty`. A unique name or issuer substring attached the statement to an existing party and could overwrite that party's balance/card facts.
2. **Renamed files duplicated transactions.** `sourceFileId` included the file name. Line fingerprints included `partyId`. Create + a new file name therefore created another account and another copy of the same lines.

## Changes

- `resolveIdentity` honors an explicit existing selection. Otherwise it **creates**. It does not call `identifyParty`.
- Preview party id is the selected id or `"new"`, never `accounts[0]` / `cards[0]`.
- Persist identity is `statementContentId` (header fingerprint + line body). File name is display-only.
- `hasImportedLineSet` treats an already-imported full line set as the same statement even if the previous `sourceFileId` used a filename hash.
- Import is disabled when `newCount === 0`.
- `identifyParty` remains as a tested matcher. Persist no longer uses it to override Create.

`src/domain/calculations.ts` is unchanged.

## Not changed

Warnings UI, mapping-before-confirm, undo, XLSX, OFX, aggregation, auth, event types, routes, stores, APIs.

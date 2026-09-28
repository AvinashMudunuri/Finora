# Known limitations

Carried forward from #52. Not repaired here.

- Warnings are still stored and not shown.
- Column mappings can still persist on Map → Continue before import confirm.
- Renamed-file + Create can still duplicate ledger events.
- No undo after confirm.
- Empty Create still runs `identifyParty` (unique substring match).
- Text PDF is still a `Tj` + line parser. No OCR. No bank-PDF product.
- First statement that contains a transfer or card payment cannot confirm until a funding/counterparty account already exists. That is the intended block, not a silent downgrade.
- XLSX / OFX / aggregation / auth remain out of scope.

## Discovered residual — not repaired

Independent evaluation found a remaining review/persist type disagreement. Documented here; not fixed in this increment.

| Field | Value |
| --- | --- |
| Defect | Create selected + `identifyParty` unique-matches a different account than preview’s `accounts[0]` + funding = that preview party → review shows **Needs review** (`unknown`), persist stores **transfer**. |
| Evidence | Independent node probe: Create + statement name matching `HDFC Savings` + funding = `acc-first` → preview NEFT `"unknown"`; persist stores `"transfer"` on `acc-hdfc`. Confirm is enabled because `fundingAccountId` is set. See `independent-evaluation.md`. |
| Severity | Material on that path (user confirms one type, store another). Not the #52 sample (empty ledger / unfunded NEFT). That sample is blocked. |
| Smallest correction | Preview persist `partyId` must be the same identity persist will use (run `identifyParty` during preview, or disable confirm when Create + identify can remap). Do not add a transaction editor. |
| Separate increment? | **Yes.** This is the unrepaired #52 Create/account-identity finding colliding with the new shared-type rule. Out of this increment’s scope guard. |

# Known limitations

Carried forward. Not repaired here.

- Warnings are still stored and not shown.
- Column mappings can still persist on Map → Continue before import confirm.
- No undo after confirm.
- Text PDF is still a `Tj` + line parser. No OCR. No bank-PDF product.
- CSV extract still has no institution / party name, so created accounts are often named “Imported account”. Distinct ids still separate them.
- `Corner Cafe` still classifies as `unknown` (expense heuristic does not include “cafe”). That is existing classifier behavior, not this increment.
- First statement that contains a transfer or card payment still cannot confirm until a funding/counterparty account exists (#53 rule).
- `hasImportedLineSet` is full imported line-set equality. Two different statements with identical dates/amounts/descriptions would collide. Named in `duplicates.ts`.
- XLSX / OFX / aggregation / auth remain out of scope.

`identifyParty` still unique-matches on name/issuer substring. Persist no longer uses that match to override Create.

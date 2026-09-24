# Known limitations — still binding

Carried forward from the statement-import foundation, plus review notes. Not repaired here.

- PDF extraction is literal `Tj` strings plus line-oriented `DATE desc AMT CR|DR` rows. Scanned/image-only PDFs are rejected. No OCR. Not a bank-PDF product.
- CSV metadata (institution, masked number) is usually absent. Closing balance is the last running-balance cell when present. Opening balance is not invented from that series. Missing closing becomes `0` on a new account.
- Transfers and card payments without an explicit funding/counterparty persist as `unknown`.
- User ledger is single-currency. CSV extraction currently stores `"USD"`. No FX.
- Persistence is `localStorage`. Not encrypted. Not multi-user. Not a backend. File bytes are not stored.
- XLSX and OFX/QFX remain reserved on the extractor interface only.
- Statement history lives on Transactions. `fileName` is stored and not shown.
- Card statements that omit outstanding, minimum payment, due date, period end, or payment status cannot create a new card. Parser `paymentStatus` is not safe (finding 1).
- Review cannot edit fields. No undo after confirm.
- Duplicate safety is line+party fingerprint plus `sourceFileId` (includes file name). It is not a statement-level consumer guarantee.

## Out of scope (do not start)

XLSX, OFX, bank aggregation, authentication, new routes, new insight kinds, budgets, forecasts, AI, new financial models, cloud data architecture, generalized bank-PDF parsing.

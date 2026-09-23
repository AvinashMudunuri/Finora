# Known limitations

- PDF extraction is literal `Tj` strings plus line-oriented `DATE desc AMT CR|DR` rows. Scanned/image-only PDFs are rejected. No OCR.
- CSV metadata (institution, masked number) is usually absent; the user confirms account vs card. Closing balance is taken from the last running-balance cell when present. Opening balance is not invented from that series.
- Transfers and card payments without an explicit funding/counterparty account persist as `unknown` so they cannot become income or spending.
- User ledger is single-currency. No FX. Fixtures remain USD.
- Persistence is `localStorage`. Not encrypted. Not multi-user. Not a backend.
- XLSX and OFX/QFX are reserved on the extractor interface only.
- Statement history is on Transactions, not a new primary destination.
- Card statements that omit outstanding, minimum payment, due date, period end, or payment status cannot create a new card. Finora will not invent those fields.

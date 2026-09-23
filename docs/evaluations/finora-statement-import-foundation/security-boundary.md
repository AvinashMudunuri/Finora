# Security boundary

This slice does **not** claim production-grade financial-data security.

Statements stay on the device (`localStorage`). They are not sent to Plaid, Yodlee, MX, Salt Edge, Open Banking, Account Aggregator, or any other aggregation provider. Uploaded files and transaction rows are not written to `console`.

Before real remote consumer data is enabled, these remain open:

- authentication
- authorization
- encryption at rest
- encrypted file storage
- retention / deletion policy
- backups
- secrets management
- privacy policy
- data export
- account deletion
- audit logging
- breach / error handling

Those are a later persistence/security increment, not part of CSV + text PDF import.

import { useState } from "react";
import { eventTypeLabel, formatCurrency, formatDate } from "../domain/finance.ts";
import { detectColumnMapping, mappingFingerprint, parseCsvText } from "../application/import/csv.ts";
import { readFileText } from "../application/import/readFile.ts";
import { detectExtractor, extractCsvWithMapping, persistImport, previewImport } from "../application/import/service.ts";
import { rememberColumnMapping } from "../application/import/store.ts";
import type {
  ClassifiedLine,
  ColumnMapping,
  ColumnRole,
  DuplicateSummary,
  ExtractedStatement,
  ImportPartyKind,
  ImportedStatement,
  PreviewTotals,
  Reconciliation,
  UserLedger,
} from "../application/import/types.ts";

type StatementImportProps = {
  ledger: UserLedger;
  onLedgerChange: (ledger: UserLedger) => void;
};

const ROLES: ColumnRole[] = ["date", "description", "debit", "credit", "amount", "balance", "ignore"];

export function StatementImport({ ledger, onLedgerChange }: StatementImportProps) {
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [statement, setStatement] = useState<ExtractedStatement | null>(null);
  const [partyKind, setPartyKind] = useState<ImportPartyKind>("account");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [fundingAccountId, setFundingAccountId] = useState("");
  const [step, setStep] = useState<"file" | "map" | "preview" | "review">("file");
  const [classified, setClassified] = useState<ClassifiedLine[]>([]);
  const [totals, setTotals] = useState<PreviewTotals>({ income: 0, spending: 0, transfers: 0 });
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateSummary | null>(null);

  function reset(): void {
    setError("");
    setFile(null);
    setCsvText("");
    setHeaders([]);
    setMapping({});
    setStatement(null);
    setCreditLimit("");
    setFundingAccountId("");
    setStep("file");
    setClassified([]);
    setDuplicates(null);
  }

  async function onFile(next: File | null): Promise<void> {
    setError("");
    setFile(next);
    if (!next) {
      return;
    }
    try {
      const extractor = detectExtractor(next);
      if (!extractor) {
        setError("We couldn't identify transaction dates and amounts in this file.");
        return;
      }
      if (extractor.kind === "csv") {
        const text = await readFileText(next);
        const parsed = parseCsvText(text);
        const remembered = ledger.columnMappings[mappingFingerprint(parsed.headers)];
        const detected = remembered
          ? { mapping: remembered, ambiguous: false, missing: [] }
          : detectColumnMapping(parsed.headers);
        setCsvText(text);
        setHeaders(parsed.headers);
        setMapping(detected.mapping);
        if (detected.ambiguous) {
          setStep("map");
          return;
        }
        applyExtracted(extractCsvWithMapping(text, detected.mapping));
        return;
      }
      applyExtracted(await extractor.extract(next));
    } catch {
      setError("We couldn't identify transaction dates and amounts in this file.");
    }
  }

  function applyExtracted(extracted: ExtractedStatement): void {
    if (extracted.error) {
      setError(extracted.error);
      setStatement(null);
      return;
    }
    const kind = extracted.partyKind ?? partyKind;
    setPartyKind(kind);
    setStatement(extracted);
    refreshPreview(extracted, kind, selectedAccountId, selectedCardId);
    setStep("preview");
  }

  function refreshPreview(
    extracted: ExtractedStatement,
    kind: ImportPartyKind,
    accountId: string,
    cardId: string,
  ): void {
    const partyId =
      kind === "card" ? cardId || ledger.cards[0]?.id || "new" : accountId || ledger.accounts[0]?.id || "new";
    const preview = previewImport(extracted, kind, ledger.transactions, partyId);
    setClassified(preview.classified);
    setTotals(preview.totals);
    setReconciliation(preview.reconciliation);
    setDuplicates(preview.duplicates);
  }

  function confirmMapping(): void {
    const extracted = extractCsvWithMapping(csvText, mapping);
    if (headers.length > 0) {
      onLedgerChange(rememberColumnMapping(ledger, mappingFingerprint(headers), mapping));
    }
    applyExtracted(extracted);
  }

  function confirmImport(): void {
    if (!file || !statement) {
      return;
    }
    const result = persistImport({
      ledger,
      fileName: file.name,
      fileSize: file.size,
      statement,
      partyKind,
      selectedAccountId: selectedAccountId || undefined,
      selectedCardId: selectedCardId || undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      fundingAccountId: fundingAccountId || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onLedgerChange(result.ledger);
    reset();
  }

  return (
    <section className="panel" aria-labelledby="import-heading">
      <div className="panel-header">
        <h2 id="import-heading">Import statement</h2>
        <p className="panel-copy">
          CSV or text-based PDF. Nothing is stored until you confirm. Demo
          fixtures stay separate.
        </p>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === "file" ? (
        <label className="field">
          <span>Statement file</span>
          <input
            type="file"
            accept=".csv,.pdf,text/csv,application/pdf"
            onChange={(event) => {
              void onFile(event.target.files?.[0] ?? null).catch(() => {
                setError("We couldn't identify transaction dates and amounts in this file.");
              });
            }}
          />
        </label>
      ) : null}

      {step === "map" ? (
        <div className="stack-form">
          <p className="panel-copy">Map columns</p>
          {ROLES.filter((role) => role !== "ignore").map(
            (role) => (
              <label key={role} className="field">
                <span>{role}</span>
                <select
                  value={mapping[role] ?? ""}
                  onChange={(event) => {
                    setMapping({ ...mapping, [role]: event.target.value || undefined });
                  }}
                >
                  <option value="">Not used</option>
                  {headers.map((header) => (
                    <option key={`${role}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ),
          )}
          <button type="button" className="form-action" onClick={confirmMapping}>
            Continue
          </button>
        </div>
      ) : null}

      {step === "preview" && statement ? (
        <div className="stack-form">
          <p className="panel-copy">
            {[statement.institution, statement.partyName, statement.maskedNumber]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="panel-copy">
            {(statement.periodStart ?? "Period unknown") +
              " – " +
              (statement.periodEnd ?? "Period unknown")}
          </p>
          <p className="panel-copy">{classified.length} transactions found</p>
          <dl className="position-breakdown" role="group" aria-label="Import totals">
            <div>
              <dt>Income</dt>
              <dd>{formatCurrency(totals.income, statement.currency ?? ledger.currency)}</dd>
            </div>
            <div>
              <dt>Spending</dt>
              <dd>{formatCurrency(totals.spending, statement.currency ?? ledger.currency)}</dd>
            </div>
            <div>
              <dt>Transfers</dt>
              <dd>{formatCurrency(totals.transfers, statement.currency ?? ledger.currency)}</dd>
            </div>
          </dl>
          {duplicates ? (
            <p className="panel-copy">
              {duplicates.newCount} new · {duplicates.duplicateCount} already imported
            </p>
          ) : null}
          {reconciliation?.kind === "mismatch" ? (
            <p className="field-error" role="alert">
              Statement could not be fully reconciled. Expected closing balance:{" "}
              {formatCurrency(reconciliation.expectedClosing, statement.currency ?? ledger.currency)}.
              Calculated closing balance:{" "}
              {formatCurrency(reconciliation.calculatedClosing, statement.currency ?? ledger.currency)}.
              Review the imported transactions before continuing.
            </p>
          ) : null}
          <label className="field">
            <span>This statement is for</span>
            <select
              value={partyKind}
              onChange={(event) => {
                const next = event.target.value as ImportPartyKind;
                setPartyKind(next);
                refreshPreview(statement, next, selectedAccountId, selectedCardId);
              }}
            >
              <option value="account">Bank / cash / investment account</option>
              <option value="card">Credit card</option>
            </select>
          </label>
          {partyKind === "account" && ledger.accounts.length > 0 ? (
            <label className="field">
              <span>Existing account</span>
              <select
                value={selectedAccountId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedAccountId(next);
                  refreshPreview(statement, partyKind, next, selectedCardId);
                }}
              >
                <option value="">Create from statement</option>
                {ledger.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {partyKind === "card" && ledger.cards.length > 0 ? (
            <label className="field">
              <span>Existing card</span>
              <select
                value={selectedCardId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedCardId(next);
                  refreshPreview(statement, partyKind, selectedAccountId, next);
                }}
              >
                <option value="">Create from statement</option>
                {ledger.cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {partyKind === "card" && !selectedCardId ? (
            <label className="field">
              <span>Credit limit</span>
              <input
                inputMode="decimal"
                value={creditLimit}
                onChange={(event) => {
                  setCreditLimit(event.target.value);
                }}
              />
            </label>
          ) : null}
          {classified.some(
            (line) => line.eventType === "transfer" || line.eventType === "card_payment",
          ) && ledger.accounts.length > 0 ? (
            <label className="field">
              <span>Funding or counterparty account</span>
              <select
                value={fundingAccountId}
                onChange={(event) => {
                  setFundingAccountId(event.target.value);
                }}
              >
                <option value="">Leave as needs review</option>
                {ledger.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="choice-row">
            <button type="button" className="form-action-secondary" onClick={reset}>
              Back
            </button>
            <button
              type="button"
              className="form-action"
              onClick={() => {
                setStep("review");
              }}
            >
              Review transactions
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" && statement ? (
        <div className="stack-form">
          <p className="panel-copy">
            {classified.length} transactions ·{" "}
            {classified.filter((line) => line.needsReview).length} need review
          </p>
          <div className="panel history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Debit/Credit</th>
                  <th scope="col">Detected type</th>
                </tr>
              </thead>
              <tbody>
                {classified.map((line) => (
                  <tr key={`${line.date}-${line.description}-${line.amount}`}>
                    <td>{formatDate(line.date)}</td>
                    <th scope="row">{line.description}</th>
                    <td>{formatCurrency(line.amount, statement.currency ?? ledger.currency)}</td>
                    <td>{line.direction === "credit" ? "Credit" : "Debit"}</td>
                    <td>{line.needsReview ? "Needs review" : eventTypeLabel(line.eventType)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="choice-row">
            <button
              type="button"
              className="form-action-secondary"
              onClick={() => {
                setStep("preview");
              }}
            >
              Back
            </button>
            <button type="button" className="form-action" onClick={confirmImport}>
              {duplicates ? `Import ${duplicates.newCount} new transactions` : "Import"}
            </button>
          </div>
        </div>
      ) : null}

      <ImportedStatementList statements={ledger.statements} />
    </section>
  );
}

function ImportedStatementList({ statements }: { statements: ImportedStatement[] }) {
  if (statements.length === 0) {
    return null;
  }
  return (
    <div className="stack-form">
      <h3>Imported statements</h3>
      <ul className="transaction-list" aria-label="Imported statements">
        {statements.map((statement) => (
          <li key={statement.statementId}>
            <p className="transaction-description">
              {statement.institution} · {statement.partyLabel}
            </p>
            <p className="panel-copy">
              {(statement.periodStart ?? "—") + " – " + (statement.periodEnd ?? "—")} ·{" "}
              {statement.transactionCount} transactions · {statusLabel(statement.status)} ·{" "}
              {statement.importedAt}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusLabel(status: ImportedStatement["status"]): string {
  if (status === "needs_review") {
    return "Needs review";
  }
  if (status === "partially_imported") {
    return "Partially imported";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Imported";
}

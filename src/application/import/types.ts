import type {
  Account,
  AccountType,
  Card,
  CardPaymentStatus,
  CurrencyCode,
  Transaction,
  TransactionEventType,
} from "../../domain/types.ts";

export type StatementKind = "csv" | "pdf" | "xlsx" | "ofx";

export type ImportDirection = "credit" | "debit";

export type ImportPartyKind = "account" | "card";

export type ImportStatus =
  | "imported"
  | "needs_review"
  | "partially_imported"
  | "failed";

export type ColumnRole =
  | "date"
  | "description"
  | "debit"
  | "credit"
  | "amount"
  | "balance"
  | "ignore";

export type ColumnMapping = Partial<Record<ColumnRole, string>>;

export type ExtractedLine = {
  date: string;
  description: string;
  amount: number;
  direction: ImportDirection;
  balance?: number;
};

export type ExtractedStatement = {
  kind: StatementKind;
  institution?: string;
  partyName?: string;
  partyKind?: ImportPartyKind;
  accountType?: AccountType;
  maskedNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  currency?: CurrencyCode;
  openingBalance?: number;
  closingBalance?: number;
  outstandingBalance?: number;
  minimumPayment?: number;
  paymentDueDate?: string;
  paymentStatus?: CardPaymentStatus;
  lines: ExtractedLine[];
  warnings: string[];
  error?: string;
};

export type ClassifiedLine = ExtractedLine & {
  eventType: TransactionEventType;
  needsReview: boolean;
};

export type Reconciliation =
  | { kind: "ok" }
  | { kind: "skipped"; reason: "missing-opening" | "missing-closing" }
  | {
      kind: "mismatch";
      expectedClosing: number;
      calculatedClosing: number;
    };

export type DuplicateSummary = {
  newCount: number;
  duplicateCount: number;
  newLines: ClassifiedLine[];
  duplicateLines: ClassifiedLine[];
};

export type PreviewTotals = {
  income: number;
  spending: number;
  transfers: number;
};

export type ImportedStatement = {
  statementId: string;
  sourceFileId: string;
  fileName: string;
  institution: string;
  partyLabel: string;
  partyKind: ImportPartyKind;
  partyId: string;
  periodStart?: string;
  periodEnd?: string;
  currency: CurrencyCode;
  transactionCount: number;
  importedAt: string;
  status: ImportStatus;
};

export type UserLedger = {
  version: 1;
  currency: CurrencyCode;
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  statements: ImportedStatement[];
  columnMappings: Record<string, ColumnMapping>;
};

export type StatementExtractor = {
  kind: StatementKind;
  canHandle(file: File): boolean;
  extract(file: File): Promise<ExtractedStatement>;
};

export const USER_LEDGER_STORAGE_KEY = "finora.user-ledger.v1";

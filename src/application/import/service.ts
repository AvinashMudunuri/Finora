import type { Account, Card, Transaction } from "../../domain/types.ts";
import { assertValidFinanceData } from "../../domain/validate.ts";
import { classifyLines, previewTotals } from "./classify.ts";
import { csvExtractorCanHandle, extractCsvStatement, parseCsvText } from "./csv.ts";
import { sourceFileId, splitDuplicates, statementFingerprint } from "./duplicates.ts";
import { identifyParty } from "./identify.ts";
import {
  extractLiteralPdfStrings,
  looksScannedPdf,
  parsePdfStatement,
  pdfExtractorCanHandle,
} from "./pdf.ts";
import { readFileBytes, readFileText } from "./readFile.ts";
import { reconcileStatement } from "./reconcile.ts";
import type {
  ClassifiedLine,
  ColumnMapping,
  DuplicateSummary,
  ExtractedStatement,
  ImportPartyKind,
  ImportedStatement,
  PreviewTotals,
  Reconciliation,
  StatementExtractor,
  UserLedger,
} from "./types.ts";

export const STATEMENT_EXTRACTORS: StatementExtractor[] = [
  {
    kind: "csv",
    canHandle: csvExtractorCanHandle,
    async extract(file) {
      return extractCsvStatement(await readFileText(file), {});
    },
  },
  {
    kind: "pdf",
    canHandle: pdfExtractorCanHandle,
    async extract(file) {
      const buffer = await readFileBytes(file);
      const raw = new TextDecoder("latin1").decode(buffer);
      const text = extractLiteralPdfStrings(raw);
      if (looksScannedPdf(raw, text)) {
        return parsePdfStatement("");
      }
      return parsePdfStatement(text || raw);
    },
  },
];

export function detectExtractor(file: File): StatementExtractor | null {
  return STATEMENT_EXTRACTORS.find((extractor) => extractor.canHandle(file)) ?? null;
}

export function extractCsvWithMapping(text: string, mapping: ColumnMapping): ExtractedStatement {
  return extractCsvStatement(text, mapping);
}

export function previewImport(
  statement: ExtractedStatement,
  partyKind: ImportPartyKind,
  existing: readonly Transaction[],
  partyId: string,
): {
  classified: ClassifiedLine[];
  totals: PreviewTotals;
  reconciliation: Reconciliation;
  duplicates: DuplicateSummary;
} {
  const classified = classifyLines(statement.lines, partyKind);
  return {
    classified,
    totals: previewTotals(classified),
    reconciliation: reconcileStatement(
      statement.lines,
      statement.openingBalance,
      statement.closingBalance,
    ),
    duplicates: splitDuplicates(classified, existing, partyId),
  };
}

export function persistImport(input: {
  ledger: UserLedger;
  fileName: string;
  fileSize: number;
  statement: ExtractedStatement;
  partyKind: ImportPartyKind;
  selectedAccountId?: string;
  selectedCardId?: string;
  creditLimit?: number;
  fundingAccountId?: string;
}):
  | { ok: true; ledger: UserLedger; imported: number; status: ImportedStatement["status"] }
  | { ok: false; error: string } {
  const identity = resolveIdentity(input);
  if (!identity.ok) {
    return identity;
  }

  const { partyId, accounts, cards } = identity;
  const preview = previewImport(
    input.statement,
    input.partyKind,
    input.ledger.transactions,
    partyId,
  );
  if (preview.duplicates.newCount === 0 && preview.classified.length > 0) {
    return { ok: false, error: "Those transactions are already imported." };
  }

  const sourceId = sourceFileId(
    input.fileName,
    input.fileSize,
    statementFingerprint(input.statement),
  );
  const now = new Date().toISOString().slice(0, 10);
  const transactions = preview.duplicates.newLines.map((line, index) =>
    toTransaction(line, {
      id: `${sourceId}-${index + 1}`,
      sourceFileId: sourceId,
      partyKind: input.partyKind,
      partyId,
      fundingAccountId: input.fundingAccountId,
      currency: input.statement.currency ?? input.ledger.currency,
    }),
  );

  const needsReview = transactions.some((transaction) => transaction.eventType === "unknown");
  const discarded = input.statement.warnings.length > 0;
  const status = needsReview
    ? "needs_review"
    : discarded
      ? "partially_imported"
      : "imported";

  const statement: ImportedStatement = {
    statementId: sourceId,
    sourceFileId: sourceId,
    fileName: input.fileName,
    institution: input.statement.institution ?? "Imported statement",
    partyLabel: partyLabel(input, accounts, cards, partyId),
    partyKind: input.partyKind,
    partyId,
    periodStart: input.statement.periodStart,
    periodEnd: input.statement.periodEnd,
    currency: input.statement.currency ?? input.ledger.currency,
    transactionCount: transactions.length,
    importedAt: now,
    status,
  };

  try {
    const ledger = {
      ...input.ledger,
      currency: statement.currency,
      accounts,
      cards,
      transactions: [...input.ledger.transactions, ...transactions],
      statements: [...input.ledger.statements, statement],
    };
    assertValidFinanceData(ledger.accounts, ledger.cards, ledger.transactions);
    return { ok: true, ledger, imported: transactions.length, status };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "The import would produce an invalid financial model.",
    };
  }
}

export function parseCsvHeaders(text: string): string[] {
  return parseCsvText(text).headers;
}

function resolveIdentity(input: {
  ledger: UserLedger;
  statement: ExtractedStatement;
  partyKind: ImportPartyKind;
  selectedAccountId?: string;
  selectedCardId?: string;
  creditLimit?: number;
}):
  | { ok: true; partyId: string; accounts: Account[]; cards: Card[] }
  | { ok: false; error: string } {
  if (input.partyKind === "account" && input.selectedAccountId) {
    if (!input.ledger.accounts.some((account) => account.id === input.selectedAccountId)) {
      return { ok: false, error: "Select the account or card this statement belongs to." };
    }
    return {
      ok: true,
      partyId: input.selectedAccountId,
      accounts: applyAccountBalance(
        input.ledger.accounts,
        input.selectedAccountId,
        input.statement,
      ),
      cards: [...input.ledger.cards],
    };
  }
  if (input.partyKind === "card" && input.selectedCardId) {
    if (!input.ledger.cards.some((card) => card.id === input.selectedCardId)) {
      return { ok: false, error: "Select the account or card this statement belongs to." };
    }
    return {
      ok: true,
      partyId: input.selectedCardId,
      accounts: [...input.ledger.accounts],
      cards: applyCardFacts(input.ledger.cards, input.selectedCardId, input.statement),
    };
  }

  const decision = identifyParty(input.statement, input.ledger.accounts, input.ledger.cards);
  if (decision.kind === "ambiguous") {
    if (input.selectedAccountId) {
      return {
        ok: true,
        partyId: input.selectedAccountId,
        accounts: [...input.ledger.accounts],
        cards: [...input.ledger.cards],
      };
    }
    if (input.selectedCardId) {
      return {
        ok: true,
        partyId: input.selectedCardId,
        accounts: [...input.ledger.accounts],
        cards: [...input.ledger.cards],
      };
    }
    return { ok: false, error: "Select the account or card this statement belongs to." };
  }

  if (decision.kind === "account") {
    return {
      ok: true,
      partyId: decision.account.id,
      accounts: applyAccountBalance(input.ledger.accounts, decision.account.id, input.statement),
      cards: [...input.ledger.cards],
    };
  }

  if (decision.kind === "card") {
    return {
      ok: true,
      partyId: decision.card.id,
      accounts: [...input.ledger.accounts],
      cards: applyCardFacts(input.ledger.cards, decision.card.id, input.statement),
    };
  }

  if (input.partyKind === "card") {
    if (input.creditLimit === undefined || !(input.creditLimit > 0)) {
      return {
        ok: false,
        error: "Enter the card credit limit. Finora does not invent that value from the statement.",
      };
    }
    if (input.statement.outstandingBalance === undefined) {
      return { ok: false, error: "This card statement did not include an outstanding balance." };
    }
    if (input.statement.minimumPayment === undefined) {
      return { ok: false, error: "This card statement did not include a minimum payment." };
    }
    if (!input.statement.paymentDueDate) {
      return { ok: false, error: "This card statement did not include a payment due date." };
    }
    if (!input.statement.periodEnd) {
      return { ok: false, error: "This card statement did not include a statement period end." };
    }
    if (!input.statement.paymentStatus) {
      return {
        ok: false,
        error: "This card statement did not include a payment status. Finora will not invent one.",
      };
    }
    const outstanding = input.statement.outstandingBalance;
    if (outstanding > input.creditLimit) {
      return { ok: false, error: "Outstanding balance cannot exceed the credit limit." };
    }
    const card: Card = {
      id: `card-imp-${input.ledger.cards.length + 1}`,
      name: input.statement.partyName ?? "Imported card",
      issuer: input.statement.institution ?? "Imported issuer",
      creditLimit: input.creditLimit,
      outstandingBalance: outstanding,
      availableCredit: input.creditLimit - outstanding,
      currency: input.statement.currency ?? input.ledger.currency,
      statementPeriodEnd: input.statement.periodEnd,
      paymentDueDate: input.statement.paymentDueDate,
      minimumPayment: input.statement.minimumPayment,
      paymentStatus: input.statement.paymentStatus,
    };
    return {
      ok: true,
      partyId: card.id,
      accounts: [...input.ledger.accounts],
      cards: [...input.ledger.cards, card],
    };
  }

  const account: Account = {
    id: `acc-imp-${input.ledger.accounts.length + 1}`,
    name: input.statement.partyName ?? input.statement.institution ?? "Imported account",
    type: input.statement.accountType ?? "bank",
    balance: input.statement.closingBalance ?? 0,
    currency: input.statement.currency ?? input.ledger.currency,
  };
  return {
    ok: true,
    partyId: account.id,
    accounts: [...input.ledger.accounts, account],
    cards: [...input.ledger.cards],
  };
}

function applyAccountBalance(
  accounts: Account[],
  id: string,
  statement: ExtractedStatement,
): Account[] {
  if (statement.closingBalance === undefined) {
    return [...accounts];
  }
  return accounts.map((account) =>
    account.id === id ? { ...account, balance: statement.closingBalance! } : account,
  );
}

function applyCardFacts(
  cards: Card[],
  id: string,
  statement: ExtractedStatement,
): Card[] {
  return cards.map((card) => {
    if (card.id !== id) {
      return card;
    }
    const outstanding = statement.outstandingBalance ?? card.outstandingBalance;
    return {
      ...card,
      outstandingBalance: outstanding,
      availableCredit: card.creditLimit - outstanding,
      ...(statement.minimumPayment === undefined
        ? {}
        : { minimumPayment: statement.minimumPayment }),
      ...(statement.paymentDueDate === undefined
        ? {}
        : { paymentDueDate: statement.paymentDueDate }),
      ...(statement.periodEnd === undefined ? {} : { statementPeriodEnd: statement.periodEnd }),
      ...(statement.paymentStatus === undefined
        ? {}
        : { paymentStatus: statement.paymentStatus }),
    };
  });
}

function toTransaction(
  line: ClassifiedLine,
  context: {
    id: string;
    sourceFileId: string;
    partyKind: ImportPartyKind;
    partyId: string;
    fundingAccountId?: string;
    currency: string;
  },
): Transaction {
  const base = {
    id: context.id,
    date: line.date,
    description: line.description,
    amount: line.amount,
    currency: context.currency,
    eventType: line.eventType,
    source: "import" as const,
    sourceFileId: context.sourceFileId,
  };

  if (line.eventType === "card_purchase" || (line.eventType === "unknown" && context.partyKind === "card")) {
    return {
      ...base,
      accountId: null,
      counterpartyAccountId: null,
      cardId: context.partyId,
    };
  }

  if (line.eventType === "card_payment") {
    if (!context.fundingAccountId || context.partyKind !== "card") {
      return {
        ...base,
        eventType: "unknown",
        accountId: context.partyKind === "account" ? context.partyId : null,
        counterpartyAccountId: null,
        cardId: context.partyKind === "card" ? context.partyId : null,
      };
    }
    return {
      ...base,
      accountId: context.fundingAccountId,
      counterpartyAccountId: null,
      cardId: context.partyId,
    };
  }

  if (line.eventType === "transfer") {
    if (!context.fundingAccountId || context.fundingAccountId === context.partyId) {
      return {
        ...base,
        eventType: "unknown",
        accountId: context.partyKind === "card" ? null : context.partyId,
        counterpartyAccountId: null,
        cardId: context.partyKind === "card" ? context.partyId : null,
      };
    }
    return {
      ...base,
      accountId: context.partyId,
      counterpartyAccountId: context.fundingAccountId,
      cardId: null,
    };
  }

  return {
    ...base,
    accountId: context.partyId,
    counterpartyAccountId: null,
    cardId: null,
  };
}

function partyLabel(
  input: {
    statement: ExtractedStatement;
    selectedAccountId?: string;
    selectedCardId?: string;
  },
  accounts: Account[],
  cards: Card[],
  partyId: string,
): string {
  const account = accounts.find((item) => item.id === partyId);
  const card = cards.find((item) => item.id === partyId);
  const masked = input.statement.maskedNumber;
  const name = account?.name ?? card?.name ?? input.statement.partyName ?? "Imported";
  return masked ? `${name} ${masked}` : name;
}

import type { ImportPartyKind } from "./types.ts";
import type { ClassifiedLine, ExtractedLine, PreviewTotals } from "./types.ts";
import type { TransactionEventType } from "../../domain/types.ts";

export function classifyLines(
  lines: ExtractedLine[],
  partyKind: ImportPartyKind,
): ClassifiedLine[] {
  return lines.map((line) => classifyLine(line, partyKind));
}

export function classifyLine(
  line: ExtractedLine,
  partyKind: ImportPartyKind,
): ClassifiedLine {
  const text = line.description.toLowerCase();

  if (isTransfer(text)) {
    return { ...line, eventType: "transfer", needsReview: false };
  }
  if (isCardPayment(text)) {
    return { ...line, eventType: "card_payment", needsReview: false };
  }
  if (isIncome(text) && line.direction === "credit") {
    return { ...line, eventType: "income", needsReview: false };
  }
  if (isInvestment(text)) {
    return { ...line, eventType: "investment", needsReview: false };
  }
  if (partyKind === "card" && line.direction === "debit") {
    return { ...line, eventType: "card_purchase", needsReview: false };
  }
  if (partyKind === "account" && line.direction === "debit" && looksLikeExpense(text)) {
    return { ...line, eventType: "expense", needsReview: false };
  }

  return { ...line, eventType: "unknown", needsReview: true };
}

export function previewTotals(lines: ClassifiedLine[]): PreviewTotals {
  return lines.reduce<PreviewTotals>(
    (totals, line) => {
      if (line.eventType === "income") {
        totals.income += line.amount;
      }
      if (line.eventType === "expense" || line.eventType === "card_purchase") {
        totals.spending += line.amount;
      }
      if (line.eventType === "transfer") {
        totals.transfers += line.amount;
      }
      return totals;
    },
    { income: 0, spending: 0, transfers: 0 },
  );
}

export function eventTypeNeedsReview(eventType: TransactionEventType): boolean {
  return eventType === "unknown";
}

function isTransfer(text: string): boolean {
  return (
    /\bneft\b|\bimps\b|\brtgs\b|transfer to|transfer from|\btrf\b/.test(text)
  );
}

function isCardPayment(text: string): boolean {
  return (
    /payment thank you|payment received|\bautopay\b|card payment|payment — thank you/.test(
      text,
    )
  );
}

function isIncome(text: string): boolean {
  return /\bpayroll\b|\bsalary\b|interest credit/.test(text);
}

function isInvestment(text: string): boolean {
  return /\bdividend\b|\bbrokerage\b/.test(text);
}

function looksLikeExpense(text: string): boolean {
  return /\bpos\b|\bpurchase\b|\bupi\b|\bpos\b|market|grocery|rent\b/.test(text);
}

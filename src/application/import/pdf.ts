import type { AccountType, CardPaymentStatus } from "../../domain/types.ts";
import { parseAmount, parseFlexibleDate } from "./csv.ts";
import type { ExtractedLine, ExtractedStatement, ImportPartyKind } from "./types.ts";

export function pdfExtractorCanHandle(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || file.type === "application/pdf";
}

export function parsePdfStatement(text: string): ExtractedStatement {
  const trimmed = text.split("\0").join(" ").trim();
  if (!trimmed) {
    return {
      kind: "pdf",
      lines: [],
      warnings: [],
      error:
        "This PDF appears to be scanned. Finora currently supports text-based statements.",
    };
  }

  const lines = extractPdfLines(trimmed);
  if (lines.length === 0) {
    return {
      kind: "pdf",
      lines: [],
      warnings: [],
      error: "We couldn't identify transaction dates and amounts in this file.",
    };
  }

  return {
    kind: "pdf",
    institution: matchText(trimmed, /(?:bank|issuer)\s*[:-]\s*(.+)/i) ?? inferInstitution(trimmed),
    partyName: matchText(trimmed, /(?:account|card)\s*(?:name)?\s*[:-]\s*(.+)/i),
    partyKind: inferPartyKind(trimmed),
    accountType: inferAccountType(trimmed),
    maskedNumber: inferMasked(trimmed),
    periodStart: inferPeriod(trimmed, "start"),
    periodEnd: inferPeriod(trimmed, "end"),
    currency: inferCurrency(trimmed),
    openingBalance: inferLabeledAmount(trimmed, /opening balance/i),
    closingBalance: inferLabeledAmount(trimmed, /closing balance/i),
    outstandingBalance: inferLabeledAmount(trimmed, /outstanding(?: balance)?/i),
    minimumPayment: inferLabeledAmount(trimmed, /minimum payment/i),
    paymentDueDate: inferLabeledDate(trimmed, /payment due date/i),
    paymentStatus: inferPaymentStatus(trimmed),
    lines,
    warnings: [],
  };
}

export function looksScannedPdf(raw: string, extractedText: string): boolean {
  const hasImage = /\/Image\b/.test(raw);
  const hasFont = /\/Font\b/.test(raw);
  return hasImage && !hasFont && extractedText.trim().length === 0;
}

export function extractLiteralPdfStrings(raw: string): string {
  const parts: string[] = [];
  const literal = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  for (const match of raw.matchAll(literal)) {
    const body = match[0].slice(1, match[0].lastIndexOf(")"));
    parts.push(body.replace(/\\([()\\])/g, "$1"));
  }
  return parts.join("\n");
}

function extractPdfLines(text: string): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  for (const row of text.split(/\r?\n/)) {
    const parsed = parseStatementRow(row);
    if (parsed) {
      lines.push(parsed);
    }
  }
  return lines;
}

function parseStatementRow(row: string): ExtractedLine | null {
  const match = row.match(
    /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+(.+?)\s+([\d,.]+)\s+(CR|DR|Cr|Dr|credit|debit)$/i,
  );
  if (!match) {
    return null;
  }
  const date = parseFlexibleDate(match[1] ?? "");
  const amount = parseAmount(match[3] ?? "");
  if (!date || !amount || amount <= 0) {
    return null;
  }
  const direction = /cr|credit/i.test(match[4] ?? "") ? "credit" : "debit";
  return {
    date,
    description: (match[2] ?? "").trim(),
    amount,
    direction,
  };
}

function matchText(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value.split("\n")[0]?.trim() : undefined;
}

function inferInstitution(text: string): string | undefined {
  const first = text.split(/\n/).find((line) => /bank|visa|amex|hdfc|icici|sbi|axis/i.test(line));
  return first?.trim();
}

function inferPartyKind(text: string): ImportPartyKind | undefined {
  if (/credit card|visa|amex|mastercard/i.test(text)) {
    return "card";
  }
  if (/savings|checking|current account/i.test(text)) {
    return "account";
  }
  return undefined;
}

function inferAccountType(text: string): AccountType | undefined {
  if (/investment/i.test(text)) {
    return "investment";
  }
  if (/cash/i.test(text)) {
    return "cash";
  }
  if (/savings|checking|bank/i.test(text)) {
    return "bank";
  }
  return undefined;
}

function inferMasked(text: string): string | undefined {
  const match = text.match(/(?:••••|xxxx|xx+)\s*(\d{4})/i);
  return match?.[1] ? `•••• ${match[1]}` : undefined;
}

function inferPeriod(text: string, which: "start" | "end"): string | undefined {
  const range = text.match(
    /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{4}-\d{2}-\d{2})\s*[–\-to]+\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const raw = which === "start" ? range?.[1] : range?.[2];
  return raw ? parseFlexibleDate(raw) ?? undefined : undefined;
}

function inferCurrency(text: string): string | undefined {
  if (/₹|INR|Rs\.?/i.test(text)) {
    return "INR";
  }
  if (/USD|\$/.test(text)) {
    return "USD";
  }
  return undefined;
}

function inferLabeledAmount(text: string, label: RegExp): number | undefined {
  const match = text.match(new RegExp(`${label.source}\\s*[:\\-]?\\s*([\\d,.]+)`, "i"));
  const amount = match?.[1] ? parseAmount(match[1]) : null;
  return amount === null ? undefined : amount;
}

function inferLabeledDate(text: string, label: RegExp): string | undefined {
  const match = text.match(
    new RegExp(
      `${label.source}\\s*[:\\-]?\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s+[A-Za-z]{3}\\s+\\d{4}|\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{4})`,
      "i",
    ),
  );
  return match?.[1] ? parseFlexibleDate(match[1]) ?? undefined : undefined;
}

function inferPaymentStatus(text: string): CardPaymentStatus | undefined {
  if (/\boverdue\b/i.test(text)) {
    return "overdue";
  }
  if (/\bdue\b/i.test(text) && /payment status/i.test(text)) {
    return "due";
  }
  if (/payment status\s*[:-]\s*current/i.test(text)) {
    return "current";
  }
  return undefined;
}

import { describe, expect, it } from "vitest";
import { extractLiteralPdfStrings, looksScannedPdf, parsePdfStatement } from "./pdf.ts";

const TEXT = `
HDFC Bank
Savings Account •••• 1234
01 Aug 2026 – 31 Aug 2026
Opening balance 10000
Closing balance 13112.58
2026-08-03 Payroll — Acme Corp 3200 CR
2026-08-04 Whole Foods Market 87.42 DR
`;

const CARD = `
Visa Rewards
Credit card •••• 4242
Payment due date: 2026-09-22
Minimum payment: 35
Outstanding: 1842.19
Payment status: due
01 Aug 2026 – 31 Aug 2026
2026-08-10 Coffee — Blue Bottle 6.50 DR
2026-08-12 Payment — Thank you 250.00 CR
`;

describe("pdf import", () => {
  it("reads statement metadata and transaction rows", () => {
    const extracted = parsePdfStatement(TEXT);
    expect(extracted.error).toBeUndefined();
    expect(extracted.maskedNumber).toBe("•••• 1234");
    expect(extracted.periodStart).toBe("2026-08-01");
    expect(extracted.periodEnd).toBe("2026-08-31");
    expect(extracted.openingBalance).toBe(10000);
    expect(extracted.closingBalance).toBe(13112.58);
    expect(extracted.lines).toHaveLength(2);
  });

  it("preserves card statement fields when supplied", () => {
    const extracted = parsePdfStatement(CARD);
    expect(extracted.partyKind).toBe("card");
    expect(extracted.minimumPayment).toBe(35);
    expect(extracted.paymentDueDate).toBe("2026-09-22");
    expect(extracted.outstandingBalance).toBe(1842.19);
    expect(extracted.paymentStatus).toBe("due");
    expect(extracted.lines[0]?.direction).toBe("debit");
  });

  it("rejects scanned image-only PDFs", () => {
    expect(looksScannedPdf("%PDF-1.4 /Image /Width 100", "")).toBe(true);
    expect(parsePdfStatement("").error).toMatch(/scanned/i);
  });

  it("rejects text with no transaction rows", () => {
    expect(parsePdfStatement("Hello from a brochure").error).toMatch(/couldn't identify/i);
  });

  it("pulls literal Tj strings from a simple PDF", () => {
    const raw = "%PDF-1.1\nBT (Payroll — Acme Corp) Tj ET";
    expect(extractLiteralPdfStrings(raw)).toContain("Payroll — Acme Corp");
  });
});

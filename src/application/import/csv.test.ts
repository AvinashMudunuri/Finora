import { describe, expect, it } from "vitest";
import {
  detectColumnMapping,
  extractCsvStatement,
  parseCsvText,
} from "./csv.ts";

const SAMPLE = `Transaction Date,Narration,Debit,Credit,Balance
2026-08-03,Payroll — Acme Corp,,3200,8000
2026-08-04,Whole Foods Market,87.42,,7912.58
2026-08-05,NEFT to ICICI Savings,31000,,-23087.42
`;

describe("csv import", () => {
  it("detects common column aliases", () => {
    const detected = detectColumnMapping([
      "Transaction Date",
      "Narration",
      "Debit",
      "Credit",
      "Balance",
    ]);
    expect(detected.ambiguous).toBe(false);
    expect(detected.mapping.date).toBe("Transaction Date");
    expect(detected.mapping.description).toBe("Narration");
    expect(detected.mapping.debit).toBe("Debit");
  });

  it("flags missing required columns as mapping ambiguity", () => {
    const detected = detectColumnMapping(["Foo", "Bar"]);
    expect(detected.ambiguous).toBe(true);
    expect(detected.missing).toContain("date");
  });

  it("parses debit and credit rows", () => {
    const detected = detectColumnMapping(parseCsvText(SAMPLE).headers);
    const extracted = extractCsvStatement(SAMPLE, detected.mapping);
    expect(extracted.error).toBeUndefined();
    expect(extracted.lines).toHaveLength(3);
    expect(extracted.lines[0]).toMatchObject({
      date: "2026-08-03",
      direction: "credit",
      amount: 3200,
    });
    expect(extracted.lines[1]).toMatchObject({
      direction: "debit",
      amount: 87.42,
    });
    expect(extracted.periodStart).toBe("2026-08-03");
    expect(extracted.periodEnd).toBe("2026-08-05");
    expect(extracted.closingBalance).toBe(-23087.42);
  });

  it("rejects malformed CSV with no usable rows", () => {
    const extracted = extractCsvStatement("not,a,statement\nfoo,bar,baz\n", {
      date: "not",
      description: "a",
      amount: "statement",
    });
    expect(extracted.error).toMatch(/couldn't identify/i);
  });
});

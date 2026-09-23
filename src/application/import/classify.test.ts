import { describe, expect, it } from "vitest";
import { classifyLine, previewTotals } from "./classify.ts";

describe("import classification", () => {
  it("keeps transfers out of income and spending", () => {
    const line = classifyLine(
      {
        date: "2026-08-05",
        description: "NEFT to ICICI Savings",
        amount: 31000,
        direction: "debit",
      },
      "account",
    );
    expect(line.eventType).toBe("transfer");
    expect(previewTotals([line])).toEqual({
      income: 0,
      spending: 0,
      transfers: 31000,
    });
  });

  it("classifies payroll as income and groceries as expense", () => {
    expect(
      classifyLine(
        {
          date: "2026-08-03",
          description: "Payroll — Acme Corp",
          amount: 3200,
          direction: "credit",
        },
        "account",
      ).eventType,
    ).toBe("income");
    expect(
      classifyLine(
        {
          date: "2026-08-04",
          description: "Whole Foods Market",
          amount: 87.42,
          direction: "debit",
        },
        "account",
      ).eventType,
    ).toBe("expense");
  });

  it("keeps card purchases and card payments distinct", () => {
    expect(
      classifyLine(
        {
          date: "2026-08-10",
          description: "Coffee — Blue Bottle",
          amount: 6.5,
          direction: "debit",
        },
        "card",
      ).eventType,
    ).toBe("card_purchase");
    expect(
      classifyLine(
        {
          date: "2026-08-12",
          description: "Payment — Thank you",
          amount: 250,
          direction: "credit",
        },
        "card",
      ).eventType,
    ).toBe("card_payment");
  });

  it("does not guess ambiguous bank credits", () => {
    const line = classifyLine(
      {
        date: "2026-08-15",
        description: "REF 99821",
        amount: 40,
        direction: "credit",
      },
      "account",
    );
    expect(line.eventType).toBe("unknown");
    expect(line.needsReview).toBe(true);
  });

  it("classifies dividends as investment", () => {
    expect(
      classifyLine(
        {
          date: "2026-08-18",
          description: "Dividend — VTI",
          amount: 18.4,
          direction: "credit",
        },
        "account",
      ).eventType,
    ).toBe("investment");
  });
});

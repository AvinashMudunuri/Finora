import { describe, expect, it } from "vitest";
import { calculateMonthlyIncome, calculateMonthlySpending } from "../../domain/calculations.ts";
import { fixtureAccounts, fixtureTransactions } from "../../data/fixtures.ts";
import { persistImport } from "./service.ts";
import { emptyUserLedger } from "./store.ts";
import type { ExtractedStatement } from "./types.ts";

const BANK: ExtractedStatement = {
  kind: "csv",
  institution: "HDFC Bank",
  partyName: "HDFC Savings",
  partyKind: "account",
  accountType: "bank",
  maskedNumber: "•••• 1234",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  currency: "USD",
  openingBalance: 10000,
  closingBalance: 13112.58,
  lines: [
    { date: "2026-08-03", description: "Payroll — Acme Corp", amount: 3200, direction: "credit" },
    { date: "2026-08-04", description: "Whole Foods Market", amount: 87.42, direction: "debit" },
    { date: "2026-08-05", description: "NEFT to ICICI Savings", amount: 31000, direction: "debit" },
  ],
  warnings: [],
};

const CARD: ExtractedStatement = {
  kind: "pdf",
  institution: "Northlake Bank",
  partyName: "Visa Rewards",
  partyKind: "card",
  maskedNumber: "•••• 4242",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  currency: "USD",
  outstandingBalance: 1842.19,
  minimumPayment: 35,
  paymentDueDate: "2026-09-22",
  paymentStatus: "due",
  lines: [
    { date: "2026-08-10", description: "Coffee — Blue Bottle", amount: 6.5, direction: "debit" },
    { date: "2026-08-12", description: "Payment — Thank you", amount: 250, direction: "credit" },
  ],
  warnings: [],
};

describe("persistImport", () => {
  it("persists a bank statement without mixing fixtures and without counting transfers as spending", () => {
    const first = persistImport({
      ledger: emptyUserLedger(),
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.ledger.accounts[0]?.name).toBe("HDFC Savings");
    expect(first.ledger.accounts[0]?.balance).toBe(13112.58);
    expect(first.ledger.transactions).toHaveLength(3);
    expect(calculateMonthlyIncome(first.ledger.transactions, 2026, 8).total).toBe(3200);
    expect(calculateMonthlySpending(first.ledger.transactions, 2026, 8).total).toBe(87.42);
    expect(fixtureTransactions).toHaveLength(15);
    expect(fixtureAccounts[0]?.name).toBe("Everyday Checking");

    const again = persistImport({
      ledger: first.ledger,
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      selectedAccountId: first.ledger.accounts[0]?.id,
    });
    expect(again.ok).toBe(false);
  });

  it("preserves card minimum payment and due date when supplied", () => {
    const result = persistImport({
      ledger: emptyUserLedger(),
      fileName: "visa.pdf",
      fileSize: 80,
      statement: CARD,
      partyKind: "card",
      creditLimit: 5000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ledger.cards[0]).toMatchObject({
      minimumPayment: 35,
      paymentDueDate: "2026-09-22",
      outstandingBalance: 1842.19,
      paymentStatus: "due",
    });
    expect(result.ledger.transactions.some((item) => item.eventType === "card_purchase")).toBe(
      true,
    );
  });

  it("does not invent a card credit limit", () => {
    const result = persistImport({
      ledger: emptyUserLedger(),
      fileName: "visa.pdf",
      fileSize: 80,
      statement: CARD,
      partyKind: "card",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toMatch(/credit limit/i);
  });
});

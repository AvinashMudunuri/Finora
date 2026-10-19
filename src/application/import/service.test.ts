import { describe, expect, it } from "vitest";
import { calculateMonthlyIncome, calculateMonthlySpending } from "../../domain/calculations.ts";
import { fixtureAccounts, fixtureTransactions } from "../../data/fixtures.ts";
import { persistImport, previewImport, resolvePersistedEventType } from "./service.ts";
import { classifyLine } from "./classify.ts";
import { emptyUserLedger } from "./store.ts";
import type { ExtractedStatement } from "./types.ts";

const COUNTERPARTY = {
  id: "acc-icici",
  name: "ICICI Savings",
  type: "bank" as const,
  balance: 0,
  currency: "USD",
};

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
  it("refuses transfers that would persist as unknown", () => {
    const result = persistImport({
      ledger: emptyUserLedger(),
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toMatch(/funding or counterparty/i);
  });

  it("persists a bank statement without mixing fixtures and without counting transfers as spending", () => {
    const first = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.ledger.accounts.some((account) => account.name === "HDFC Savings")).toBe(true);
    expect(first.ledger.accounts.find((account) => account.name === "HDFC Savings")?.balance).toBe(
      13112.58,
    );
    expect(first.ledger.transactions).toHaveLength(3);
    expect(first.ledger.transactions.find((item) => item.description.startsWith("NEFT"))?.eventType).toBe(
      "transfer",
    );
    expect(calculateMonthlyIncome(first.ledger.transactions, 2026, 8).total).toBe(3200);
    expect(calculateMonthlySpending(first.ledger.transactions, 2026, 8).total).toBe(87.42);
    expect(fixtureTransactions).toHaveLength(15);
    expect(fixtureAccounts[0]?.name).toBe("Everyday Checking");

    const hdfcId = first.ledger.accounts.find((account) => account.name === "HDFC Savings")?.id;
    const again = persistImport({
      ledger: first.ledger,
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      selectedAccountId: hdfcId,
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(again.ok).toBe(false);
  });

  it("preserves card minimum payment and due date when supplied", () => {
    const result = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "visa.pdf",
      fileSize: 80,
      statement: CARD,
      partyKind: "card",
      creditLimit: 5000,
      fundingAccountId: COUNTERPARTY.id,
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
    expect(
      result.ledger.transactions.find((item) => item.description.startsWith("Payment"))?.eventType,
    ).toBe("card_payment");
  });

  it("shows the same persist type in preview that persistImport stores", () => {
    const line = classifyLine(BANK.lines[2]!, "account");
    expect(line.eventType).toBe("transfer");
    expect(
      resolvePersistedEventType(line, { partyKind: "account", partyId: "acc-imp-1" }),
    ).toBe("unknown");
    expect(
      previewImport(BANK, "account", [], "acc-imp-1").classified.find((item) =>
        item.description.startsWith("NEFT"),
      )?.eventType,
    ).toBe("unknown");
    expect(
      previewImport(BANK, "account", [], "acc-imp-1", COUNTERPARTY.id).classified.find((item) =>
        item.description.startsWith("NEFT"),
      )?.eventType,
    ).toBe("transfer");
  });

  it("attaches to an explicitly selected matching account", () => {
    const existing = {
      id: "acc-hdfc",
      name: "HDFC Savings",
      type: "bank" as const,
      balance: 50,
      currency: "USD",
    };
    const result = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [existing, COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      selectedAccountId: existing.id,
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ledger.accounts).toHaveLength(2);
    expect(result.ledger.accounts.find((account) => account.id === "acc-hdfc")?.balance).toBe(
      13112.58,
    );
    expect(
      result.ledger.transactions.find((item) => item.description.startsWith("Payroll"))?.accountId,
    ).toBe("acc-hdfc");
  });

  it("creates a new account when Create is selected even if a name matches", () => {
    const existing = {
      id: "acc-hdfc",
      name: "HDFC Savings",
      type: "bank" as const,
      balance: 50,
      currency: "USD",
    };
    const result = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [existing, COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ledger.accounts).toHaveLength(3);
    expect(result.ledger.accounts.find((account) => account.id === "acc-hdfc")?.balance).toBe(50);
    expect(
      result.ledger.transactions.some(
        (item) => item.accountId === "acc-hdfc" && item.eventType !== "transfer",
      ),
    ).toBe(false);
    expect(
      result.ledger.transactions.find((item) => item.description.startsWith("Payroll"))?.accountId,
    ).toMatch(/^acc-imp-/);
  });

  it("refuses a renamed copy of the same statement without creating another account", () => {
    const first = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const renamed = persistImport({
      ledger: first.ledger,
      fileName: "hdfc-copy.csv",
      fileSize: 999,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(renamed.ok).toBe(false);
    if (renamed.ok) {
      return;
    }
    expect(renamed.error).toMatch(/already imported/i);
    expect(first.ledger.accounts.filter((account) => account.name === "HDFC Savings")).toHaveLength(
      1,
    );
    expect(first.ledger.transactions).toHaveLength(3);
  });

  it("creates two bank accounts from two different statements", () => {
    const other: ExtractedStatement = {
      ...BANK,
      institution: "ICICI Bank",
      partyName: "ICICI Checking",
      maskedNumber: "•••• 9999",
      closingBalance: 500,
      lines: [
        {
          date: "2026-08-08",
          description: "Payroll — Beta Corp",
          amount: 2100,
          direction: "credit",
        },
        {
          date: "2026-08-09",
          description: "Corner Cafe",
          amount: 12.5,
          direction: "debit",
        },
      ],
    };
    const first = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = persistImport({
      ledger: first.ledger,
      fileName: "icici.csv",
      fileSize: 80,
      statement: other,
      partyKind: "account",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.ledger.accounts.some((account) => account.name === "HDFC Savings")).toBe(true);
    expect(second.ledger.accounts.some((account) => account.name === "ICICI Checking")).toBe(true);
    expect(second.ledger.transactions).toHaveLength(5);
    expect(
      second.ledger.transactions.find((item) => item.description === "Corner Cafe")?.accountId,
    ).not.toBe(second.ledger.accounts.find((account) => account.name === "HDFC Savings")?.id);
  });

  it("creates a second card with the same issuer when Create is selected", () => {
    const first = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "visa.pdf",
      fileSize: 80,
      statement: CARD,
      partyKind: "card",
      creditLimit: 5000,
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const other: ExtractedStatement = {
      ...CARD,
      partyName: "Visa Signature",
      maskedNumber: "•••• 1111",
      outstandingBalance: 220,
      lines: [
        {
          date: "2026-08-18",
          description: "Bookstore",
          amount: 22,
          direction: "debit",
        },
      ],
    };
    const second = persistImport({
      ledger: first.ledger,
      fileName: "visa-2.pdf",
      fileSize: 80,
      statement: other,
      partyKind: "card",
      creditLimit: 4000,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.ledger.cards).toHaveLength(2);
    expect(second.ledger.cards.map((card) => card.name).sort()).toEqual([
      "Visa Rewards",
      "Visa Signature",
    ]);
    expect(second.ledger.cards[0]?.outstandingBalance).toBe(1842.19);
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

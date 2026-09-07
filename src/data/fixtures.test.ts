import { describe, expect, it } from "vitest";
import { calculateNetWorth } from "../domain/calculations.ts";
import { cashTotal, creditOwed } from "../domain/finance.ts";
import { ACCOUNT_TYPES, TRANSACTION_EVENT_TYPES } from "../domain/types.ts";
import { assertValidFinanceData } from "../domain/validate.ts";
import {
  cardsWithCurrentPaymentStatus,
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
  loadAppCards,
} from "./fixtures.ts";

describe("fixture accounts", () => {
  it("loads bank, cash, and investment accounts", () => {
    const types = fixtureAccounts.map((account) => account.type);

    expect(types).toContain("bank");
    expect(types).toContain("cash");
    expect(types).toContain("investment");
    expect(fixtureAccounts.map((account) => account.name)).toEqual(
      expect.arrayContaining([
        "Everyday Checking",
        "Emergency Savings",
        "Cash",
        "Investment Account",
      ]),
    );
  });

  it("gives every account a stable id, type, currency, and balance", () => {
    expect(fixtureAccounts.length).toBeGreaterThanOrEqual(4);

    for (const account of fixtureAccounts) {
      expect(account.id).toMatch(/\S/);
      expect(account.name).toMatch(/\S/);
      expect(ACCOUNT_TYPES).toContain(account.type);
      expect(Number.isFinite(account.balance)).toBe(true);
      expect(account.currency).toBe("USD");
    }
  });

  it("uses unique account ids", () => {
    const ids = fixtureAccounts.map((account) => account.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fixture cards", () => {
  it("represents cards independently from accounts", () => {
    const accountIds = new Set(fixtureAccounts.map((account) => account.id));
    const accountNames = fixtureAccounts.map((account) => account.name);

    expect(fixtureCards.length).toBeGreaterThanOrEqual(2);
    expect(accountNames).not.toContain("Visa Rewards");
    expect(fixtureCards.map((card) => card.name)).toContain("Visa Rewards");

    for (const card of fixtureCards) {
      expect(accountIds.has(card.id)).toBe(false);
    }
  });

  it("gives every card identity, limit, outstanding balance, and currency", () => {
    for (const card of fixtureCards) {
      expect(card.id).toMatch(/\S/);
      expect(card.name).toMatch(/\S/);
      expect(card.issuer).toMatch(/\S/);
      expect(card.creditLimit).toBeGreaterThan(0);
      expect(card.outstandingBalance).toBeGreaterThanOrEqual(0);
      expect(card.currency).toBe("USD");
    }
  });

  it("keeps available credit coherent with limit and outstanding balance", () => {
    for (const card of fixtureCards) {
      expect(card.availableCredit).toBeCloseTo(
        card.creditLimit - card.outstandingBalance,
        2,
      );
    }
  });

  it("uses unique card ids", () => {
    const ids = fixtureCards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fixture transactions", () => {
  it("includes representative financial event types", () => {
    const eventTypes = new Set(
      fixtureTransactions.map((transaction) => transaction.eventType),
    );

    expect(fixtureTransactions.length).toBeGreaterThanOrEqual(8);
    expect(eventTypes).toContain("income");
    expect(eventTypes).toContain("expense");
    expect(eventTypes).toContain("transfer");
    expect(eventTypes).toContain("card_purchase");
    expect(eventTypes).toContain("card_payment");
    expect(eventTypes).toContain("investment");
  });

  it("references only existing accounts and cards", () => {
    const accountIds = new Set(fixtureAccounts.map((account) => account.id));
    const cardIds = new Set(fixtureCards.map((card) => card.id));

    for (const transaction of fixtureTransactions) {
      if (transaction.accountId) {
        expect(accountIds.has(transaction.accountId)).toBe(true);
      }
      if (transaction.counterpartyAccountId) {
        expect(accountIds.has(transaction.counterpartyAccountId)).toBe(true);
      }
      if (transaction.cardId) {
        expect(cardIds.has(transaction.cardId)).toBe(true);
      }
    }
  });

  it("gives every transaction a complete, deterministic record", () => {
    for (const transaction of fixtureTransactions) {
      expect(transaction.id).toMatch(/\S/);
      expect(transaction.description).toMatch(/\S/);
      expect(transaction.amount).toBeGreaterThan(0);
      expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(transaction.currency).toBe("USD");
      expect(TRANSACTION_EVENT_TYPES).toContain(transaction.eventType);
    }
  });

  it("uses unique transaction ids", () => {
    const ids = fixtureTransactions.map((transaction) => transaction.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fixture integrity", () => {
  it("loads and validates the fixture snapshot", () => {
    expect(() => {
      assertValidFinanceData(
        fixtureAccounts,
        fixtureCards,
        fixtureTransactions,
      );
    }).not.toThrow();
  });

  it("keeps liquid cash separate from net worth", () => {
    const investment = fixtureAccounts.find(
      (account) => account.type === "investment",
    );
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);

    expect(investment).toBeDefined();
    expect(cashTotal(fixtureAccounts)).toBeCloseTo(16916.47, 2);
    expect(creditOwed(fixtureCards)).toBeCloseTo(2168.59, 2);
    expect(worth.assets).toBeCloseTo(25337.02, 2);
    expect(worth.netWorth).toBeCloseTo(23168.43, 2);
    expect(cashTotal(fixtureAccounts)).not.toBeCloseTo(worth.assets, 2);
  });
});

describe("fixture determinism", () => {
  it("returns the same records on every import", async () => {
    const firstAccounts = structuredClone(fixtureAccounts);
    const firstCards = structuredClone(fixtureCards);
    const firstTransactions = structuredClone(fixtureTransactions);
    const reloaded = await import("./fixtures.ts");

    expect(reloaded.fixtureAccounts).toEqual(firstAccounts);
    expect(reloaded.fixtureCards).toEqual(firstCards);
    expect(reloaded.fixtureTransactions).toEqual(firstTransactions);
    expect(reloaded.fixtureAccounts).toBe(fixtureAccounts);
    expect(reloaded.fixtureCards).toBe(fixtureCards);
    expect(reloaded.fixtureTransactions).toBe(fixtureTransactions);
  });
});

describe("e2e-all-current dataset mapping", () => {
  it("maps every card to current without mutating the default fixtures", () => {
    const mapped = cardsWithCurrentPaymentStatus(fixtureCards);

    expect(mapped.map((card) => card.paymentStatus)).toEqual(["current", "current"]);
    expect(mapped[0]?.name).toBe(fixtureCards[0]?.name);
    expect(mapped[0]?.minimumPayment).toBe(fixtureCards[0]?.minimumPayment);
    expect(fixtureCards[0]?.paymentStatus).toBe("due");
    expect(fixtureCards[1]?.paymentStatus).toBe("current");
  });

  it("keeps the default fixture cards outside the e2e-all-current Vite mode", () => {
    expect(import.meta.env.MODE).not.toBe("e2e-all-current");
    expect(loadAppCards()).toEqual(fixtureCards);
    expect(loadAppCards()[0]?.paymentStatus).toBe("due");
  });
});

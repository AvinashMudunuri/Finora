import { describe, expect, it } from "vitest";
import { fixtureAccounts, fixtureTransactions } from "./fixtures.ts";

describe("fixture accounts", () => {
  it("includes checking, savings, and credit card accounts", () => {
    const types = fixtureAccounts.map((account) => account.type);

    expect(types).toContain("checking");
    expect(types).toContain("savings");
    expect(types).toContain("credit");
  });

  it("gives every account a stable id, name, type, balance, and currency", () => {
    expect(fixtureAccounts.length).toBeGreaterThanOrEqual(3);

    for (const account of fixtureAccounts) {
      expect(account.id).toMatch(/\S/);
      expect(account.name).toMatch(/\S/);
      expect(["checking", "savings", "credit"]).toContain(account.type);
      expect(Number.isFinite(account.balance)).toBe(true);
      expect(account.currency).toBe("USD");
    }
  });

  it("uses unique account ids", () => {
    const ids = fixtureAccounts.map((account) => account.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fixture transactions", () => {
  it("includes several transactions across the fixture accounts", () => {
    expect(fixtureTransactions.length).toBeGreaterThanOrEqual(8);

    const accountIds = new Set(fixtureTransactions.map((tx) => tx.accountId));
    expect(accountIds.size).toBeGreaterThanOrEqual(3);
  });

  it("references only existing accounts", () => {
    const accountIds = new Set(fixtureAccounts.map((account) => account.id));

    for (const transaction of fixtureTransactions) {
      expect(accountIds.has(transaction.accountId)).toBe(true);
    }
  });

  it("gives every transaction a complete, valid record", () => {
    for (const transaction of fixtureTransactions) {
      expect(transaction.id).toMatch(/\S/);
      expect(transaction.description).toMatch(/\S/);
      expect(transaction.amount).toBeGreaterThan(0);
      expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["inflow", "outflow"]).toContain(transaction.type);
    }
  });

  it("uses unique transaction ids", () => {
    const ids = fixtureTransactions.map((transaction) => transaction.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fixture determinism", () => {
  it("returns the same account and transaction records on every import", async () => {
    const firstAccounts = structuredClone(fixtureAccounts);
    const firstTransactions = structuredClone(fixtureTransactions);

    const reloaded = await import("./fixtures.ts");

    expect(reloaded.fixtureAccounts).toEqual(firstAccounts);
    expect(reloaded.fixtureTransactions).toEqual(firstTransactions);
    expect(reloaded.fixtureAccounts).toBe(fixtureAccounts);
    expect(reloaded.fixtureTransactions).toBe(fixtureTransactions);
  });
});

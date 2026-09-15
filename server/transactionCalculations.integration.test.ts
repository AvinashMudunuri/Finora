/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listStoredTransactions } from "../src/application/transactions/service.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import {
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorthChange,
  calculateSpendingChange,
  listNetWorthChangeEvidence,
  listSpendingChangeDrivers,
} from "../src/domain/calculations.ts";
import { JsonFileTransactionStore } from "./jsonFileTransactionStore.ts";

describe("backend transaction financial regression", () => {
  it("produces the same fixture financial outputs after store seeding", () => {
    const store = new JsonFileTransactionStore(
      join(mkdtempSync(join(tmpdir(), "finora-txn-calc-")), "transactions.json"),
    );
    const transactions = listStoredTransactions(store);

    expect(transactions).toHaveLength(fixtureTransactions.length);
    expect(calculateMonthlySpending(transactions, 2026, 8).total).toBeCloseTo(
      calculateMonthlySpending(fixtureTransactions, 2026, 8).total,
      2,
    );
    expect(calculateMonthlySpending(transactions, 2026, 9).total).toBeCloseTo(
      87.42,
      2,
    );
    expect(calculateMonthlyIncome(transactions, 2026, 9).total).toBeCloseTo(3200, 2);
    expect(calculateMonthlySavings(transactions, 2026, 9).savings).toBeCloseTo(
      calculateMonthlySavings(fixtureTransactions, 2026, 9).savings,
      2,
    );

    const spending = calculateSpendingChange(transactions);
    const fixtureSpending = calculateSpendingChange(fixtureTransactions);
    expect(spending?.currentSpending).toBe(fixtureSpending?.currentSpending);
    expect(spending?.previousSpending).toBe(fixtureSpending?.previousSpending);
    expect(
      listSpendingChangeDrivers(transactions, spending!).map((item) => item.transactionId),
    ).toEqual(
      listSpendingChangeDrivers(fixtureTransactions, fixtureSpending!).map(
        (item) => item.transactionId,
      ),
    );

    const change = calculateNetWorthChange(fixtureAccounts, fixtureCards, transactions);
    const fixtureChange = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    expect(change?.currentNetWorth).toBe(fixtureChange?.currentNetWorth);
    expect(change?.previousNetWorth).toBe(fixtureChange?.previousNetWorth);
    expect(
      listNetWorthChangeEvidence(transactions, change!).map((item) => item.transactionId),
    ).toEqual(
      listNetWorthChangeEvidence(fixtureTransactions, fixtureChange!).map(
        (item) => item.transactionId,
      ),
    );
  });
});

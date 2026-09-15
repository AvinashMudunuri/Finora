/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
  calculateNetWorthChange,
  calculateSpendingChange,
} from "../src/domain/calculations.ts";
import { fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import { createHttpAccountGateway } from "../src/infrastructure/accounts/httpAccountGateway.ts";
import { startAccountServer } from "./accountRuntime.ts";

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server) {
      await server.close();
    }
  }
});

describe("account backend calculation integrity", () => {
  it("feeds backend-persisted accounts into the existing calculation functions", async () => {
    const storePath = join(mkdtempSync(join(tmpdir(), "finora-acct-")), "accounts.json");
    const started = await startAccountServer({ storePath });
    servers.push(started);
    const gateway = createHttpAccountGateway(`http://127.0.0.1:${started.port}`);

    const before = await gateway.list();
    const baseline = calculateNetWorth(before, fixtureCards);
    expect(baseline.netWorth).toBeCloseTo(23168.43, 2);
    expect(baseline.assets).toBeCloseTo(25337.02, 2);
    expect(baseline.liabilities).toBeCloseTo(2168.59, 2);

    const created = await gateway.create({
      name: "Travel Fund",
      type: "bank",
      balance: 500,
    });
    expect(created.ok).toBe(true);

    const after = await gateway.list();
    const worth = calculateNetWorth(after, fixtureCards);
    expect(worth.netWorth).toBeCloseTo(23668.43, 2);
    expect(worth.assets).toBeCloseTo(25837.02, 2);
    expect(worth.liabilities).toBeCloseTo(baseline.liabilities, 2);

    const income = calculateMonthlyIncome(fixtureTransactions, 2026, 9);
    const spending = calculateMonthlySpending(fixtureTransactions, 2026, 9);
    const savings = calculateMonthlySavings(fixtureTransactions, 2026, 9);
    const spendingChange = calculateSpendingChange(fixtureTransactions);
    const netWorthChange = calculateNetWorthChange(
      after,
      fixtureCards,
      fixtureTransactions,
    );

    expect(income.total).toBeGreaterThan(0);
    expect(spending.total).toBeGreaterThan(0);
    expect(savings.savings).toBe(income.total - spending.total);
    expect(spendingChange?.direction).toBe("decreased");
    expect(netWorthChange?.currentNetWorth).toBeCloseTo(worth.netWorth, 2);
    expect(after.some((account) => account.id === "acc-checking")).toBe(true);
    expect(
      fixtureTransactions.some(
        (transaction) => transaction.accountId === "acc-checking",
      ),
    ).toBe(true);
  });
});

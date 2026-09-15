/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  calculateCardPaymentAttention,
  calculateCardUtilization,
  calculateHighCardUtilization,
  calculateNetWorth,
} from "../src/domain/calculations.ts";
import { fixtureAccounts, fixtureTransactions } from "../src/data/fixtures.ts";
import { createHttpCardGateway } from "../src/infrastructure/cards/httpCardGateway.ts";
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

describe("card backend calculation integrity", () => {
  it("feeds backend-persisted cards into the existing calculation functions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-card-calc-"));
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath: join(dir, "cards.json"),
    });
    servers.push(started);
    const gateway = createHttpCardGateway(`http://127.0.0.1:${started.port}`);

    const before = await gateway.list();
    const baseline = calculateNetWorth(fixtureAccounts, before);
    expect(baseline.netWorth).toBeCloseTo(23168.43, 2);
    expect(baseline.liabilities).toBeCloseTo(2168.59, 2);
    expect(calculateCardPaymentAttention(before)?.paymentStatus).toBe("due");
    expect(calculateHighCardUtilization(before)).toBeNull();

    const updated = await gateway.update("card-visa", {
      name: "Visa Rewards",
      issuer: "Northlake Bank",
      creditLimit: 2500,
      outstandingBalance: 2000,
      statementPeriodEnd: "2026-09-08",
      paymentDueDate: "2026-09-22",
      minimumPayment: 35,
      paymentStatus: "overdue",
    });
    expect(updated.ok).toBe(true);

    const after = await gateway.list();
    const worth = calculateNetWorth(fixtureAccounts, after);
    expect(worth.liabilities).toBeCloseTo(2326.4, 2);
    expect(worth.netWorth).toBeCloseTo(23010.62, 2);
    expect(worth.assets).toBeCloseTo(baseline.assets, 2);

    const [visa] = calculateCardUtilization(after);
    expect(visa?.utilization).toBeCloseTo(0.8, 5);
    expect(calculateHighCardUtilization(after)?.cardId).toBe("card-visa");
    expect(calculateCardPaymentAttention(after)?.paymentStatus).toBe("overdue");
    expect(
      fixtureTransactions.some((transaction) => transaction.cardId === "card-visa"),
    ).toBe(true);
  });
});

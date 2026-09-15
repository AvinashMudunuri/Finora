/** @vitest-environment node */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TRANSACTION_UNAVAILABLE_MESSAGE } from "../src/application/transactions/contract.ts";
import { fixtureTransactions } from "../src/data/fixtures.ts";
import { listTransactions } from "../src/domain/finance.ts";
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

async function start(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "finora-txn-http-"));
  const started = await startAccountServer({
    storePath: join(dir, "accounts.json"),
    cardStorePath: join(dir, "cards.json"),
    transactionStorePath: join(dir, "transactions.json"),
  });
  servers.push(started);
  return `http://127.0.0.1:${started.port}`;
}

describe("transaction HTTP contract", () => {
  it("reads seeded transactions in the existing newest-first order", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/transactions`);
    const body = (await response.json()) as {
      transactions: Array<{ id: string; description: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.transactions.map((transaction) => transaction.id)).toEqual(
      listTransactions(fixtureTransactions, { kind: "all" }).map(
        (transaction) => transaction.id,
      ),
    );
    expect(body.transactions.map((transaction) => transaction.description)).toContain(
      "Payroll — Acme Corp",
    );
    expect(JSON.stringify(body)).not.toMatch(/transactions\.json|stack|ENOENT/i);
  });

  it("does not invent mutation endpoints", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Invented" }),
    });
    const body = (await response.json()) as { kind: string };

    expect(response.status).toBe(404);
    expect(body.kind).toBe("not_found");
  });

  it("returns unavailable for malformed persisted data", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-txn-bad-"));
    const transactionStorePath = join(dir, "transactions.json");
    writeFileSync(transactionStorePath, "{not-json", "utf8");
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath: join(dir, "cards.json"),
      transactionStorePath,
    });
    servers.push(started);

    const response = await fetch(`http://127.0.0.1:${started.port}/api/transactions`);
    const body = (await response.json()) as { kind: string; error: string };

    expect(response.status).toBe(500);
    expect(body.kind).toBe("unavailable");
    expect(body.error).toBe(TRANSACTION_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(body)).not.toMatch(/transactions\.json|not-json|stack/i);
  });
});

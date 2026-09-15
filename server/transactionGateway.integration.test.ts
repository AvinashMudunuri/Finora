/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpTransactionGateway } from "../src/infrastructure/transactions/httpTransactionGateway.ts";
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

describe("http transaction gateway", () => {
  it("lists backend transactions through the application contract", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-txn-gw-"));
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath: join(dir, "cards.json"),
      transactionStorePath: join(dir, "transactions.json"),
    });
    servers.push(started);

    const gateway = createHttpTransactionGateway(`http://127.0.0.1:${started.port}`);
    const listed = await gateway.list();

    expect(listed.map((transaction) => transaction.id)).toEqual(
      listTransactions(fixtureTransactions, { kind: "all" }).map(
        (transaction) => transaction.id,
      ),
    );
    expect(listed.find((transaction) => transaction.id === "txn-008")?.cardId).toBe(
      "card-visa",
    );
  });
});

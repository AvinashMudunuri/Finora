/** @vitest-environment node */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listStoredTransactions } from "../src/application/transactions/service.ts";
import { fixtureTransactions } from "../src/data/fixtures.ts";
import {
  defaultTransactionStorePath,
  TransactionStoreError,
  JsonFileTransactionStore,
} from "./jsonFileTransactionStore.ts";

function tempStorePath(): string {
  return join(mkdtempSync(join(tmpdir(), "finora-txn-store-")), "transactions.json");
}

describe("json file transaction store", () => {
  it("seeds fixture transactions when the file is missing", () => {
    const path = tempStorePath();
    const store = new JsonFileTransactionStore(path);

    expect(store.list().map((transaction) => transaction.id)).toEqual(
      fixtureTransactions.map((transaction) => transaction.id),
    );
    expect(JSON.parse(readFileSync(path, "utf8")).version).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8")).transactions).toHaveLength(
      fixtureTransactions.length,
    );
  });

  it("persists across store instances", () => {
    const path = tempStorePath();
    const first = new JsonFileTransactionStore(path);
    first.list();
    const second = new JsonFileTransactionStore(path);
    expect(listStoredTransactions(second).map((transaction) => transaction.id)).toEqual(
      listStoredTransactions(first).map((transaction) => transaction.id),
    );
  });

  it("rejects duplicate identities on write", () => {
    const store = new JsonFileTransactionStore(tempStorePath());
    const transactions = store.list();
    expect(() => {
      store.write([...transactions, transactions[0]!]);
    }).toThrow(TransactionStoreError);
  });

  it("rejects invalid relationship data on write", () => {
    const store = new JsonFileTransactionStore(tempStorePath());
    const [first, ...rest] = store.list();
    expect(first).toBeDefined();
    expect(() => {
      store.write([
        {
          ...first!,
          eventType: "card_purchase",
          accountId: "acc-checking",
          cardId: "card-visa",
        },
        ...rest,
      ]);
    }).toThrow();
  });

  it("rejects a corrupt file without exposing the path", () => {
    const path = tempStorePath();
    writeFileSync(path, "{not-json", "utf8");
    const store = new JsonFileTransactionStore(path);
    expect(() => store.list()).toThrow(TransactionStoreError);
    try {
      store.list();
    } catch (error) {
      expect(String(error)).not.toContain(path);
    }
  });

  it("uses FINORA_TRANSACTION_STORE when set", () => {
    expect(
      defaultTransactionStorePath("/tmp/finora", {
        FINORA_TRANSACTION_STORE: "D:/stores/transactions.json",
      }),
    ).toBe("D:/stores/transactions.json");
    expect(defaultTransactionStorePath("/tmp/finora", {})).toBe(
      "/tmp/finora/data/transactions.json",
    );
  });
});

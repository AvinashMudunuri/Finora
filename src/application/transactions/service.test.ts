import { describe, expect, it } from "vitest";
import { fixtureTransactions } from "../../data/fixtures.ts";
import { listTransactions } from "../../domain/finance.ts";
import type { Transaction } from "../../domain/types.ts";
import type { TransactionStore } from "./port.ts";
import { listStoredTransactions } from "./service.ts";

function memoryStore(initial: readonly Transaction[] = fixtureTransactions): TransactionStore {
  let transactions = initial.map((transaction) => ({ ...transaction }));
  return {
    list: () => transactions.map((transaction) => ({ ...transaction })),
    write: (next) => {
      transactions = next.map((transaction) => ({ ...transaction }));
    },
  };
}

describe("transaction application service", () => {
  it("lists stored transactions in the existing newest-first order", () => {
    const listed = listStoredTransactions(memoryStore());
    expect(listed.map((transaction) => transaction.id)).toEqual(
      listTransactions(fixtureTransactions, { kind: "all" }).map(
        (transaction) => transaction.id,
      ),
    );
    expect(listed).toHaveLength(fixtureTransactions.length);
  });

  it("does not expose the store's live array", () => {
    const store = memoryStore();
    const listed = listStoredTransactions(store);
    listed[0]!.description = "mutated";
    expect(store.list()[0]?.description).not.toBe("mutated");
  });
});

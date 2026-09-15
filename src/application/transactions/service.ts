import { listTransactions } from "../../domain/finance.ts";
import type { Transaction } from "../../domain/types.ts";
import type { TransactionStore } from "./port.ts";

export type TransactionServiceDependencies = {
  store: TransactionStore;
};

export function listStoredTransactions(store: TransactionStore): Transaction[] {
  return listTransactions(store.list().map(cloneTransaction), { kind: "all" });
}

function cloneTransaction(transaction: Transaction): Transaction {
  return { ...transaction };
}

import type { Transaction } from "../../domain/types.ts";

export type TransactionStore = {
  list(): Transaction[];
  write(transactions: readonly Transaction[]): void;
};

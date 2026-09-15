import type { Transaction } from "../../domain/types.ts";

export type TransactionListResponse = {
  transactions: Transaction[];
};

export type TransactionUnavailableFailure = {
  kind: "unavailable";
  error: string;
};

export type TransactionNotFoundFailure = {
  kind: "not_found";
  error: string;
};

export const TRANSACTION_UNAVAILABLE_MESSAGE =
  "Transactions are temporarily unavailable.";

export const TRANSACTION_NOT_FOUND_MESSAGE = "That transaction no longer exists.";

export function usesTransactionBackend(
  mode: string = String(import.meta.env.MODE),
): boolean {
  return !mode.startsWith("e2e-") && mode !== "test";
}

export type TransactionGateway = {
  list(): Promise<Transaction[]>;
};

import type { Transaction } from "../../domain/types.ts";

export const TRANSACTION_BOOTSTRAP_ELEMENT_ID = "finora-transaction-bootstrap";

export function serializeTransactionBootstrap(
  transactions: readonly Transaction[],
): string {
  return JSON.stringify({ transactions }).replace(/</g, "\\u003c");
}

export function parseTransactionBootstrap(raw: string): Transaction[] | null {
  try {
    const parsed = JSON.parse(raw) as { transactions?: unknown };
    if (!Array.isArray(parsed.transactions)) {
      return null;
    }
    return parsed.transactions as Transaction[];
  } catch {
    return null;
  }
}

import type { TransactionGateway } from "../../application/transactions/contract.ts";
import {
  TRANSACTION_UNAVAILABLE_MESSAGE,
  type TransactionListResponse,
} from "../../application/transactions/contract.ts";
import type { Transaction } from "../../domain/types.ts";
import { TRANSACTION_EVENT_TYPES } from "../../domain/types.ts";

export function createHttpTransactionGateway(baseUrl = ""): TransactionGateway {
  const prefix = baseUrl.replace(/\/$/, "");

  return {
    async list(): Promise<Transaction[]> {
      const response = await request(prefix, "/api/transactions");
      const body = (await readJson(response)) as TransactionListResponse | null;
      if (response.ok && body && Array.isArray(body.transactions)) {
        return body.transactions.filter(isTransaction);
      }
      throw new Error(TRANSACTION_UNAVAILABLE_MESSAGE);
    },
  };
}

async function request(prefix: string, path: string): Promise<Response> {
  return fetch(`${prefix}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isTransaction(value: unknown): value is Transaction {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const transaction = value as Transaction;
  return (
    typeof transaction.id === "string" &&
    typeof transaction.date === "string" &&
    typeof transaction.description === "string" &&
    typeof transaction.amount === "number" &&
    transaction.currency === "USD" &&
    TRANSACTION_EVENT_TYPES.includes(transaction.eventType) &&
    (transaction.accountId === null || typeof transaction.accountId === "string") &&
    (transaction.counterpartyAccountId === null ||
      typeof transaction.counterpartyAccountId === "string") &&
    (transaction.cardId === null || typeof transaction.cardId === "string")
  );
}

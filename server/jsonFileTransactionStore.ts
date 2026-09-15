import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { TransactionStore } from "../src/application/transactions/port.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import type { Transaction } from "../src/domain/types.ts";
import { TRANSACTION_EVENT_TYPES } from "../src/domain/types.ts";
import { assertValidFinanceData } from "../src/domain/validate.ts";

export const TRANSACTION_STORE_VERSION = 1;

export class TransactionStoreError extends Error {
  readonly code = "transaction_store";

  constructor(message = "Transaction store is unavailable.") {
    super(message);
    this.name = "TransactionStoreError";
  }
}

export class JsonFileTransactionStore implements TransactionStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  list(): Transaction[] {
    this.ensureSeeded();
    return this.readTransactions().map((transaction) => ({ ...transaction }));
  }

  write(transactions: readonly Transaction[]): void {
    assertUniqueTransactionIdentities(transactions);
    assertValidFinanceData(
      [...fixtureAccounts],
      [...fixtureCards],
      [...transactions],
    );
    this.persist(transactions);
  }

  private ensureSeeded(): void {
    try {
      this.readTransactions();
    } catch (error) {
      if (error instanceof TransactionStoreError && error.message === "missing") {
        this.persist(fixtureTransactions);
        return;
      }
      throw error;
    }
  }

  private readTransactions(): Transaction[] {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch {
      throw new TransactionStoreError("missing");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new TransactionStoreError();
    }

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as { version?: unknown }).version !== TRANSACTION_STORE_VERSION ||
      !Array.isArray((parsed as { transactions?: unknown }).transactions)
    ) {
      throw new TransactionStoreError();
    }

    const transactions = (parsed as { transactions: unknown[] }).transactions.map(
      readStoredTransaction,
    );
    assertUniqueTransactionIdentities(transactions);
    assertValidFinanceData([...fixtureAccounts], [...fixtureCards], transactions);
    return transactions;
  }

  private persist(transactions: readonly Transaction[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(
      this.filePath,
      `${JSON.stringify(
        {
          version: TRANSACTION_STORE_VERSION,
          transactions,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
}

function readStoredTransaction(value: unknown): Transaction {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TransactionStoreError();
  }

  const record = value as Record<string, unknown>;
  const eventType = String(record.eventType ?? "");
  if (
    typeof record.id !== "string" ||
    record.id.trim().length === 0 ||
    typeof record.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
    typeof record.description !== "string" ||
    record.description.trim().length === 0 ||
    typeof record.amount !== "number" ||
    !Number.isFinite(record.amount) ||
    record.currency !== "USD" ||
    !TRANSACTION_EVENT_TYPES.includes(eventType as Transaction["eventType"]) ||
    !isNullableId(record.accountId) ||
    !isNullableId(record.counterpartyAccountId) ||
    !isNullableId(record.cardId)
  ) {
    throw new TransactionStoreError();
  }

  return {
    id: record.id,
    date: record.date,
    description: record.description,
    amount: record.amount,
    currency: "USD",
    eventType: eventType as Transaction["eventType"],
    accountId: record.accountId as string | null,
    counterpartyAccountId: record.counterpartyAccountId as string | null,
    cardId: record.cardId as string | null,
  };
}

function isNullableId(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length > 0);
}

function assertUniqueTransactionIdentities(transactions: readonly Transaction[]): void {
  const seen = new Set<string>();
  for (const transaction of transactions) {
    if (seen.has(transaction.id)) {
      throw new TransactionStoreError();
    }
    seen.add(transaction.id);
  }
}

export function defaultTransactionStorePath(
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.FINORA_TRANSACTION_STORE?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  return `${cwd.replace(/[\\/]$/, "")}/data/transactions.json`;
}

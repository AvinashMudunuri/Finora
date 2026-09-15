import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { AccountStore } from "../src/application/accounts/port.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import type { Account } from "../src/domain/types.ts";
import { ACCOUNT_TYPES } from "../src/domain/types.ts";
import { assertValidFinanceData } from "../src/domain/validate.ts";

export const ACCOUNT_STORE_VERSION = 1;

export class AccountStoreError extends Error {
  readonly code = "account_store";

  constructor(message = "Account store is unavailable.") {
    super(message);
    this.name = "AccountStoreError";
  }
}

export class JsonFileAccountStore implements AccountStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  list(): Account[] {
    this.ensureSeeded();
    return this.readAccounts().map((account) => ({ ...account }));
  }

  write(accounts: readonly Account[]): void {
    assertUniqueAccountIdentities(accounts);
    assertValidFinanceData(
      [...accounts],
      [...fixtureCards],
      [...fixtureTransactions],
    );
    this.persist(accounts);
  }

  private ensureSeeded(): void {
    try {
      this.readAccounts();
    } catch (error) {
      if (error instanceof AccountStoreError && error.message === "missing") {
        this.persist(fixtureAccounts);
        return;
      }
      throw error;
    }
  }

  private readAccounts(): Account[] {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch {
      throw new AccountStoreError("missing");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AccountStoreError();
    }

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as { version?: unknown }).version !== ACCOUNT_STORE_VERSION ||
      !Array.isArray((parsed as { accounts?: unknown }).accounts)
    ) {
      throw new AccountStoreError();
    }

    const accounts = (parsed as { accounts: unknown[] }).accounts.map(readStoredAccount);
    assertUniqueAccountIdentities(accounts);
    assertValidFinanceData(accounts, [...fixtureCards], [...fixtureTransactions]);
    return accounts;
  }

  private persist(accounts: readonly Account[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(
      this.filePath,
      `${JSON.stringify(
        {
          version: ACCOUNT_STORE_VERSION,
          accounts,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
}

function readStoredAccount(value: unknown): Account {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AccountStoreError();
  }

  const record = value as Record<string, unknown>;
  const type = String(record.type ?? "");
  if (
    typeof record.id !== "string" ||
    record.id.trim().length === 0 ||
    typeof record.name !== "string" ||
    record.name.trim().length === 0 ||
    !ACCOUNT_TYPES.includes(type as Account["type"]) ||
    typeof record.balance !== "number" ||
    !Number.isFinite(record.balance) ||
    record.currency !== "USD"
  ) {
    throw new AccountStoreError();
  }

  return {
    id: record.id,
    name: record.name,
    type: type as Account["type"],
    balance: record.balance,
    currency: "USD",
  };
}

function assertUniqueAccountIdentities(accounts: readonly Account[]): void {
  const seen = new Set<string>();
  for (const account of accounts) {
    if (seen.has(account.id)) {
      throw new AccountStoreError();
    }
    seen.add(account.id);
  }
}

export function defaultAccountStorePath(
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.FINORA_ACCOUNT_STORE?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  return `${cwd.replace(/[\\/]$/, "")}/data/accounts.json`;
}

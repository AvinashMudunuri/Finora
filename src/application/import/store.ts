import type { Account, Card, Transaction } from "../../domain/types.ts";
import { assertValidFinanceData } from "../../domain/validate.ts";
import type { ColumnMapping, ImportedStatement, UserLedger } from "./types.ts";
import { USER_LEDGER_STORAGE_KEY } from "./types.ts";

export function emptyUserLedger(currency = "USD"): UserLedger {
  return {
    version: 1,
    currency,
    accounts: [],
    cards: [],
    transactions: [],
    statements: [],
    columnMappings: {},
  };
}

export function readUserLedger(storage: Storage | null): UserLedger | null {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(USER_LEDGER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as UserLedger;
    if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeUserLedger(storage: Storage | null, ledger: UserLedger): void {
  if (!storage) {
    throw new Error("Imported statements could not be saved on this device.");
  }
  assertValidFinanceData(ledger.accounts, ledger.cards, ledger.transactions);
  storage.setItem(USER_LEDGER_STORAGE_KEY, JSON.stringify(ledger));
}

export function rememberColumnMapping(
  ledger: UserLedger,
  fingerprint: string,
  mapping: ColumnMapping,
): UserLedger {
  return {
    ...ledger,
    columnMappings: { ...ledger.columnMappings, [fingerprint]: mapping },
  };
}

export function appendImportedStatement(
  ledger: UserLedger,
  next: {
    accounts: Account[];
    cards: Card[];
    transactions: Transaction[];
    statement: ImportedStatement;
  },
): UserLedger {
  const merged: UserLedger = {
    ...ledger,
    currency: next.statement.currency || ledger.currency,
    accounts: next.accounts,
    cards: next.cards,
    transactions: [...ledger.transactions, ...next.transactions],
    statements: [...ledger.statements, next.statement],
  };
  assertValidFinanceData(merged.accounts, merged.cards, merged.transactions);
  return merged;
}

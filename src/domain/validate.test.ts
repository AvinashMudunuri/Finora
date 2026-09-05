import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "./types.ts";
import { assertValidFinanceData } from "./validate.ts";

const accounts: Account[] = [
  {
    id: "acc-checking",
    name: "Checking",
    type: "checking",
    balance: 100,
    currency: "USD",
  },
  {
    id: "acc-credit",
    name: "Card",
    type: "credit",
    balance: 25,
    currency: "USD",
  },
];

const transactions: Transaction[] = [
  {
    id: "txn-1",
    accountId: "acc-checking",
    description: "Paycheck",
    amount: 50,
    date: "2026-09-01",
    type: "inflow",
  },
];

describe("finance data validation", () => {
  it("accepts unique accounts and transactions that reference those accounts", () => {
    expect(() => {
      assertValidFinanceData(accounts, transactions);
    }).not.toThrow();
  });

  it("rejects duplicate account ids", () => {
    expect(() => {
      assertValidFinanceData(
        [accounts[0]!, accounts[0]!],
        transactions,
      );
    }).toThrow(/duplicate account id/i);
  });

  it("rejects duplicate transaction ids", () => {
    expect(() => {
      assertValidFinanceData(accounts, [transactions[0]!, transactions[0]!]);
    }).toThrow(/duplicate transaction id/i);
  });

  it("rejects a transaction that does not reference an existing account", () => {
    expect(() => {
      assertValidFinanceData(accounts, [
        {
          ...transactions[0]!,
          id: "txn-missing",
          accountId: "acc-missing",
        },
      ]);
    }).toThrow(/unknown account/i);
  });
});

import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "./types.ts";
import {
  cashTotal,
  creditOwed,
  formatCurrency,
  formatDate,
  getRecentTransactions,
  netBalance,
  signedAmount,
} from "./finance.ts";

const accounts: Account[] = [
  {
    id: "checking",
    name: "Checking",
    type: "checking",
    balance: 1000,
    currency: "USD",
  },
  {
    id: "savings",
    name: "Savings",
    type: "savings",
    balance: 2500,
    currency: "USD",
  },
  {
    id: "credit",
    name: "Credit Card",
    type: "credit",
    balance: 400,
    currency: "USD",
  },
];

describe("net balance", () => {
  it("adds cash accounts and subtracts credit-card balances owed", () => {
    expect(cashTotal(accounts)).toBe(3500);
    expect(creditOwed(accounts)).toBe(400);
    expect(netBalance(accounts)).toBe(3100);
  });

  it("does not treat credit-card debt as spendable cash", () => {
    expect(netBalance(accounts)).not.toBe(3900);
  });
});

describe("money formatting", () => {
  it("formats account balances without a forced sign", () => {
    expect(formatCurrency(4286.47, "USD")).toBe("$4,286.47");
  });

  it("formats inflows and outflows with a visible sign", () => {
    expect(formatCurrency(3200, "USD", true)).toBe("+$3,200.00");
    expect(formatCurrency(-87.42, "USD", true)).toBe("-$87.42");
  });

  it("applies a sign from the transaction type", () => {
    expect(signedAmount({ type: "inflow", amount: 250 })).toBe(250);
    expect(signedAmount({ type: "outflow", amount: 48 })).toBe(-48);
  });
});

describe("recent transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "t1",
      accountId: "checking",
      description: "Groceries",
      amount: 40,
      date: "2026-09-01",
      type: "outflow",
    },
    {
      id: "t2",
      accountId: "savings",
      description: "Interest",
      amount: 3,
      date: "2026-08-15",
      type: "inflow",
    },
    {
      id: "t3",
      accountId: "checking",
      description: "Paycheck",
      amount: 2000,
      date: "2026-09-03",
      type: "inflow",
    },
  ];

  it("returns the newest transactions first and respects the limit", () => {
    const recent = getRecentTransactions(transactions, "all", 2);

    expect(recent.map((tx) => tx.description)).toEqual(["Paycheck", "Groceries"]);
  });

  it("can filter to one account before applying recency", () => {
    const recent = getRecentTransactions(transactions, "savings", 10);

    expect(recent).toHaveLength(1);
    expect(recent[0]?.description).toBe("Interest");
  });
});

describe("date formatting", () => {
  it("formats ISO dates as readable calendar days", () => {
    expect(formatDate("2026-09-03")).toBe("Sep 3, 2026");
  });
});

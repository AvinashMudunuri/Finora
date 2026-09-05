import { describe, expect, it } from "vitest";
import type { Account, Card, Transaction } from "./types.ts";
import {
  cashTotal,
  creditOwed,
  formatCurrency,
  formatDate,
  getCardTransactions,
  getRecentTransactions,
  netBalance,
  paymentStatusLabel,
  signedAmount,
} from "./finance.ts";

const accounts: Account[] = [
  {
    id: "acc-checking",
    name: "Checking",
    type: "bank",
    balance: 1000,
    currency: "USD",
  },
  {
    id: "acc-cash",
    name: "Cash",
    type: "cash",
    balance: 80,
    currency: "USD",
  },
  {
    id: "acc-investment",
    name: "Investment Account",
    type: "investment",
    balance: 5000,
    currency: "USD",
  },
];

const cards: Card[] = [
  {
    id: "card-visa",
    name: "Visa Rewards",
    issuer: "Northlake Bank",
    creditLimit: 2000,
    outstandingBalance: 400,
    availableCredit: 1600,
    currency: "USD",
    statementPeriodEnd: "2026-09-08",
    paymentDueDate: "2026-09-22",
    minimumPayment: 25,
    paymentStatus: "due",
  },
];

describe("existing overview totals", () => {
  it("adds bank and cash balances and subtracts card amounts owed", () => {
    expect(cashTotal(accounts)).toBe(1080);
    expect(creditOwed(cards)).toBe(400);
    expect(netBalance(accounts, cards)).toBe(680);
  });

  it("does not treat investment value or card debt as spendable cash", () => {
    expect(cashTotal(accounts)).not.toBe(6080);
    expect(netBalance(accounts, cards)).not.toBe(1480);
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

  it("applies a presentation sign from the financial event", () => {
    expect(
      signedAmount({
        eventType: "income",
        amount: 250,
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      } as Transaction),
    ).toBe(250);
    expect(
      signedAmount({
        eventType: "card_purchase",
        amount: 48,
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-visa",
      } as Transaction),
    ).toBe(-48);
  });
});

describe("recent transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "t1",
      date: "2026-09-01",
      description: "Groceries",
      amount: 40,
      currency: "USD",
      eventType: "expense",
      accountId: "acc-checking",
      counterpartyAccountId: null,
      cardId: null,
    },
    {
      id: "t2",
      date: "2026-08-15",
      description: "Interest",
      amount: 3,
      currency: "USD",
      eventType: "income",
      accountId: "acc-cash",
      counterpartyAccountId: null,
      cardId: null,
    },
    {
      id: "t3",
      date: "2026-09-03",
      description: "Paycheck",
      amount: 2000,
      currency: "USD",
      eventType: "income",
      accountId: "acc-checking",
      counterpartyAccountId: null,
      cardId: null,
    },
    {
      id: "t4",
      date: "2026-09-02",
      description: "Dinner",
      amount: 64,
      currency: "USD",
      eventType: "card_purchase",
      accountId: null,
      counterpartyAccountId: null,
      cardId: "card-visa",
    },
  ];

  it("returns the newest transactions first and respects the limit", () => {
    const recent = getRecentTransactions(transactions, "all", 2);

    expect(recent.map((tx) => tx.description)).toEqual(["Paycheck", "Dinner"]);
  });

  it("filters by accountId or cardId before applying recency", () => {
    expect(getRecentTransactions(transactions, "acc-cash", 10)).toHaveLength(1);
    expect(getRecentTransactions(transactions, "acc-cash", 10)[0]?.description).toBe(
      "Interest",
    );
    expect(
      getRecentTransactions(transactions, "card-visa", 10).map((tx) => tx.description),
    ).toEqual(["Dinner"]);
  });
});

describe("date formatting", () => {
  it("formats ISO dates as readable calendar days", () => {
    expect(formatDate("2026-09-03")).toBe("Sep 3, 2026");
  });
});

describe("card transactions", () => {
  it("returns only transactions with an explicit matching cardId", () => {
    const transactions: Transaction[] = [
      {
        id: "visa-purchase",
        date: "2026-08-30",
        description: "Transit — Metro Card",
        amount: 48,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-visa",
      },
      {
        id: "amex-purchase",
        date: "2026-08-29",
        description: "Visa Rewards lookalike",
        amount: 42.15,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-amex",
      },
      {
        id: "checking-expense",
        date: "2026-09-02",
        description: "Whole Foods Market",
        amount: 87.42,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];

    expect(getCardTransactions(transactions, "card-visa").map((tx) => tx.id)).toEqual([
      "visa-purchase",
    ]);
  });
});

describe("payment status labels", () => {
  it("renders payment status as a readable label", () => {
    expect(paymentStatusLabel("current")).toBe("Current");
    expect(paymentStatusLabel("due")).toBe("Due");
    expect(paymentStatusLabel("overdue")).toBe("Overdue");
  });
});

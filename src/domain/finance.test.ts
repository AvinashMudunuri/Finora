import { describe, expect, it } from "vitest";
import type { Account, Card, Transaction } from "./types.ts";
import {
  cashTotal,
  creditOwed,
  eventTypeLabel,
  formatCurrency,
  formatDate,
  getAccountTransactions,
  getCardTransactions,
  getRecentTransactions,
  listTransactions,
  netBalance,
  transactionListEmptyReason,
  paymentStatusLabel,
  signedAmount,
  transactionContext,
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

describe("account transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "income",
      date: "2026-09-03",
      description: "Payroll",
      amount: 1000,
      currency: "USD",
      eventType: "income",
      accountId: "acc-checking",
      counterpartyAccountId: null,
      cardId: null,
    },
    {
      id: "expense",
      date: "2026-09-02",
      description: "Groceries",
      amount: 40,
      currency: "USD",
      eventType: "expense",
      accountId: "acc-checking",
      counterpartyAccountId: null,
      cardId: null,
    },
    {
      id: "transfer",
      date: "2026-08-28",
      description: "Transfer to savings",
      amount: 200,
      currency: "USD",
      eventType: "transfer",
      accountId: "acc-checking",
      counterpartyAccountId: "acc-savings",
      cardId: null,
    },
    {
      id: "card-pay",
      date: "2026-09-01",
      description: "Payment — Thank you",
      amount: 100,
      currency: "USD",
      eventType: "card_payment",
      accountId: "acc-checking",
      counterpartyAccountId: null,
      cardId: "card-visa",
    },
    {
      id: "card-buy",
      date: "2026-08-30",
      description: "Dinner",
      amount: 64,
      currency: "USD",
      eventType: "card_purchase",
      accountId: null,
      counterpartyAccountId: null,
      cardId: "card-visa",
    },
    {
      id: "invest",
      date: "2026-08-12",
      description: "Dividend",
      amount: 18,
      currency: "USD",
      eventType: "investment",
      accountId: "acc-investment",
      counterpartyAccountId: null,
      cardId: null,
    },
  ];

  it("includes transactions with an explicit accountId", () => {
    expect(
      getAccountTransactions(transactions, "acc-checking").map((tx) => tx.id),
    ).toEqual(["income", "expense", "card-pay", "transfer"]);
  });

  it("includes transfers for both the source and destination accounts", () => {
    expect(
      getAccountTransactions(transactions, "acc-savings").map((tx) => tx.id),
    ).toEqual(["transfer"]);
    expect(
      getAccountTransactions(transactions, "acc-checking").map((tx) => tx.id),
    ).toContain("transfer");
  });

  it("includes card payments on the funding account", () => {
    expect(
      getAccountTransactions(transactions, "acc-checking").map((tx) => tx.id),
    ).toContain("card-pay");
  });

  it("does not attribute a card purchase to an account because a later payment exists", () => {
    expect(
      getAccountTransactions(transactions, "acc-checking").map((tx) => tx.id),
    ).not.toContain("card-buy");
  });

  it("orders newest first and returns an empty list when nothing is related", () => {
    expect(getAccountTransactions(transactions, "acc-checking")[0]?.id).toBe(
      "income",
    );
    expect(getAccountTransactions(transactions, "acc-missing")).toEqual([]);
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

describe("event type labels", () => {
  it("presents domain event types without renaming the stored values", () => {
    expect(eventTypeLabel("income")).toBe("Income");
    expect(eventTypeLabel("expense")).toBe("Expense");
    expect(eventTypeLabel("transfer")).toBe("Transfer");
    expect(eventTypeLabel("card_purchase")).toBe("Card purchase");
    expect(eventTypeLabel("card_payment")).toBe("Card payment");
    expect(eventTypeLabel("investment")).toBe("Investment");
  });
});

describe("transaction context", () => {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  it("uses explicit account and card relationships, not descriptions", () => {
    expect(
      transactionContext(
        {
          id: "income",
          date: "2026-09-03",
          description: "Payroll",
          amount: 100,
          currency: "USD",
          eventType: "income",
          accountId: "acc-checking",
          counterpartyAccountId: null,
          cardId: null,
        },
        accountsById,
        cardsById,
      ),
    ).toBe("Checking");

    expect(
      transactionContext(
        {
          id: "transfer",
          date: "2026-08-28",
          description: "Transfer to Emergency Savings",
          amount: 400,
          currency: "USD",
          eventType: "transfer",
          accountId: "acc-checking",
          counterpartyAccountId: "acc-cash",
          cardId: null,
        },
        accountsById,
        cardsById,
      ),
    ).toBe("Checking → Cash");

    expect(
      transactionContext(
        {
          id: "purchase",
          date: "2026-08-30",
          description: "Looks like Checking",
          amount: 48,
          currency: "USD",
          eventType: "card_purchase",
          accountId: null,
          counterpartyAccountId: null,
          cardId: "card-visa",
        },
        accountsById,
        cardsById,
      ),
    ).toBe("Visa Rewards");

    expect(
      transactionContext(
        {
          id: "payment",
          date: "2026-09-01",
          description: "Payment — Thank you",
          amount: 250,
          currency: "USD",
          eventType: "card_payment",
          accountId: "acc-checking",
          counterpartyAccountId: null,
          cardId: "card-visa",
        },
        accountsById,
        cardsById,
      ),
    ).toBe("Checking → Visa Rewards");
  });
});

describe("transaction listing", () => {
  it("orders newest first and ties on the same date by transaction id", () => {
    const listed = listTransactions([
      {
        id: "txn-a",
        date: "2026-09-01",
        description: "Older A",
        amount: 1,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-c",
        date: "2026-09-02",
        description: "Newest C",
        amount: 1,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-b",
        date: "2026-09-01",
        description: "Older B",
        amount: 1,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
    ]);

    expect(listed.map((tx) => tx.id)).toEqual(["txn-c", "txn-b", "txn-a"]);
  });

  it("filters by party or event type without inventing extra lists", () => {
    const source: Transaction[] = [
      {
        id: "income",
        date: "2026-09-03",
        description: "Payroll",
        amount: 10,
        currency: "USD",
        eventType: "income",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "card",
        date: "2026-09-02",
        description: "Dinner",
        amount: 5,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-visa",
      },
    ];

    expect(
      listTransactions(source, { kind: "party", id: "acc-checking" }).map((tx) => tx.id),
    ).toEqual(["income"]);
    expect(
      listTransactions(source, { kind: "event", eventType: "card_purchase" }).map(
        (tx) => tx.id,
      ),
    ).toEqual(["card"]);
    expect(listTransactions(source, { kind: "all" })).toHaveLength(2);
  });

  it("combines party, event type, query, and period without changing order", () => {
    const accounts: Account[] = [
      {
        id: "acc-checking",
        name: "Everyday Checking",
        type: "bank",
        balance: 1,
        currency: "USD",
      },
    ];
    const cards: Card[] = [
      {
        id: "card-visa",
        name: "Visa Rewards",
        issuer: "Bank",
        creditLimit: 1000,
        outstandingBalance: 10,
        availableCredit: 990,
        currency: "USD",
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 25,
        paymentStatus: "current",
      },
    ];
    const source: Transaction[] = [
      {
        id: "txn-sep-dinner",
        date: "2026-09-04",
        description: "Dinner — Riverview",
        amount: 8,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-visa",
      },
      {
        id: "txn-aug-dinner",
        date: "2026-08-20",
        description: "Dinner — Earlier",
        amount: 6,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-visa",
      },
      {
        id: "txn-sep-payroll",
        date: "2026-09-03",
        description: "Payroll — Acme Corp",
        amount: 20,
        currency: "USD",
        eventType: "income",
        accountId: "acc-checking",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];

    expect(
      listTransactions(
        source,
        {
          kind: "party",
          id: "card-visa",
          eventType: "card_purchase",
          query: "dinner",
          year: 2026,
          month: 9,
        },
        { accounts, cards },
      ).map((tx) => tx.id),
    ).toEqual(["txn-sep-dinner"]);

    expect(
      listTransactions(
        source,
        { kind: "all", query: "everyday" },
        { accounts, cards },
      ).map((tx) => tx.id),
    ).toEqual(["txn-sep-payroll"]);

    expect(
      listTransactions(source, { kind: "all", year: 2025, month: 1 }),
    ).toEqual([]);
  });

  it("keeps newest-first order after search reduces the set", () => {
    const listed = listTransactions(
      [
        {
          id: "txn-a",
          date: "2026-09-01",
          description: "Metro older",
          amount: 1,
          currency: "USD",
          eventType: "expense",
          accountId: "acc-checking",
          counterpartyAccountId: null,
          cardId: null,
        },
        {
          id: "txn-c",
          date: "2026-09-03",
          description: "Metro newer",
          amount: 1,
          currency: "USD",
          eventType: "expense",
          accountId: "acc-checking",
          counterpartyAccountId: null,
          cardId: null,
        },
        {
          id: "txn-skip",
          date: "2026-09-04",
          description: "Groceries",
          amount: 1,
          currency: "USD",
          eventType: "expense",
          accountId: "acc-checking",
          counterpartyAccountId: null,
          cardId: null,
        },
      ],
      { kind: "all", query: "metro" },
    );

    expect(listed.map((tx) => tx.id)).toEqual(["txn-c", "txn-a"]);
  });
});

describe("transaction list empty reason", () => {
  it("distinguishes stored, period, and search/filter emptiness", () => {
    expect(transactionListEmptyReason(0, 0, 0, false)).toBe("none-stored");
    expect(transactionListEmptyReason(4, 0, 0, true)).toBe("none-in-period");
    expect(transactionListEmptyReason(4, 2, 0, true)).toBe("none-match");
    expect(transactionListEmptyReason(4, 2, 1, false)).toBeNull();
  });
});

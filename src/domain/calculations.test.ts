import { describe, expect, it } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import type { Account, Card, Transaction } from "./types.ts";
import {
  calculateCardUtilization,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
} from "./calculations.ts";

function account(
  overrides: Pick<Account, "id" | "type" | "balance"> & Partial<Account>,
): Account {
  return {
    name: overrides.name ?? overrides.id,
    currency: "USD",
    ...overrides,
  };
}

function card(
  overrides: Pick<Card, "id" | "creditLimit" | "outstandingBalance"> &
    Partial<Card>,
): Card {
  return {
    name: overrides.name ?? overrides.id,
    issuer: "Test Issuer",
    availableCredit: overrides.creditLimit - overrides.outstandingBalance,
    currency: "USD",
    statementPeriodEnd: "2026-09-08",
    paymentDueDate: "2026-09-22",
    minimumPayment: 0,
    paymentStatus: "current",
    ...overrides,
  };
}

function transaction(
  overrides: Pick<Transaction, "id" | "date" | "amount" | "eventType"> &
    Partial<Transaction>,
): Transaction {
  return {
    description: overrides.description ?? overrides.id,
    currency: "USD",
    accountId: null,
    counterpartyAccountId: null,
    cardId: null,
    ...overrides,
  };
}

describe("net worth", () => {
  it("treats bank, cash, and investment balances as assets", () => {
    const result = calculateNetWorth(
      [
        account({ id: "bank", type: "bank", balance: 100 }),
        account({ id: "cash", type: "cash", balance: 20 }),
        account({ id: "invest", type: "investment", balance: 50 }),
      ],
      [],
    );

    expect(result.assets).toBe(170);
    expect(result.liabilities).toBe(0);
    expect(result.netWorth).toBe(170);
  });

  it("treats card outstanding balances as liabilities and ignores credit limits", () => {
    const result = calculateNetWorth(
      [account({ id: "bank", type: "bank", balance: 200 })],
      [card({ id: "visa", creditLimit: 1000, outstandingBalance: 40 })],
    );

    expect(result.liabilities).toBe(40);
    expect(result.liabilities).not.toBe(1000);
    expect(result.netWorth).toBe(160);
  });

  it("equals assets minus liabilities", () => {
    const result = calculateNetWorth(
      [
        account({ id: "bank", type: "bank", balance: 80 }),
        account({ id: "invest", type: "investment", balance: 20 }),
      ],
      [card({ id: "visa", creditLimit: 500, outstandingBalance: 30 })],
    );

    expect(result.netWorth).toBe(result.assets - result.liabilities);
    expect(result.netWorth).toBe(70);
  });

  it("returns zeros for empty positions", () => {
    expect(calculateNetWorth([], [])).toEqual({
      assets: 0,
      liabilities: 0,
      netWorth: 0,
      currency: "USD",
    });
  });

  it("is deterministic for the fixture snapshot", () => {
    const first = calculateNetWorth(fixtureAccounts, fixtureCards);
    const second = calculateNetWorth(fixtureAccounts, fixtureCards);

    expect(first).toEqual(second);
    expect(first.assets).toBeCloseTo(25337.02, 2);
    expect(first.liabilities).toBeCloseTo(2168.59, 2);
    expect(first.netWorth).toBeCloseTo(23168.43, 2);
    expect(first.currency).toBe("USD");
  });
});

describe("card utilization", () => {
  it("calculates partial, zero, and full utilization", () => {
    const [partial, zero, full] = calculateCardUtilization([
      card({ id: "partial", creditLimit: 1000, outstandingBalance: 250 }),
      card({ id: "zero", creditLimit: 500, outstandingBalance: 0 }),
      card({ id: "full", creditLimit: 200, outstandingBalance: 200 }),
    ]);

    expect(partial?.utilization).toBeCloseTo(0.25, 5);
    expect(zero?.utilization).toBe(0);
    expect(full?.utilization).toBe(1);
  });

  it("handles a zero credit limit without inventing a utilization rate", () => {
    const [result] = calculateCardUtilization([
      card({ id: "broken", creditLimit: 0, outstandingBalance: 10 }),
    ]);

    expect(result?.utilization).toBeNull();
    expect(result?.availableCredit).toBe(0);
  });

  it("keeps available credit consistent with limit minus outstanding", () => {
    const [result] = calculateCardUtilization([
      card({
        id: "visa",
        creditLimit: 5000,
        outstandingBalance: 1842.19,
        availableCredit: 9999,
      }),
    ]);

    expect(result?.availableCredit).toBeCloseTo(3157.81, 2);
  });

  it("matches the fixture cards", () => {
    const [visa, amex] = calculateCardUtilization(fixtureCards);

    expect(visa?.cardId).toBe("card-visa");
    expect(visa?.utilization).toBeCloseTo(1842.19 / 5000, 5);
    expect(visa?.availableCredit).toBeCloseTo(3157.81, 2);
    expect(amex?.cardId).toBe("card-amex");
    expect(amex?.utilization).toBeCloseTo(326.4 / 2500, 5);
    expect(amex?.availableCredit).toBeCloseTo(2173.6, 2);
  });
});

describe("monthly spending", () => {
  const sample: Transaction[] = [
    transaction({
      id: "expense",
      date: "2026-08-10",
      amount: 20,
      eventType: "expense",
      accountId: "acc-checking",
    }),
    transaction({
      id: "card-buy",
      date: "2026-08-11",
      amount: 15,
      eventType: "card_purchase",
      cardId: "card-visa",
    }),
    transaction({
      id: "income",
      date: "2026-08-12",
      amount: 100,
      eventType: "income",
      accountId: "acc-checking",
    }),
    transaction({
      id: "transfer",
      date: "2026-08-13",
      amount: 40,
      eventType: "transfer",
      accountId: "acc-checking",
      counterpartyAccountId: "acc-savings",
    }),
    transaction({
      id: "card-pay",
      date: "2026-08-14",
      amount: 15,
      eventType: "card_payment",
      accountId: "acc-checking",
      cardId: "card-visa",
    }),
    transaction({
      id: "invest",
      date: "2026-08-15",
      amount: 8,
      eventType: "investment",
      accountId: "acc-investment",
    }),
    transaction({
      id: "next-month",
      date: "2026-09-02",
      amount: 50,
      eventType: "expense",
      accountId: "acc-checking",
    }),
  ];

  it("counts expenses and card purchases only", () => {
    const result = calculateMonthlySpending(sample, 2026, 8);

    expect(result.total).toBe(35);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(8);
  });

  it("does not count income, transfers, card payments, or investment events", () => {
    const result = calculateMonthlySpending(sample, 2026, 8);

    expect(result.total).not.toBe(35 + 100);
    expect(result.total).not.toBe(35 + 40);
    expect(result.total).not.toBe(35 + 15);
    expect(result.total).not.toBe(35 + 8);
  });

  it("does not double-count a card purchase and its later payment", () => {
    const result = calculateMonthlySpending(sample, 2026, 8);

    expect(result.total).toBe(20 + 15);
  });

  it("excludes transactions outside the selected month", () => {
    expect(calculateMonthlySpending(sample, 2026, 9).total).toBe(50);
    expect(calculateMonthlySpending(sample, 2026, 7).total).toBe(0);
  });

  it("returns zero for an empty transaction list", () => {
    expect(calculateMonthlySpending([], 2026, 8).total).toBe(0);
  });

  it("calculates August and September spending from the fixtures", () => {
    expect(calculateMonthlySpending(fixtureTransactions, 2026, 8).total).toBeCloseTo(
      2049.61,
      2,
    );
    expect(calculateMonthlySpending(fixtureTransactions, 2026, 9).total).toBeCloseTo(
      87.42,
      2,
    );
  });
});

const mixedMonth: Transaction[] = [
  transaction({
    id: "income",
    date: "2026-08-01",
    amount: 1000,
    eventType: "income",
    accountId: "acc-checking",
  }),
  transaction({
    id: "expense",
    date: "2026-08-02",
    amount: 200,
    eventType: "expense",
    accountId: "acc-checking",
  }),
  transaction({
    id: "card-buy",
    date: "2026-08-03",
    amount: 100,
    eventType: "card_purchase",
    cardId: "card-visa",
  }),
  transaction({
    id: "transfer",
    date: "2026-08-04",
    amount: 500,
    eventType: "transfer",
    accountId: "acc-checking",
    counterpartyAccountId: "acc-savings",
  }),
  transaction({
    id: "card-pay",
    date: "2026-08-05",
    amount: 100,
    eventType: "card_payment",
    accountId: "acc-checking",
    cardId: "card-visa",
  }),
  transaction({
    id: "invest",
    date: "2026-08-06",
    amount: 200,
    eventType: "investment",
    accountId: "acc-investment",
  }),
  transaction({
    id: "next-month-income",
    date: "2026-09-01",
    amount: 50,
    eventType: "income",
    accountId: "acc-checking",
  }),
];

describe("monthly income", () => {
  it("includes income and excludes every other event type", () => {
    const result = calculateMonthlyIncome(mixedMonth, 2026, 8);

    expect(result.total).toBe(1000);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(8);
  });

  it("does not treat expense, card purchase, transfer, card payment, or investment as income", () => {
    const result = calculateMonthlyIncome(mixedMonth, 2026, 8);

    expect(result.total).not.toBe(1000 + 200);
    expect(result.total).not.toBe(1000 + 100);
    expect(result.total).not.toBe(1000 + 500);
    expect(result.total).not.toBe(1000 + 100);
    expect(result.total).not.toBe(1000 + 200);
  });

  it("respects the explicit year and month", () => {
    expect(calculateMonthlyIncome(mixedMonth, 2026, 9).total).toBe(50);
    expect(calculateMonthlyIncome(mixedMonth, 2026, 7).total).toBe(0);
  });

  it("returns zero when a month has no income", () => {
    expect(
      calculateMonthlyIncome(
        [
          transaction({
            id: "only-spend",
            date: "2026-08-10",
            amount: 25,
            eventType: "expense",
            accountId: "acc-checking",
          }),
        ],
        2026,
        8,
      ).total,
    ).toBe(0);
  });

  it("calculates August and September income from the fixtures", () => {
    expect(calculateMonthlyIncome(fixtureTransactions, 2026, 8).total).toBeCloseTo(
      4.12,
      2,
    );
    expect(calculateMonthlyIncome(fixtureTransactions, 2026, 9).total).toBeCloseTo(
      3200,
      2,
    );
  });
});

describe("monthly savings", () => {
  it("is monthly income minus monthly spending and ignores other event types", () => {
    const result = calculateMonthlySavings(mixedMonth, 2026, 8);

    expect(result.income).toBe(1000);
    expect(result.spending).toBe(300);
    expect(result.savings).toBe(700);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(8);
  });

  it("does not let transfer, card payment, or investment change savings", () => {
    const result = calculateMonthlySavings(mixedMonth, 2026, 8);

    expect(result.savings).not.toBe(700 - 500);
    expect(result.savings).not.toBe(700 - 100);
    expect(result.savings).not.toBe(700 - 200);
  });

  it("respects the explicit year and month", () => {
    expect(calculateMonthlySavings(mixedMonth, 2026, 9).savings).toBe(50);
    expect(calculateMonthlySavings([], 2026, 8)).toEqual({
      year: 2026,
      month: 8,
      income: 0,
      spending: 0,
      savings: 0,
      currency: "USD",
    });
  });

  it("reuses the existing income and spending calculations for the fixtures", () => {
    const september = calculateMonthlySavings(fixtureTransactions, 2026, 9);
    const august = calculateMonthlySavings(fixtureTransactions, 2026, 8);

    expect(september.income).toBeCloseTo(3200, 2);
    expect(september.spending).toBeCloseTo(87.42, 2);
    expect(september.savings).toBeCloseTo(3112.58, 2);
    expect(august.income).toBeCloseTo(4.12, 2);
    expect(august.spending).toBeCloseTo(2049.61, 2);
    expect(august.savings).toBeCloseTo(4.12 - 2049.61, 2);
  });
});

import { describe, expect, it } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import type { Account, Card, Transaction } from "./types.ts";
import {
  calculateAssetBreakdown,
  calculateCardUtilization,
  calculateHighCardUtilization,
  HIGH_CARD_UTILIZATION_THRESHOLD,
  calculateLiquidAssets,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
  calculateSpendingChange,
  listSpendingChangeDrivers,
  SPENDING_CHANGE_DRIVER_LIMIT,
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

describe("asset breakdown", () => {
  it("totals bank, cash, and investment separately and sums them as assets", () => {
    const result = calculateAssetBreakdown([
      account({ id: "bank-a", type: "bank", balance: 100 }),
      account({ id: "bank-b", type: "bank", balance: 40 }),
      account({ id: "cash", type: "cash", balance: 20 }),
      account({ id: "invest", type: "investment", balance: 50 }),
    ]);

    expect(result.bank).toBe(140);
    expect(result.cash).toBe(20);
    expect(result.investment).toBe(50);
    expect(result.total).toBe(210);
    expect(result.liquid).toBe(160);
    expect(result.currency).toBe("USD");
  });

  it("returns zeros for an empty account list", () => {
    expect(calculateAssetBreakdown([])).toEqual({
      bank: 0,
      cash: 0,
      investment: 0,
      total: 0,
      liquid: 0,
      currency: "USD",
    });
  });

  it("matches fixture assets and stays deterministic", () => {
    const first = calculateAssetBreakdown(fixtureAccounts);
    const second = calculateAssetBreakdown(fixtureAccounts);
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);

    expect(first).toEqual(second);
    expect(first.bank).toBeCloseTo(4286.47 + 12450, 2);
    expect(first.cash).toBeCloseTo(180, 2);
    expect(first.investment).toBeCloseTo(8420.55, 2);
    expect(first.total).toBeCloseTo(worth.assets, 2);
    expect(first.liquid).toBeCloseTo(first.bank + first.cash, 2);
  });
});

describe("liquid assets", () => {
  it("includes bank and cash and excludes investment", () => {
    expect(
      calculateLiquidAssets([
        account({ id: "bank", type: "bank", balance: 100 }),
        account({ id: "cash", type: "cash", balance: 20 }),
        account({ id: "invest", type: "investment", balance: 50 }),
      ]),
    ).toBe(120);
  });

  it("returns zero for an empty account list", () => {
    expect(calculateLiquidAssets([])).toBe(0);
  });

  it("is deterministic for the fixture snapshot", () => {
    const first = calculateLiquidAssets(fixtureAccounts);
    const second = calculateLiquidAssets(fixtureAccounts);

    expect(first).toBe(second);
    expect(first).toBeCloseTo(4286.47 + 12450 + 180, 2);
    expect(first).not.toBeCloseTo(4286.47 + 12450 + 180 + 8420.55, 2);
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

describe("high card utilization", () => {
  it("does not surface a card below the threshold", () => {
    expect(
      calculateHighCardUtilization([
        card({ id: "below", creditLimit: 1000, outstandingBalance: 699 }),
      ]),
    ).toBeNull();
  });

  it("surfaces a card exactly at the threshold", () => {
    const result = calculateHighCardUtilization([
      card({ id: "edge", creditLimit: 1000, outstandingBalance: 700 }),
    ]);

    expect(result).toEqual({
      cardId: "edge",
      utilization: 0.7,
      threshold: HIGH_CARD_UTILIZATION_THRESHOLD,
      outstandingBalance: 700,
      creditLimit: 1000,
    });
  });

  it("surfaces a card above the threshold", () => {
    const result = calculateHighCardUtilization([
      card({ id: "above", creditLimit: 1000, outstandingBalance: 800 }),
    ]);

    expect(result?.cardId).toBe("above");
    expect(result?.utilization).toBeCloseTo(0.8, 5);
    expect(result?.threshold).toBe(HIGH_CARD_UTILIZATION_THRESHOLD);
  });

  it("does not treat a zero credit limit as high utilization", () => {
    expect(
      calculateHighCardUtilization([
        card({ id: "broken", creditLimit: 0, outstandingBalance: 10 }),
      ]),
    ).toBeNull();
  });

  it("selects the highest-utilization qualifying card", () => {
    const result = calculateHighCardUtilization([
      card({ id: "amex", creditLimit: 2500, outstandingBalance: 326.4 }),
      card({ id: "visa", creditLimit: 1000, outstandingBalance: 800 }),
      card({ id: "mid", creditLimit: 1000, outstandingBalance: 720 }),
    ]);

    expect(result?.cardId).toBe("visa");
    expect(result?.utilization).toBeCloseTo(0.8, 5);
  });

  it("breaks utilization ties using existing card-list order", () => {
    const result = calculateHighCardUtilization([
      card({ id: "first", creditLimit: 1000, outstandingBalance: 800 }),
      card({ id: "second", creditLimit: 500, outstandingBalance: 400 }),
    ]);

    expect(result?.cardId).toBe("first");
    expect(result?.utilization).toBe(0.8);
  });

  it("returns no insight when there are no cards", () => {
    expect(calculateHighCardUtilization([])).toBeNull();
  });

  it("does not surface fixture cards", () => {
    expect(calculateHighCardUtilization(fixtureCards)).toBeNull();
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

describe("spending change", () => {
  it("selects the current period from the latest transaction date", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "older",
        date: "2026-07-31",
        amount: 10,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "latest",
        date: "2026-09-04",
        amount: 25,
        eventType: "expense",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.currentPeriod).toEqual({ year: 2026, month: 9 });
    expect(result?.previousPeriod).toEqual({ year: 2026, month: 8 });
  });

  it("compares the latest fixture month with the immediately preceding month", () => {
    const result = calculateSpendingChange(fixtureTransactions);
    const current = calculateMonthlySpending(fixtureTransactions, 2026, 9);
    const previous = calculateMonthlySpending(fixtureTransactions, 2026, 8);

    expect(result).not.toBeNull();
    expect(result?.currentPeriod).toEqual({
      year: current.year,
      month: current.month,
    });
    expect(result?.previousPeriod).toEqual({
      year: previous.year,
      month: previous.month,
    });
    expect(result?.currentSpending).toBeCloseTo(current.total, 2);
    expect(result?.previousSpending).toBeCloseTo(previous.total, 2);
    expect(result?.currentSpending).toBeCloseTo(87.42, 2);
    expect(result?.previousSpending).toBeCloseTo(2049.61, 2);
    expect(result?.absoluteChange).toBeCloseTo(1962.19, 2);
    expect(result?.direction).toBe("decreased");
    expect(result?.currency).toBe("USD");
  });

  it("reports an increase when current month spending is greater", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "prev-spend",
        date: "2026-08-10",
        amount: 40,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "current-spend",
        date: "2026-09-02",
        amount: 75,
        eventType: "card_purchase",
        cardId: "card-visa",
      }),
    ]);

    expect(result?.currentSpending).toBe(75);
    expect(result?.previousSpending).toBe(40);
    expect(result?.absoluteChange).toBe(35);
    expect(result?.direction).toBe("increased");
  });

  it("reports a decrease when current month spending is less", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "prev-spend",
        date: "2026-08-10",
        amount: 90,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "current-spend",
        date: "2026-09-02",
        amount: 20,
        eventType: "expense",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.currentSpending).toBe(20);
    expect(result?.previousSpending).toBe(90);
    expect(result?.absoluteChange).toBe(70);
    expect(result?.direction).toBe("decreased");
  });

  it("reports an unchanged direction when spending is equal", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "prev-spend",
        date: "2026-08-10",
        amount: 50,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "current-spend",
        date: "2026-09-02",
        amount: 50,
        eventType: "card_purchase",
        cardId: "card-visa",
      }),
    ]);

    expect(result?.currentSpending).toBe(50);
    expect(result?.previousSpending).toBe(50);
    expect(result?.absoluteChange).toBe(0);
    expect(result?.direction).toBe("unchanged");
  });

  it("treats a missing previous month as zero previous spending", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "only-current",
        date: "2026-09-02",
        amount: 30,
        eventType: "expense",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.currentPeriod).toEqual({ year: 2026, month: 9 });
    expect(result?.previousPeriod).toEqual({ year: 2026, month: 8 });
    expect(result?.currentSpending).toBe(30);
    expect(result?.previousSpending).toBe(0);
    expect(result?.absoluteChange).toBe(30);
    expect(result?.direction).toBe("increased");
  });

  it("reports zero current spending when the latest month has no spending events", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "prev-spend",
        date: "2026-08-10",
        amount: 45,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "current-income",
        date: "2026-09-01",
        amount: 200,
        eventType: "income",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.currentSpending).toBe(0);
    expect(result?.previousSpending).toBe(45);
    expect(result?.absoluteChange).toBe(45);
    expect(result?.direction).toBe("decreased");
  });

  it("does not treat income, transfers, card payments, or investment as spending", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "prev-expense",
        date: "2026-08-02",
        amount: 10,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "prev-income",
        date: "2026-08-03",
        amount: 100,
        eventType: "income",
        accountId: "acc-checking",
      }),
      transaction({
        id: "prev-transfer",
        date: "2026-08-04",
        amount: 40,
        eventType: "transfer",
        accountId: "acc-checking",
        counterpartyAccountId: "acc-savings",
      }),
      transaction({
        id: "prev-card-pay",
        date: "2026-08-05",
        amount: 15,
        eventType: "card_payment",
        accountId: "acc-checking",
        cardId: "card-visa",
      }),
      transaction({
        id: "prev-invest",
        date: "2026-08-06",
        amount: 8,
        eventType: "investment",
        accountId: "acc-investment",
      }),
      transaction({
        id: "current-card-buy",
        date: "2026-09-02",
        amount: 12,
        eventType: "card_purchase",
        cardId: "card-visa",
      }),
      transaction({
        id: "current-income",
        date: "2026-09-03",
        amount: 80,
        eventType: "income",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.previousSpending).toBe(10);
    expect(result?.currentSpending).toBe(12);
    expect(result?.absoluteChange).toBe(2);
    expect(result?.direction).toBe("increased");
  });

  it("uses the previous calendar month across a year boundary", () => {
    const result = calculateSpendingChange([
      transaction({
        id: "december",
        date: "2025-12-20",
        amount: 18,
        eventType: "expense",
        accountId: "acc-checking",
      }),
      transaction({
        id: "january",
        date: "2026-01-04",
        amount: 7,
        eventType: "expense",
        accountId: "acc-checking",
      }),
    ]);

    expect(result?.currentPeriod).toEqual({ year: 2026, month: 1 });
    expect(result?.previousPeriod).toEqual({ year: 2025, month: 12 });
    expect(result?.currentSpending).toBe(7);
    expect(result?.previousSpending).toBe(18);
    expect(result?.direction).toBe("decreased");
  });

  it("returns null when no latest month can be determined", () => {
    expect(calculateSpendingChange([])).toBeNull();
  });
});

describe("spending change drivers", () => {
  it("uses previous-period spending as drivers when spending decreased", () => {
    const transactions = [
      transaction({
        id: "prev-rent",
        date: "2026-08-10",
        amount: 900,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Rent",
      }),
      transaction({
        id: "current-food",
        date: "2026-09-02",
        amount: 40,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Groceries",
      }),
    ];
    const change = calculateSpendingChange(transactions);

    expect(change?.direction).toBe("decreased");
    expect(listSpendingChangeDrivers(transactions, change!)).toEqual([
      {
        transactionId: "prev-rent",
        description: "Rent",
        amount: 900,
        period: change!.previousPeriod,
      },
    ]);
  });

  it("uses current-period spending as drivers when spending increased", () => {
    const transactions = [
      transaction({
        id: "prev-food",
        date: "2026-08-10",
        amount: 20,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Older grocery",
      }),
      transaction({
        id: "current-travel",
        date: "2026-09-02",
        amount: 180,
        eventType: "card_purchase",
        cardId: "card-visa",
        description: "Airline ticket",
      }),
    ];
    const change = calculateSpendingChange(transactions);

    expect(change?.direction).toBe("increased");
    expect(listSpendingChangeDrivers(transactions, change!)).toEqual([
      {
        transactionId: "current-travel",
        description: "Airline ticket",
        amount: 180,
        period: change!.currentPeriod,
      },
    ]);
  });

  it("limits drivers to the product rule and keeps amount order", () => {
    const transactions = [
      transaction({
        id: "prev-a",
        date: "2026-08-04",
        amount: 10,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Coffee",
      }),
      transaction({
        id: "prev-b",
        date: "2026-08-05",
        amount: 400,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Furniture",
      }),
      transaction({
        id: "prev-c",
        date: "2026-08-06",
        amount: 250,
        eventType: "card_purchase",
        cardId: "card-visa",
        description: "Appliances",
      }),
      transaction({
        id: "prev-d",
        date: "2026-08-07",
        amount: 80,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Utilities",
      }),
      transaction({
        id: "current-small",
        date: "2026-09-02",
        amount: 5,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Snack",
      }),
    ];
    const change = calculateSpendingChange(transactions);
    const drivers = listSpendingChangeDrivers(transactions, change!);

    expect(SPENDING_CHANGE_DRIVER_LIMIT).toBe(3);
    expect(drivers.map((driver) => driver.transactionId)).toEqual([
      "prev-b",
      "prev-c",
      "prev-d",
    ]);
    expect(drivers).toHaveLength(3);
  });

  it("breaks amount ties with newest date, then higher id", () => {
    const transactions = [
      transaction({
        id: "tie-old",
        date: "2026-08-01",
        amount: 50,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Older same amount",
      }),
      transaction({
        id: "tie-a",
        date: "2026-08-10",
        amount: 50,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Same day A",
      }),
      transaction({
        id: "tie-b",
        date: "2026-08-10",
        amount: 50,
        eventType: "card_purchase",
        cardId: "card-visa",
        description: "Same day B",
      }),
      transaction({
        id: "current-small",
        date: "2026-09-02",
        amount: 1,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Snack",
      }),
    ];
    const change = calculateSpendingChange(transactions);

    expect(
      listSpendingChangeDrivers(transactions, change!).map(
        (driver) => driver.transactionId,
      ),
    ).toEqual(["tie-b", "tie-a", "tie-old"]);
  });

  it("does not treat income, transfers, card payments, or investment as drivers", () => {
    const transactions = [
      transaction({
        id: "prev-income",
        date: "2026-08-03",
        amount: 1000,
        eventType: "income",
        accountId: "acc-checking",
      }),
      transaction({
        id: "prev-transfer",
        date: "2026-08-04",
        amount: 400,
        eventType: "transfer",
        accountId: "acc-checking",
        counterpartyAccountId: "acc-savings",
      }),
      transaction({
        id: "prev-card-pay",
        date: "2026-08-05",
        amount: 200,
        eventType: "card_payment",
        accountId: "acc-checking",
        cardId: "card-visa",
      }),
      transaction({
        id: "prev-invest",
        date: "2026-08-06",
        amount: 150,
        eventType: "investment",
        accountId: "acc-investment",
      }),
      transaction({
        id: "prev-spend",
        date: "2026-08-07",
        amount: 30,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Pharmacy",
      }),
      transaction({
        id: "current-spend",
        date: "2026-09-02",
        amount: 12,
        eventType: "card_purchase",
        cardId: "card-visa",
        description: "Transit",
      }),
    ];
    const change = calculateSpendingChange(transactions);

    expect(change?.direction).toBe("decreased");
    expect(listSpendingChangeDrivers(transactions, change!)).toEqual([
      {
        transactionId: "prev-spend",
        description: "Pharmacy",
        amount: 30,
        period: change!.previousPeriod,
      },
    ]);
  });

  it("returns no drivers when spending is unchanged", () => {
    const transactions = [
      transaction({
        id: "prev-spend",
        date: "2026-08-10",
        amount: 40,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Older grocery",
      }),
      transaction({
        id: "current-spend",
        date: "2026-09-02",
        amount: 40,
        eventType: "expense",
        accountId: "acc-checking",
        description: "Newer grocery",
      }),
    ];
    const change = calculateSpendingChange(transactions);

    expect(change?.direction).toBe("unchanged");
    expect(listSpendingChangeDrivers(transactions, change!)).toEqual([]);
  });

  it("returns no drivers when there is no spending change result", () => {
    expect(calculateSpendingChange([])).toBeNull();
  });

  it("uses fixture spending transactions for the fixture decrease", () => {
    const change = calculateSpendingChange(fixtureTransactions);
    const drivers = listSpendingChangeDrivers(fixtureTransactions, change!);

    expect(change?.direction).toBe("decreased");
    expect(drivers.map((driver) => driver.transactionId)).toEqual([
      "txn-004",
      "txn-008",
      "txn-005",
    ]);
    expect(drivers[0]?.description).toBe("Rent — Oak Street Apt");
    expect(drivers[0]?.amount).toBe(1850);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateCardUtilization,
  calculateHighCardUtilization,
  calculateNetWorth,
} from "./calculations.ts";
import { getAccountTransactions, getCardTransactions } from "./finance.ts";
import { listAttentionInsights } from "./insights.ts";
import type { Account, Card, Transaction } from "./types.ts";
import {
  assertValidFinanceData,
  createAccount,
  createCard,
  updateAccount,
  updateCard,
} from "./validate.ts";

const accounts: Account[] = [
  {
    id: "acc-checking",
    name: "Checking",
    type: "bank",
    balance: 100,
    currency: "USD",
  },
  {
    id: "acc-investment",
    name: "Brokerage",
    type: "investment",
    balance: 200,
    currency: "USD",
  },
];

const cards: Card[] = [
  {
    id: "card-visa",
    name: "Visa Rewards",
    issuer: "Northlake Bank",
    creditLimit: 1000,
    outstandingBalance: 250,
    availableCredit: 750,
    currency: "USD",
    statementPeriodEnd: "2026-09-08",
    paymentDueDate: "2026-09-22",
    minimumPayment: 25,
    paymentStatus: "due",
  },
];

const transactions: Transaction[] = [
  {
    id: "txn-1",
    date: "2026-09-01",
    description: "Paycheck",
    amount: 50,
    currency: "USD",
    eventType: "income",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: null,
  },
];

describe("finance data validation", () => {
  it("accepts coherent accounts, cards, and transactions", () => {
    expect(() => {
      assertValidFinanceData(accounts, cards, transactions);
    }).not.toThrow();
  });

  it("rejects duplicate account, card, and transaction ids", () => {
    expect(() => {
      assertValidFinanceData([accounts[0]!, accounts[0]!], cards, transactions);
    }).toThrow(/duplicate account id/i);

    expect(() => {
      assertValidFinanceData(accounts, [cards[0]!, cards[0]!], transactions);
    }).toThrow(/duplicate card id/i);

    expect(() => {
      assertValidFinanceData(accounts, cards, [
        transactions[0]!,
        transactions[0]!,
      ]);
    }).toThrow(/duplicate transaction id/i);
  });

  it("rejects a transaction that references a missing account", () => {
    expect(() => {
      assertValidFinanceData(accounts, cards, [
        {
          ...transactions[0]!,
          id: "txn-missing",
          accountId: "acc-missing",
        },
      ]);
    }).toThrow(/unknown account/i);
  });

  it("rejects a card purchase that references a missing card", () => {
    expect(() => {
      assertValidFinanceData(accounts, cards, [
        {
          id: "txn-card-missing",
          date: "2026-09-01",
          description: "Unknown card charge",
          amount: 10,
          currency: "USD",
          eventType: "card_purchase",
          accountId: null,
          counterpartyAccountId: null,
          cardId: "card-missing",
        },
      ]);
    }).toThrow(/unknown card/i);
  });

  it("rejects available credit that does not match limit minus outstanding", () => {
    expect(() => {
      assertValidFinanceData(
        accounts,
        [
          {
            ...cards[0]!,
            availableCredit: 100,
          },
        ],
        transactions,
      );
    }).toThrow(/available credit is inconsistent/i);
  });
});

const validAccountDraft = {
  name: "Travel Fund",
  type: "bank",
  balance: 500,
};

const validCardDraft = {
  name: "Store Card",
  issuer: "Northlake Bank",
  creditLimit: 1000,
  outstandingBalance: 100,
  statementPeriodEnd: "2026-10-08",
  paymentDueDate: "2026-10-22",
  minimumPayment: 25,
  paymentStatus: "current",
};

describe("account creation", () => {
  it("creates a valid account with a generated identifier", () => {
    const result = createAccount(validAccountDraft, accounts);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.id).toBe("acc-1");
    expect(result.value.name).toBe("Travel Fund");
    expect(result.value.type).toBe("bank");
    expect(result.value.balance).toBe(500);
    expect(result.value.currency).toBe("USD");
    expect(() => {
      assertValidFinanceData([...accounts, result.value], cards, transactions);
    }).not.toThrow();
  });

  it("rejects invalid account creation and keeps the existing ledger", () => {
    expect(createAccount({ ...validAccountDraft, name: "   " }, accounts)).toEqual({
      ok: false,
      errors: { name: "Account name is required." },
    });
    expect(createAccount({ ...validAccountDraft, type: "credit" }, accounts)).toEqual({
      ok: false,
      errors: { type: "Account type must be Bank, Cash, or Investment." },
    });
    expect(createAccount({ ...validAccountDraft, balance: "abc" }, accounts)).toEqual({
      ok: false,
      errors: { balance: "Account balance must be a valid number." },
    });
    expect(accounts.map((account) => account.id)).toEqual([
      "acc-checking",
      "acc-investment",
    ]);
  });
});

describe("account editing", () => {
  it("edits an account while preserving its identity", () => {
    const result = updateAccount(
      "acc-checking",
      { name: "Primary Checking", type: "bank", balance: 250 },
      accounts,
      transactions,
      cards,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.id).toBe("acc-checking");
    expect(result.value.name).toBe("Primary Checking");
    expect(result.value.balance).toBe(250);
    expect(
      getAccountTransactions(transactions, result.value.id).map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["txn-1"]);
  });

  it("rejects a type change that would break investment transactions", () => {
    const investmentTxn: Transaction = {
      id: "txn-invest",
      date: "2026-09-01",
      description: "Dividend",
      amount: 10,
      currency: "USD",
      eventType: "investment",
      accountId: "acc-investment",
      counterpartyAccountId: null,
      cardId: null,
    };
    const result = updateAccount(
      "acc-investment",
      { name: "Brokerage", type: "bank", balance: 200 },
      accounts,
      [investmentTxn],
      cards,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors.type).toMatch(/investment/i);
  });
});

describe("card creation", () => {
  it("creates a valid card and derives available credit", () => {
    const result = createCard(validCardDraft, cards);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.id).toBe("card-1");
    expect(result.value.availableCredit).toBe(900);
    expect(result.value.currency).toBe("USD");
    expect(() => {
      assertValidFinanceData(accounts, [...cards, result.value], transactions);
    }).not.toThrow();
  });

  it("rejects invalid card creation", () => {
    expect(createCard({ ...validCardDraft, name: "" }, cards)).toEqual({
      ok: false,
      errors: { name: "Card name is required." },
    });
    expect(createCard({ ...validCardDraft, creditLimit: 0 }, cards)).toEqual({
      ok: false,
      errors: { creditLimit: "Credit limit must be greater than 0." },
    });
    expect(
      createCard({ ...validCardDraft, outstandingBalance: 1500 }, cards),
    ).toEqual({
      ok: false,
      errors: {
        outstandingBalance: "Outstanding balance cannot exceed the credit limit.",
      },
    });
    expect(createCard({ ...validCardDraft, paymentDueDate: "2026-13-40" }, cards)).toEqual({
      ok: false,
      errors: { paymentDueDate: "Payment due date must be a valid date (YYYY-MM-DD)." },
    });
    expect(createCard({ ...validCardDraft, paymentStatus: "late" }, cards)).toEqual({
      ok: false,
      errors: { paymentStatus: "Payment status must be Current, Due, or Overdue." },
    });
  });
});

describe("card editing", () => {
  it("edits a card while preserving its identity and transaction links", () => {
    const cardPurchase: Transaction = {
      id: "txn-card",
      date: "2026-09-01",
      description: "Hardware store",
      amount: 20,
      currency: "USD",
      eventType: "card_purchase",
      accountId: null,
      counterpartyAccountId: null,
      cardId: "card-visa",
    };
    const result = updateCard(
      "card-visa",
      {
        name: "Visa Everyday",
        issuer: "Northlake Bank",
        creditLimit: 2000,
        outstandingBalance: 250,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 25,
        paymentStatus: "due",
      },
      cards,
      [cardPurchase],
      accounts,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.id).toBe("card-visa");
    expect(result.value.name).toBe("Visa Everyday");
    expect(result.value.availableCredit).toBe(1750);
    expect(getCardTransactions([cardPurchase], result.value.id)).toHaveLength(1);
  });
});

describe("managed entity calculation integrity", () => {
  it("includes a created account in net worth assets", () => {
    const created = createAccount(validAccountDraft, accounts);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const before = calculateNetWorth(accounts, cards);
    const after = calculateNetWorth([...accounts, created.value], cards);
    expect(after.assets).toBeCloseTo(before.assets + 500, 2);
    expect(after.liabilities).toBeCloseTo(before.liabilities, 2);
    expect(after.netWorth).toBeCloseTo(before.netWorth + 500, 2);
  });

  it("recalculates utilization and attention after a card edit", () => {
    const edited = updateCard(
      "card-visa",
      {
        name: "Visa Rewards",
        issuer: "Northlake Bank",
        creditLimit: 1000,
        outstandingBalance: 800,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 25,
        paymentStatus: "overdue",
      },
      cards,
      transactions,
      accounts,
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) {
      return;
    }

    const nextCards = cards.map((card) =>
      card.id === "card-visa" ? edited.value : card,
    );
    const [utilization] = calculateCardUtilization(nextCards);
    expect(utilization?.utilization).toBeCloseTo(0.8, 5);
    expect(calculateHighCardUtilization(nextCards)?.cardId).toBe("card-visa");

    const before = listAttentionInsights(accounts, cards, transactions);
    const after = listAttentionInsights(accounts, nextCards, transactions);
    expect(before.some((insight) => insight.kind === "card-payment-due")).toBe(true);
    expect(after.some((insight) => insight.kind === "card-payment-overdue")).toBe(
      true,
    );
    expect(after.some((insight) => insight.kind === "high-card-utilization")).toBe(
      true,
    );
  });
});

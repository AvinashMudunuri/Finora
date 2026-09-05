import { describe, expect, it } from "vitest";
import type { Account, Card, Transaction } from "./types.ts";
import { assertValidFinanceData } from "./validate.ts";

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

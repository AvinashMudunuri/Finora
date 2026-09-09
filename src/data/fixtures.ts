import { HIGH_CARD_UTILIZATION_THRESHOLD } from "../domain/calculations.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { assertValidFinanceData } from "../domain/validate.ts";

export const fixtureAccounts: Account[] = [
  {
    id: "acc-checking",
    name: "Everyday Checking",
    type: "bank",
    balance: 4286.47,
    currency: "USD",
  },
  {
    id: "acc-savings",
    name: "Emergency Savings",
    type: "bank",
    balance: 12450,
    currency: "USD",
  },
  {
    id: "acc-cash",
    name: "Cash",
    type: "cash",
    balance: 180,
    currency: "USD",
  },
  {
    id: "acc-investment",
    name: "Investment Account",
    type: "investment",
    balance: 8420.55,
    currency: "USD",
  },
];

export const fixtureCards: Card[] = [
  {
    id: "card-visa",
    name: "Visa Rewards",
    issuer: "Northlake Bank",
    creditLimit: 5000,
    outstandingBalance: 1842.19,
    availableCredit: 3157.81,
    currency: "USD",
    statementPeriodEnd: "2026-09-08",
    paymentDueDate: "2026-09-22",
    minimumPayment: 35,
    paymentStatus: "due",
  },
  {
    id: "card-amex",
    name: "Amex Everyday",
    issuer: "American Express",
    creditLimit: 2500,
    outstandingBalance: 326.4,
    availableCredit: 2173.6,
    currency: "USD",
    statementPeriodEnd: "2026-09-05",
    paymentDueDate: "2026-09-18",
    minimumPayment: 25,
    paymentStatus: "current",
  },
];

export function cardsWithCurrentPaymentStatus(cards: Card[]): Card[] {
  return cards.map((card) => ({
    ...card,
    paymentStatus: "current",
  }));
}

export function cardsWithVisaOverduePaymentStatus(cards: Card[]): Card[] {
  return cards.map((card) =>
    card.id === "card-visa" ? { ...card, paymentStatus: "overdue" } : card,
  );
}

export function cardsWithHighVisaUtilization(cards: Card[]): Card[] {
  return cards.map((card) => {
    if (card.id !== "card-visa") {
      return card;
    }
    const outstandingBalance = card.creditLimit * HIGH_CARD_UTILIZATION_THRESHOLD;
    return {
      ...card,
      outstandingBalance,
      availableCredit: card.creditLimit - outstandingBalance,
      paymentStatus: "current",
    };
  });
}

export function loadAppCards(): Card[] {
  if (import.meta.env.MODE === "e2e-all-current") {
    return cardsWithCurrentPaymentStatus(fixtureCards);
  }
  if (import.meta.env.MODE === "e2e-overdue") {
    return cardsWithVisaOverduePaymentStatus(fixtureCards);
  }
  if (import.meta.env.MODE === "e2e-high-util") {
    return cardsWithHighVisaUtilization(fixtureCards);
  }
  if (import.meta.env.MODE === "e2e-no-attention") {
    return cardsWithCurrentPaymentStatus(fixtureCards);
  }
  return fixtureCards;
}

export function transactionsWithoutSeptemberIncome(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== "txn-001");
}

export function transactionsWithNeutralSeptemberNetWorth(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(
    (transaction) => transaction.id !== "txn-001" && transaction.id !== "txn-002",
  );
}

export function loadAppTransactions(): Transaction[] {
  if (import.meta.env.MODE === "e2e-nw-decreased") {
    return transactionsWithoutSeptemberIncome(fixtureTransactions);
  }
  if (import.meta.env.MODE === "e2e-nw-unchanged") {
    return transactionsWithNeutralSeptemberNetWorth(fixtureTransactions);
  }
  if (import.meta.env.MODE === "e2e-no-attention") {
    return [];
  }
  return fixtureTransactions;
}

export const fixtureTransactions: Transaction[] = [
  {
    id: "txn-001",
    date: "2026-09-03",
    description: "Payroll — Acme Corp",
    amount: 3200,
    currency: "USD",
    eventType: "income",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: null,
  },
  {
    id: "txn-002",
    date: "2026-09-02",
    description: "Whole Foods Market",
    amount: 87.42,
    currency: "USD",
    eventType: "expense",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: null,
  },
  {
    id: "txn-003",
    date: "2026-09-01",
    description: "Payment — Thank you",
    amount: 250,
    currency: "USD",
    eventType: "card_payment",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: "card-visa",
  },
  {
    id: "txn-004",
    date: "2026-08-31",
    description: "Rent — Oak Street Apt",
    amount: 1850,
    currency: "USD",
    eventType: "expense",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: null,
  },
  {
    id: "txn-005",
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
    id: "txn-006",
    date: "2026-08-29",
    description: "Groceries — Market Hall",
    amount: 42.15,
    currency: "USD",
    eventType: "card_purchase",
    accountId: null,
    counterpartyAccountId: null,
    cardId: "card-amex",
  },
  {
    id: "txn-007",
    date: "2026-08-28",
    description: "Transfer to Emergency Savings",
    amount: 400,
    currency: "USD",
    eventType: "transfer",
    accountId: "acc-checking",
    counterpartyAccountId: "acc-savings",
    cardId: null,
  },
  {
    id: "txn-008",
    date: "2026-08-27",
    description: "Dinner — Riverview",
    amount: 64.8,
    currency: "USD",
    eventType: "card_purchase",
    accountId: null,
    counterpartyAccountId: null,
    cardId: "card-visa",
  },
  {
    id: "txn-009",
    date: "2026-08-26",
    description: "Coffee — Blue Bottle",
    amount: 6.5,
    currency: "USD",
    eventType: "expense",
    accountId: "acc-checking",
    counterpartyAccountId: null,
    cardId: null,
  },
  {
    id: "txn-010",
    date: "2026-08-24",
    description: "Pharmacy — Riverside",
    amount: 22.17,
    currency: "USD",
    eventType: "card_purchase",
    accountId: null,
    counterpartyAccountId: null,
    cardId: "card-visa",
  },
  {
    id: "txn-011",
    date: "2026-08-22",
    description: "ATM withdrawal",
    amount: 80,
    currency: "USD",
    eventType: "transfer",
    accountId: "acc-checking",
    counterpartyAccountId: "acc-cash",
    cardId: null,
  },
  {
    id: "txn-012",
    date: "2026-08-20",
    description: "Streaming — Northlight",
    amount: 15.99,
    currency: "USD",
    eventType: "card_purchase",
    accountId: null,
    counterpartyAccountId: null,
    cardId: "card-visa",
  },
  {
    id: "txn-013",
    date: "2026-08-18",
    description: "Brokerage deposit",
    amount: 250,
    currency: "USD",
    eventType: "transfer",
    accountId: "acc-checking",
    counterpartyAccountId: "acc-investment",
    cardId: null,
  },
  {
    id: "txn-014",
    date: "2026-08-15",
    description: "Interest credit",
    amount: 4.12,
    currency: "USD",
    eventType: "income",
    accountId: "acc-savings",
    counterpartyAccountId: null,
    cardId: null,
  },
  {
    id: "txn-015",
    date: "2026-08-12",
    description: "Dividend — VTI",
    amount: 18.4,
    currency: "USD",
    eventType: "investment",
    accountId: "acc-investment",
    counterpartyAccountId: null,
    cardId: null,
  },
];

assertValidFinanceData(fixtureAccounts, fixtureCards, fixtureTransactions);

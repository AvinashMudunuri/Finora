import type { Account, Card, CurrencyCode, Transaction } from "./types.ts";

export type NetWorthResult = {
  assets: number;
  liabilities: number;
  netWorth: number;
  currency: CurrencyCode;
};

export type CardUtilizationResult = {
  cardId: string;
  outstandingBalance: number;
  creditLimit: number;
  availableCredit: number;
  utilization: number | null;
};

export type MonthlySpendingResult = {
  year: number;
  month: number;
  total: number;
  currency: CurrencyCode;
};

export function isAssetAccount(account: Account): boolean {
  return (
    account.type === "bank" ||
    account.type === "cash" ||
    account.type === "investment"
  );
}

export function calculateNetWorth(
  accounts: Account[],
  cards: Card[],
): NetWorthResult {
  const assets = accounts.reduce((total, account) => {
    return isAssetAccount(account) ? total + account.balance : total;
  }, 0);

  // Cards are the only liability represented in this slice. Credit limits are not liabilities.
  const liabilities = cards.reduce((total, currentCard) => {
    return total + currentCard.outstandingBalance;
  }, 0);

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
    currency: sharedCurrency([
      ...accounts.map((account) => account.currency),
      ...cards.map((currentCard) => currentCard.currency),
    ]),
  };
}

export function calculateCardUtilization(
  cards: Card[],
): CardUtilizationResult[] {
  return cards.map((currentCard) => {
    const availableCredit =
      currentCard.creditLimit <= 0
        ? 0
        : currentCard.creditLimit - currentCard.outstandingBalance;

    return {
      cardId: currentCard.id,
      outstandingBalance: currentCard.outstandingBalance,
      creditLimit: currentCard.creditLimit,
      availableCredit,
      utilization:
        currentCard.creditLimit <= 0
          ? null
          : currentCard.outstandingBalance / currentCard.creditLimit,
    };
  });
}

export function calculateMonthlySpending(
  transactions: Transaction[],
  year: number,
  month: number,
): MonthlySpendingResult {
  const total = transactions.reduce((sum, transaction) => {
    if (!isSpendingEvent(transaction.eventType)) {
      return sum;
    }

    if (!isInMonth(transaction.date, year, month)) {
      return sum;
    }

    return sum + transaction.amount;
  }, 0);

  return {
    year,
    month,
    total,
    currency: sharedCurrency(transactions.map((transaction) => transaction.currency)),
  };
}

export function latestActivityMonth(
  transactions: Transaction[],
): { year: number; month: number } | null {
  const latest = [...transactions].sort((left, right) => {
    if (left.date === right.date) {
      return right.id.localeCompare(left.id);
    }

    return left.date < right.date ? 1 : -1;
  })[0];

  if (!latest) {
    return null;
  }

  return parseYearMonth(latest.date);
}

function isSpendingEvent(eventType: Transaction["eventType"]): boolean {
  return eventType === "expense" || eventType === "card_purchase";
}

function isInMonth(isoDate: string, year: number, month: number): boolean {
  const parsed = parseYearMonth(isoDate);
  return parsed?.year === year && parsed.month === month;
}

function parseYearMonth(
  isoDate: string,
): { year: number; month: number } | null {
  const [year, month] = isoDate.split("-").map(Number);

  if (year === undefined || month === undefined) {
    return null;
  }

  return { year, month };
}

function sharedCurrency(currencies: string[]): CurrencyCode {
  return (currencies[0] as CurrencyCode | undefined) ?? "USD";
}

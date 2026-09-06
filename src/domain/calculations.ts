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

export type AssetBreakdown = {
  bank: number;
  cash: number;
  investment: number;
  total: number;
  liquid: number;
  currency: CurrencyCode;
};

export function calculateAssetBreakdown(accounts: Account[]): AssetBreakdown {
  const bank = accounts.reduce((total, account) => {
    return account.type === "bank" ? total + account.balance : total;
  }, 0);
  const cash = accounts.reduce((total, account) => {
    return account.type === "cash" ? total + account.balance : total;
  }, 0);
  const investment = accounts.reduce((total, account) => {
    return account.type === "investment" ? total + account.balance : total;
  }, 0);

  return {
    bank,
    cash,
    investment,
    total: bank + cash + investment,
    liquid: bank + cash,
    currency: sharedCurrency(accounts.map((account) => account.currency)),
  };
}

export function calculateLiquidAssets(accounts: Account[]): number {
  return calculateAssetBreakdown(accounts).liquid;
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

export const HIGH_CARD_UTILIZATION_THRESHOLD = 0.7;

export type HighCardUtilizationResult = {
  cardId: string;
  utilization: number;
  threshold: number;
  outstandingBalance: number;
  creditLimit: number;
};

export function calculateHighCardUtilization(
  cards: Card[],
): HighCardUtilizationResult | null {
  const order = new Map(cards.map((currentCard, index) => [currentCard.id, index]));
  const qualifying = calculateCardUtilization(cards).filter(
    (result): result is CardUtilizationResult & { utilization: number } =>
      result.utilization !== null &&
      result.utilization >= HIGH_CARD_UTILIZATION_THRESHOLD,
  );

  if (qualifying.length === 0) {
    return null;
  }

  qualifying.sort((left, right) => {
    if (left.utilization !== right.utilization) {
      return right.utilization - left.utilization;
    }

    return (order.get(left.cardId) ?? 0) - (order.get(right.cardId) ?? 0);
  });

  const selected = qualifying[0]!;
  return {
    cardId: selected.cardId,
    utilization: selected.utilization,
    threshold: HIGH_CARD_UTILIZATION_THRESHOLD,
    outstandingBalance: selected.outstandingBalance,
    creditLimit: selected.creditLimit,
  };
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

export function calculateMonthlyIncome(
  transactions: Transaction[],
  year: number,
  month: number,
): MonthlySpendingResult {
  const total = transactions.reduce((sum, transaction) => {
    if (transaction.eventType !== "income") {
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

export type MonthlySavingsResult = {
  year: number;
  month: number;
  income: number;
  spending: number;
  savings: number;
  currency: CurrencyCode;
};

export function calculateMonthlySavings(
  transactions: Transaction[],
  year: number,
  month: number,
): MonthlySavingsResult {
  const income = calculateMonthlyIncome(transactions, year, month);
  const spending = calculateMonthlySpending(transactions, year, month);

  return {
    year,
    month,
    income: income.total,
    spending: spending.total,
    savings: income.total - spending.total,
    currency: income.currency,
  };
}

export function listMonthlyIncomeTransactions(
  transactions: Transaction[],
  year: number,
  month: number,
): Transaction[] {
  return transactions
    .filter(
      (transaction) =>
        transaction.eventType === "income" &&
        isInMonth(transaction.date, year, month),
    )
    .slice()
    .sort(compareNewestFirst);
}

export function listMonthlySpendingTransactions(
  transactions: Transaction[],
  year: number,
  month: number,
): Transaction[] {
  return transactions
    .filter(
      (transaction) =>
        isSpendingEvent(transaction.eventType) &&
        isInMonth(transaction.date, year, month),
    )
    .slice()
    .sort(compareNewestFirst);
}

export type SpendingChangeDirection = "increased" | "decreased" | "unchanged";

export type SpendingChangePeriod = {
  year: number;
  month: number;
};

export type SpendingChangeResult = {
  currentPeriod: SpendingChangePeriod;
  previousPeriod: SpendingChangePeriod;
  currentSpending: number;
  previousSpending: number;
  absoluteChange: number;
  direction: SpendingChangeDirection;
  currency: CurrencyCode;
};

export function calculateSpendingChange(
  transactions: Transaction[],
): SpendingChangeResult | null {
  const currentPeriod = latestActivityMonth(transactions);

  if (!currentPeriod) {
    return null;
  }

  const previousPeriod = previousCalendarMonth(currentPeriod);
  const current = calculateMonthlySpending(
    transactions,
    currentPeriod.year,
    currentPeriod.month,
  );
  const previous = calculateMonthlySpending(
    transactions,
    previousPeriod.year,
    previousPeriod.month,
  );
  const absoluteChange = Math.abs(current.total - previous.total);

  return {
    currentPeriod,
    previousPeriod,
    currentSpending: current.total,
    previousSpending: previous.total,
    absoluteChange,
    direction: spendingChangeDirection(current.total, previous.total),
    currency: current.currency,
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

function previousCalendarMonth(
  period: SpendingChangePeriod,
): SpendingChangePeriod {
  if (period.month === 1) {
    return { year: period.year - 1, month: 12 };
  }

  return { year: period.year, month: period.month - 1 };
}

function spendingChangeDirection(
  currentSpending: number,
  previousSpending: number,
): SpendingChangeDirection {
  if (currentSpending > previousSpending) {
    return "increased";
  }

  if (currentSpending < previousSpending) {
    return "decreased";
  }

  return "unchanged";
}

function compareNewestFirst(left: Transaction, right: Transaction): number {
  if (left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  return right.id.localeCompare(left.id);
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

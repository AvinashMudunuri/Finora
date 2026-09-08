import { getAccountTransactions, signedAmount } from "./finance.ts";
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

export type CardPaymentAttentionStatus = "due" | "overdue";

export type CardPaymentAttentionResult = {
  cardId: string;
  paymentStatus: CardPaymentAttentionStatus;
  paymentDueDate: string;
  minimumPayment: number;
  outstandingBalance: number;
};

export function calculateCardPaymentAttention(
  cards: Card[],
): CardPaymentAttentionResult | null {
  const order = new Map(cards.map((currentCard, index) => [currentCard.id, index]));
  const qualifying = cards.filter(isAttentionPaymentStatus);

  if (qualifying.length === 0) {
    return null;
  }

  qualifying.sort((left, right) => {
    const statusDelta =
      paymentAttentionRank(left.paymentStatus) -
      paymentAttentionRank(right.paymentStatus);
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
  });

  const selected = qualifying[0]!;
  return {
    cardId: selected.id,
    paymentStatus: selected.paymentStatus,
    paymentDueDate: selected.paymentDueDate,
    minimumPayment: selected.minimumPayment,
    outstandingBalance: selected.outstandingBalance,
  };
}

function isAttentionPaymentStatus(
  card: Card,
): card is Card & { paymentStatus: CardPaymentAttentionStatus } {
  return card.paymentStatus === "overdue" || card.paymentStatus === "due";
}

function paymentAttentionRank(status: CardPaymentAttentionStatus): number {
  return status === "overdue" ? 0 : 1;
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

export const SPENDING_CHANGE_DRIVER_LIMIT = 3;

export type SpendingChangeDriver = {
  transactionId: string;
  description: string;
  amount: number;
  period: SpendingChangePeriod;
};

export function listSpendingChangeDrivers(
  transactions: Transaction[],
  change: SpendingChangeResult,
): SpendingChangeDriver[] {
  if (change.direction === "unchanged") {
    return [];
  }

  const period =
    change.direction === "decreased"
      ? change.previousPeriod
      : change.currentPeriod;

  return listMonthlySpendingTransactions(
    transactions,
    period.year,
    period.month,
  )
    .slice()
    .sort(compareSpendingChangeDrivers)
    .slice(0, SPENDING_CHANGE_DRIVER_LIMIT)
    .map((transaction) => ({
      transactionId: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      period,
    }));
}

function compareSpendingChangeDrivers(
  left: Transaction,
  right: Transaction,
): number {
  if (left.amount !== right.amount) {
    return right.amount - left.amount;
  }

  return compareNewestFirst(left, right);
}

export function netWorthImpact(transaction: Transaction): number {
  if (transaction.eventType === "income" || transaction.eventType === "investment") {
    return transaction.amount;
  }

  if (transaction.eventType === "expense" || transaction.eventType === "card_purchase") {
    return -transaction.amount;
  }

  return 0;
}

export type NetWorthChangeResult = {
  currentPeriod: SpendingChangePeriod;
  previousPeriod: SpendingChangePeriod;
  currentNetWorth: number;
  previousNetWorth: number;
  absoluteChange: number;
  direction: SpendingChangeDirection;
  currency: CurrencyCode;
};

export function calculateNetWorthChange(
  accounts: Account[],
  cards: Card[],
  transactions: Transaction[],
): NetWorthChangeResult | null {
  const currentPeriod = latestActivityMonth(transactions);

  if (!currentPeriod) {
    return null;
  }

  const current = calculateNetWorth(accounts, cards);
  const recordedImpact = transactions.reduce((total, transaction) => {
    if (!isInMonth(transaction.date, currentPeriod.year, currentPeriod.month)) {
      return total;
    }

    return total + netWorthImpact(transaction);
  }, 0);
  const previousNetWorth = current.netWorth - recordedImpact;
  const absoluteChange = Math.abs(current.netWorth - previousNetWorth);

  return {
    currentPeriod,
    previousPeriod: previousCalendarMonth(currentPeriod),
    currentNetWorth: current.netWorth,
    previousNetWorth,
    absoluteChange,
    direction: spendingChangeDirection(current.netWorth, previousNetWorth),
    currency: current.currency,
  };
}

export const NET_WORTH_CHANGE_EVIDENCE_LIMIT = 3;

export type NetWorthChangeEvidence = {
  transactionId: string;
  description: string;
  impact: number;
  period: SpendingChangePeriod;
};

export function listNetWorthChangeEvidence(
  transactions: Transaction[],
  change: NetWorthChangeResult,
): NetWorthChangeEvidence[] {
  if (change.direction === "unchanged") {
    return [];
  }

  return transactions
    .filter(
      (transaction) =>
        isInMonth(
          transaction.date,
          change.currentPeriod.year,
          change.currentPeriod.month,
        ) && netWorthImpact(transaction) !== 0,
    )
    .slice()
    .sort(compareNetWorthChangeEvidence)
    .slice(0, NET_WORTH_CHANGE_EVIDENCE_LIMIT)
    .map((transaction) => ({
      transactionId: transaction.id,
      description: transaction.description,
      impact: netWorthImpact(transaction),
      period: change.currentPeriod,
    }));
}

function compareNetWorthChangeEvidence(
  left: Transaction,
  right: Transaction,
): number {
  const leftMagnitude = Math.abs(netWorthImpact(left));
  const rightMagnitude = Math.abs(netWorthImpact(right));

  if (leftMagnitude !== rightMagnitude) {
    return rightMagnitude - leftMagnitude;
  }

  return compareNewestFirst(left, right);
}

export type AccountPeriodActivity = {
  year: number;
  month: number;
  count: number;
  netMovement: number;
  currency: CurrencyCode;
};

export function calculateAccountPeriodActivity(
  transactions: Transaction[],
  accountId: string,
  year: number,
  month: number,
): AccountPeriodActivity {
  const inPeriod = getAccountTransactions(transactions, accountId).filter(
    (transaction) => isInMonth(transaction.date, year, month),
  );
  const netMovement = inPeriod.reduce((total, transaction) => {
    return total + signedAmount(transaction, accountId);
  }, 0);

  return {
    year,
    month,
    count: inPeriod.length,
    netMovement,
    currency: sharedCurrency(inPeriod.map((transaction) => transaction.currency)),
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

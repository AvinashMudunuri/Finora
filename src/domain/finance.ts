import type { Account, AccountType, Card, Transaction } from "./types.ts";

export function cashTotal(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    return account.type === "investment" ? total : total + account.balance;
  }, 0);
}

export function creditOwed(cards: Card[]): number {
  return cards.reduce((total, card) => total + card.outstandingBalance, 0);
}

export function netBalance(accounts: Account[], cards: Card[]): number {
  return cashTotal(accounts) - creditOwed(cards);
}

export function formatCurrency(
  amount: number,
  currency: string,
  signed = false,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(amount);
}

export function transactionDirection(
  transaction: Transaction,
  filterId: string = "all",
): "inflow" | "outflow" {
  if (
    transaction.eventType === "transfer" &&
    filterId === transaction.counterpartyAccountId
  ) {
    return "inflow";
  }

  if (
    transaction.eventType === "income" ||
    transaction.eventType === "investment"
  ) {
    return "inflow";
  }

  return "outflow";
}

export function signedAmount(
  transaction: Transaction,
  filterId: string = "all",
): number {
  return transactionDirection(transaction, filterId) === "outflow"
    ? -transaction.amount
    : transaction.amount;
}

export function getRecentTransactions(
  transactions: Transaction[],
  filterId: string = "all",
  limit = 10,
): Transaction[] {
  const filtered =
    filterId === "all"
      ? transactions
      : transactions.filter((transaction) => {
          return (
            transaction.accountId === filterId ||
            transaction.counterpartyAccountId === filterId ||
            transaction.cardId === filterId
          );
        });

  return [...filtered]
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date < right.date ? 1 : -1;
      }

      return right.id.localeCompare(left.id);
    })
    .slice(0, limit);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function accountTypeLabel(type: AccountType): string {
  if (type === "cash") {
    return "Cash";
  }

  if (type === "investment") {
    return "Investment";
  }

  return "Bank";
}

export function transactionTypeLabel(direction: "inflow" | "outflow"): string {
  return direction === "inflow" ? "Inflow" : "Outflow";
}

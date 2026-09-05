import type { Account, AccountType, Transaction, TransactionType } from "./types.ts";

export function cashTotal(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    return account.type === "credit" ? total : total + account.balance;
  }, 0);
}

export function creditOwed(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    return account.type === "credit" ? total + account.balance : total;
  }, 0);
}

export function netBalance(accounts: Account[]): number {
  return cashTotal(accounts) - creditOwed(accounts);
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

export function signedAmount(transaction: {
  type: TransactionType;
  amount: number;
}): number {
  return transaction.type === "outflow" ? -transaction.amount : transaction.amount;
}

export function getRecentTransactions(
  transactions: Transaction[],
  accountId: string = "all",
  limit = 10,
): Transaction[] {
  const filtered =
    accountId === "all"
      ? transactions
      : transactions.filter((transaction) => transaction.accountId === accountId);

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
  if (type === "credit") {
    return "Credit Card";
  }

  if (type === "savings") {
    return "Savings";
  }

  return "Checking";
}

export function transactionTypeLabel(type: TransactionType): string {
  return type === "inflow" ? "Inflow" : "Outflow";
}

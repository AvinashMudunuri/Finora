import type { Account, Transaction } from "./types.ts";

export function assertValidFinanceData(
  accounts: Account[],
  transactions: Transaction[],
): void {
  const accountIds = new Set<string>();

  for (const account of accounts) {
    if (accountIds.has(account.id)) {
      throw new Error(`Duplicate account id: ${account.id}`);
    }

    accountIds.add(account.id);
  }

  const transactionIds = new Set<string>();

  for (const transaction of transactions) {
    if (transactionIds.has(transaction.id)) {
      throw new Error(`Duplicate transaction id: ${transaction.id}`);
    }

    if (!accountIds.has(transaction.accountId)) {
      throw new Error(
        `Transaction ${transaction.id} references unknown account ${transaction.accountId}`,
      );
    }

    transactionIds.add(transaction.id);
  }
}

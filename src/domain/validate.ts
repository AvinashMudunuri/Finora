import type { Account, Card, Transaction } from "./types.ts";
import { ACCOUNT_TYPES, TRANSACTION_EVENT_TYPES } from "./types.ts";

const ACCOUNT_TYPE_SET = new Set<string>(ACCOUNT_TYPES);
const EVENT_TYPE_SET = new Set<string>(TRANSACTION_EVENT_TYPES);

function assertUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label}: ${id}`);
    }

    seen.add(id);
  }
}

function isClose(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.005;
}

export function assertValidFinanceData(
  accounts: Account[],
  cards: Card[],
  transactions: Transaction[],
): void {
  assertUniqueIds(
    accounts.map((account) => account.id),
    "account id",
  );
  assertUniqueIds(
    cards.map((card) => card.id),
    "card id",
  );
  assertUniqueIds(
    transactions.map((transaction) => transaction.id),
    "transaction id",
  );

  const accountIds = new Set(accounts.map((account) => account.id));
  const cardIds = new Set(cards.map((card) => card.id));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  for (const account of accounts) {
    if (!ACCOUNT_TYPE_SET.has(account.type)) {
      throw new Error(`Invalid account type: ${account.type}`);
    }

    if (!account.currency) {
      throw new Error(`Account ${account.id} is missing a currency`);
    }

    if (!Number.isFinite(account.balance)) {
      throw new Error(`Account ${account.id} has an invalid balance`);
    }
  }

  for (const card of cards) {
    if (!card.name || !card.issuer) {
      throw new Error(`Card ${card.id} is missing identity`);
    }

    if (!card.currency) {
      throw new Error(`Card ${card.id} is missing a currency`);
    }

    if (!(card.creditLimit > 0)) {
      throw new Error(`Card ${card.id} has an invalid credit limit`);
    }

    if (card.outstandingBalance < 0 || card.outstandingBalance > card.creditLimit) {
      throw new Error(`Card ${card.id} has an invalid outstanding balance`);
    }

    if (
      !isClose(
        card.availableCredit,
        card.creditLimit - card.outstandingBalance,
      )
    ) {
      throw new Error(`Card ${card.id} available credit is inconsistent`);
    }
  }

  for (const transaction of transactions) {
    if (!EVENT_TYPE_SET.has(transaction.eventType)) {
      throw new Error(`Invalid event type: ${transaction.eventType}`);
    }

    if (!transaction.currency) {
      throw new Error(`Transaction ${transaction.id} is missing a currency`);
    }

    if (!(transaction.amount > 0) || !Number.isFinite(transaction.amount)) {
      throw new Error(`Transaction ${transaction.id} has an invalid amount`);
    }

    switch (transaction.eventType) {
      case "income":
      case "expense":
        requireAccountOnly(transaction, accountIds);
        break;
      case "investment": {
        requireAccountOnly(transaction, accountIds);
        const account = accountsById.get(transaction.accountId ?? "");
        if (account?.type !== "investment") {
          throw new Error(
            `Transaction ${transaction.id} must belong to an investment account`,
          );
        }
        break;
      }
      case "transfer":
        if (
          !transaction.accountId ||
          !transaction.counterpartyAccountId ||
          transaction.cardId
        ) {
          throw new Error(
            `Transfer ${transaction.id} must reference a source and destination account`,
          );
        }
        if (transaction.accountId === transaction.counterpartyAccountId) {
          throw new Error(`Transfer ${transaction.id} cannot use the same account twice`);
        }
        if (
          !accountIds.has(transaction.accountId) ||
          !accountIds.has(transaction.counterpartyAccountId)
        ) {
          throw new Error(
            `Transaction ${transaction.id} references unknown account`,
          );
        }
        break;
      case "card_purchase":
        if (transaction.accountId || transaction.counterpartyAccountId || !transaction.cardId) {
          throw new Error(
            `Card purchase ${transaction.id} must reference only a card`,
          );
        }
        if (!cardIds.has(transaction.cardId)) {
          throw new Error(
            `Transaction ${transaction.id} references unknown card ${transaction.cardId}`,
          );
        }
        break;
      case "card_payment":
        if (
          !transaction.accountId ||
          !transaction.cardId ||
          transaction.counterpartyAccountId
        ) {
          throw new Error(
            `Card payment ${transaction.id} must reference a funding account and a card`,
          );
        }
        if (!accountIds.has(transaction.accountId)) {
          throw new Error(
            `Transaction ${transaction.id} references unknown account ${transaction.accountId}`,
          );
        }
        if (!cardIds.has(transaction.cardId)) {
          throw new Error(
            `Transaction ${transaction.id} references unknown card ${transaction.cardId}`,
          );
        }
        break;
    }
  }
}

function requireAccountOnly(
  transaction: Transaction,
  accountIds: Set<string>,
): void {
  if (
    !transaction.accountId ||
    transaction.cardId ||
    transaction.counterpartyAccountId
  ) {
    throw new Error(
      `Transaction ${transaction.id} must reference exactly one account`,
    );
  }

  if (!accountIds.has(transaction.accountId)) {
    throw new Error(
      `Transaction ${transaction.id} references unknown account ${transaction.accountId}`,
    );
  }
}

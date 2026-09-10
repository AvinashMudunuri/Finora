import type {
  Account,
  AccountType,
  Card,
  CardPaymentStatus,
  Transaction,
  TransactionEventType,
} from "./types.ts";

export type TransactionListFilter = {
  kind: "all" | "party" | "event";
  id?: string;
  eventType?: TransactionEventType;
  query?: string;
  year?: number;
  month?: number;
};

export type TransactionListContext = {
  accounts?: readonly Account[];
  cards?: readonly Card[];
};

export type TransactionListEmptyReason = "none-stored" | "none-in-period" | "none-match";

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

export function listTransactions(
  transactions: Transaction[],
  filter: TransactionListFilter = { kind: "all" },
  context: TransactionListContext = {},
): Transaction[] {
  return transactions
    .filter((transaction) => matchesTransactionFilter(transaction, filter, context))
    .sort(compareTransactionsNewestFirst);
}

export function transactionListEmptyReason(
  storedCount: number,
  periodCount: number,
  listedCount: number,
  periodSelected: boolean,
): TransactionListEmptyReason | null {
  if (listedCount > 0) {
    return null;
  }

  if (storedCount === 0) {
    return "none-stored";
  }

  if (periodSelected && periodCount === 0) {
    return "none-in-period";
  }

  return "none-match";
}

export function getRecentTransactions(
  transactions: Transaction[],
  filterId: string = "all",
  limit = 10,
): Transaction[] {
  return listTransactions(
    transactions,
    filterId === "all" ? { kind: "all" } : { kind: "party", id: filterId },
  ).slice(0, limit);
}

export function getAccountTransactions(
  transactions: Transaction[],
  accountId: string,
): Transaction[] {
  return listTransactions(transactions).filter(
    (transaction) =>
      transaction.accountId === accountId ||
      transaction.counterpartyAccountId === accountId,
  );
}

export function getCardTransactions(
  transactions: Transaction[],
  cardId: string,
): Transaction[] {
  return listTransactions(transactions).filter(
    (transaction) => transaction.cardId === cardId,
  );
}

export function eventTypeLabel(eventType: TransactionEventType): string {
  if (eventType === "card_purchase") {
    return "Card purchase";
  }

  if (eventType === "card_payment") {
    return "Card payment";
  }

  if (eventType === "income") {
    return "Income";
  }

  if (eventType === "expense") {
    return "Expense";
  }

  if (eventType === "transfer") {
    return "Transfer";
  }

  return "Investment";
}

export function transactionContext(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  cardsById: Map<string, Card>,
): string {
  if (transaction.eventType === "card_purchase" && transaction.cardId) {
    return cardsById.get(transaction.cardId)?.name ?? "Unknown card";
  }

  if (transaction.eventType === "card_payment") {
    const account = transaction.accountId
      ? accountsById.get(transaction.accountId)?.name
      : undefined;
    const card = transaction.cardId
      ? cardsById.get(transaction.cardId)?.name
      : undefined;

    if (account && card) {
      return `${account} → ${card}`;
    }

    return account ?? card ?? "Unknown account";
  }

  if (transaction.eventType === "transfer") {
    const source = transaction.accountId
      ? accountsById.get(transaction.accountId)?.name
      : undefined;
    const destination = transaction.counterpartyAccountId
      ? accountsById.get(transaction.counterpartyAccountId)?.name
      : undefined;

    if (source && destination) {
      return `${source} → ${destination}`;
    }

    return source ?? destination ?? "Unknown account";
  }

  if (transaction.accountId) {
    return accountsById.get(transaction.accountId)?.name ?? "Unknown account";
  }

  if (transaction.cardId) {
    return cardsById.get(transaction.cardId)?.name ?? "Unknown card";
  }

  return "Unknown account";
}

function matchesTransactionFilter(
  transaction: Transaction,
  filter: TransactionListFilter,
  context: TransactionListContext,
): boolean {
  const partyId = filter.id;
  const eventType = filter.eventType;

  if (partyId) {
    const matchesParty =
      transaction.accountId === partyId ||
      transaction.counterpartyAccountId === partyId ||
      transaction.cardId === partyId;
    if (!matchesParty) {
      return false;
    }
  }

  if (eventType && transaction.eventType !== eventType) {
    return false;
  }

  if (
    filter.year !== undefined &&
    filter.month !== undefined &&
    !isTransactionInMonth(transaction.date, filter.year, filter.month)
  ) {
    return false;
  }

  return matchesTransactionQuery(transaction, filter.query, context);
}

function matchesTransactionQuery(
  transaction: Transaction,
  query: string | undefined,
  context: TransactionListContext,
): boolean {
  const needle = query?.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const accounts = context.accounts ?? [];
  const cards = context.cards ?? [];
  const accountNames = [transaction.accountId, transaction.counterpartyAccountId]
    .filter((id): id is string => id !== null)
    .map((id) => accounts.find((account) => account.id === id)?.name ?? "");
  const cardName = transaction.cardId
    ? (cards.find((card) => card.id === transaction.cardId)?.name ?? "")
    : "";

  const haystack = [
    transaction.description,
    transaction.eventType,
    eventTypeLabel(transaction.eventType),
    ...accountNames,
    cardName,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function isTransactionInMonth(isoDate: string, year: number, month: number): boolean {
  const [parsedYear, parsedMonth] = isoDate.split("-").map(Number);
  return parsedYear === year && parsedMonth === month;
}

function compareTransactionsNewestFirst(
  left: Transaction,
  right: Transaction,
): number {
  if (left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  return right.id.localeCompare(left.id);
}

export function paymentStatusLabel(status: CardPaymentStatus): string {
  if (status === "current") {
    return "Current";
  }

  if (status === "due") {
    return "Due";
  }

  return "Overdue";
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

export function formatUtilization(utilization: number | null): string {
  if (utilization === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(utilization);
}

export function formatMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

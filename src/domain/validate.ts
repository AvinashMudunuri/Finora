import type {
  Account,
  AccountDraft,
  Card,
  CardDraft,
  Transaction,
} from "./types.ts";
import {
  ACCOUNT_TYPES,
  CARD_PAYMENT_STATUSES,
  TRANSACTION_EVENT_TYPES,
} from "./types.ts";

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

export type FieldErrors = Record<string, string>;

export type EntityMutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

const ACCOUNT_TYPE_VALUES = new Set<string>(ACCOUNT_TYPES);
const CARD_PAYMENT_STATUS_VALUES = new Set<string>(CARD_PAYMENT_STATUSES);

function nextEntityId(prefix: string, existingIds: readonly string[]): string {
  const used = new Set(existingIds);
  let n = 1;
  let candidate = `${prefix}-${n}`;

  while (used.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${n}`;
  }

  return candidate;
}

function requiredText(value: string, field: string, label: string): string | FieldErrors {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { [field]: `${label} is required.` };
  }
  return trimmed;
}

function parseMoney(
  value: string | number,
  field: string,
  label: string,
): number | FieldErrors {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { [field]: `${label} must be a finite number.` };
    }
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { [field]: `${label} is required.` };
  }

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { [field]: `${label} must be a valid number.` };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { [field]: `${label} must be a finite number.` };
  }

  return parsed;
}

function parseIsoDate(value: string, field: string, label: string): string | FieldErrors {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { [field]: `${label} is required.` };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { [field]: `${label} must be a valid date (YYYY-MM-DD).` };
  }

  const [yearText, monthText, dayText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { [field]: `${label} must be a valid date (YYYY-MM-DD).` };
  }

  return trimmed;
}

function mergeErrors(...parts: Array<string | number | FieldErrors>): FieldErrors {
  const errors: FieldErrors = {};
  for (const part of parts) {
    if (typeof part === "object") {
      Object.assign(errors, part);
    }
  }
  return errors;
}

function ledgerError(error: unknown): FieldErrors {
  if (error instanceof Error && error.message.trim().length > 0) {
    if (/must belong to an investment account/i.test(error.message)) {
      return {
        type: "This account has investment transactions, so its type must stay Investment.",
      };
    }
    return { form: error.message };
  }
  return { form: "The change would produce an invalid financial model." };
}

function buildAccount(
  id: string,
  draft: AccountDraft,
): EntityMutationResult<Account> {
  const name = requiredText(String(draft.name ?? ""), "name", "Account name");
  const balance = parseMoney(draft.balance, "balance", "Account balance");
  const type = String(draft.type ?? "").trim();
  const errors = mergeErrors(
    name,
    balance,
    ACCOUNT_TYPE_VALUES.has(type) ? type : { type: "Account type must be Bank, Cash, or Investment." },
  );

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id,
      name: name as string,
      type: type as Account["type"],
      balance: balance as number,
      currency: "USD",
    },
  };
}

function buildCard(id: string, draft: CardDraft): EntityMutationResult<Card> {
  const name = requiredText(String(draft.name ?? ""), "name", "Card name");
  const issuer = requiredText(String(draft.issuer ?? ""), "issuer", "Issuer");
  const creditLimit = parseMoney(draft.creditLimit, "creditLimit", "Credit limit");
  const outstandingBalance = parseMoney(
    draft.outstandingBalance,
    "outstandingBalance",
    "Outstanding balance",
  );
  const minimumPayment = parseMoney(
    draft.minimumPayment,
    "minimumPayment",
    "Minimum payment",
  );
  const statementPeriodEnd = parseIsoDate(
    String(draft.statementPeriodEnd ?? ""),
    "statementPeriodEnd",
    "Statement end",
  );
  const paymentDueDate = parseIsoDate(
    String(draft.paymentDueDate ?? ""),
    "paymentDueDate",
    "Payment due date",
  );
  const paymentStatus = String(draft.paymentStatus ?? "").trim();
  const errors = mergeErrors(
    name,
    issuer,
    creditLimit,
    outstandingBalance,
    minimumPayment,
    statementPeriodEnd,
    paymentDueDate,
    CARD_PAYMENT_STATUS_VALUES.has(paymentStatus)
      ? paymentStatus
      : { paymentStatus: "Payment status must be Current, Due, or Overdue." },
  );

  if (typeof creditLimit === "number" && !(creditLimit > 0)) {
    errors.creditLimit = "Credit limit must be greater than 0.";
  }

  if (typeof outstandingBalance === "number" && outstandingBalance < 0) {
    errors.outstandingBalance = "Outstanding balance cannot be negative.";
  }

  if (
    typeof creditLimit === "number" &&
    creditLimit > 0 &&
    typeof outstandingBalance === "number" &&
    outstandingBalance > creditLimit
  ) {
    errors.outstandingBalance = "Outstanding balance cannot exceed the credit limit.";
  }

  if (typeof minimumPayment === "number" && minimumPayment < 0) {
    errors.minimumPayment = "Minimum payment cannot be negative.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const limit = creditLimit as number;
  const outstanding = outstandingBalance as number;

  return {
    ok: true,
    value: {
      id,
      name: name as string,
      issuer: issuer as string,
      creditLimit: limit,
      outstandingBalance: outstanding,
      availableCredit: limit - outstanding,
      currency: "USD",
      statementPeriodEnd: statementPeriodEnd as string,
      paymentDueDate: paymentDueDate as string,
      minimumPayment: minimumPayment as number,
      paymentStatus: paymentStatus as Card["paymentStatus"],
    },
  };
}

export function createAccount(
  draft: AccountDraft,
  existing: readonly Account[],
): EntityMutationResult<Account> {
  const id = nextEntityId("acc", existing.map((account) => account.id));
  const built = buildAccount(id, draft);
  if (!built.ok) {
    return built;
  }

  if (existing.some((account) => account.id === built.value.id)) {
    return { ok: false, errors: { form: "Account identifier is already in use." } };
  }

  return built;
}

export function updateAccount(
  id: string,
  draft: AccountDraft,
  existing: readonly Account[],
  transactions: readonly Transaction[] = [],
  cards: readonly Card[] = [],
): EntityMutationResult<Account> {
  if (!id.trim()) {
    return { ok: false, errors: { form: "Account identifier is required." } };
  }

  const current = existing.find((account) => account.id === id);
  if (!current) {
    return { ok: false, errors: { form: "That account no longer exists." } };
  }

  const built = buildAccount(current.id, draft);
  if (!built.ok) {
    return built;
  }

  const nextAccounts = existing.map((account) =>
    account.id === current.id ? built.value : account,
  );

  try {
    assertValidFinanceData([...nextAccounts], [...cards], [...transactions]);
  } catch (error) {
    return { ok: false, errors: ledgerError(error) };
  }

  return built;
}

export function createCard(
  draft: CardDraft,
  existing: readonly Card[],
): EntityMutationResult<Card> {
  const id = nextEntityId("card", existing.map((card) => card.id));
  const built = buildCard(id, draft);
  if (!built.ok) {
    return built;
  }

  if (existing.some((card) => card.id === built.value.id)) {
    return { ok: false, errors: { form: "Card identifier is already in use." } };
  }

  return built;
}

export function updateCard(
  id: string,
  draft: CardDraft,
  existing: readonly Card[],
  transactions: readonly Transaction[] = [],
  accounts: readonly Account[] = [],
): EntityMutationResult<Card> {
  if (!id.trim()) {
    return { ok: false, errors: { form: "Card identifier is required." } };
  }

  const current = existing.find((card) => card.id === id);
  if (!current) {
    return { ok: false, errors: { form: "That card no longer exists." } };
  }

  const built = buildCard(current.id, draft);
  if (!built.ok) {
    return built;
  }

  const nextCards = existing.map((card) => (card.id === current.id ? built.value : card));

  try {
    assertValidFinanceData([...accounts], [...nextCards], [...transactions]);
  } catch (error) {
    return { ok: false, errors: ledgerError(error) };
  }

  return built;
}

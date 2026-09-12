export type CurrencyCode = "USD";

export type AccountType = "bank" | "cash" | "investment";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: CurrencyCode;
};

export type CardPaymentStatus = "current" | "due" | "overdue";

export type Card = {
  id: string;
  name: string;
  issuer: string;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  currency: CurrencyCode;
  statementPeriodEnd: string;
  paymentDueDate: string;
  minimumPayment: number;
  paymentStatus: CardPaymentStatus;
};

export type TransactionEventType =
  | "income"
  | "expense"
  | "transfer"
  | "card_purchase"
  | "card_payment"
  | "investment";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  eventType: TransactionEventType;
  accountId: string | null;
  counterpartyAccountId: string | null;
  cardId: string | null;
};

export const ACCOUNT_TYPES: readonly AccountType[] = [
  "bank",
  "cash",
  "investment",
];

export const CARD_PAYMENT_STATUSES: readonly CardPaymentStatus[] = [
  "current",
  "due",
  "overdue",
];

export const TRANSACTION_EVENT_TYPES: readonly TransactionEventType[] = [
  "income",
  "expense",
  "transfer",
  "card_purchase",
  "card_payment",
  "investment",
];

export type AccountDraft = {
  name: string;
  type: string;
  balance: string | number;
};

export type CardDraft = {
  name: string;
  issuer: string;
  creditLimit: string | number;
  outstandingBalance: string | number;
  statementPeriodEnd: string;
  paymentDueDate: string;
  minimumPayment: string | number;
  paymentStatus: string;
};

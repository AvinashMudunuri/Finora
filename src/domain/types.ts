export type AccountType = "checking" | "savings" | "credit";

export type CurrencyCode = "USD";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: CurrencyCode;
};

export type TransactionType = "inflow" | "outflow";

export type Transaction = {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
};

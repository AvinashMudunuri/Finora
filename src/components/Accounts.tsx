import { useMemo, useState, type FormEvent } from "react";
import {
  calculateAccountPeriodActivity,
  isAssetAccount,
  latestActivityMonth,
  type AccountPeriodActivity,
} from "../domain/calculations.ts";
import {
  accountTypeLabel,
  eventTypeLabel,
  formatCurrency,
  formatDate,
  formatMonth,
  getAccountTransactions,
  signedAmount,
  transactionContext,
} from "../domain/finance.ts";
import type { Account, AccountDraft, Card, Transaction } from "../domain/types.ts";
import { ACCOUNT_TYPES } from "../domain/types.ts";
import type { EntityMutationResult, FieldErrors } from "../domain/validate.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type AccountsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount?: (draft: AccountDraft) => EntityMutationResult<Account>;
  onUpdateAccount?: (
    id: string,
    draft: AccountDraft,
  ) => EntityMutationResult<Account>;
  onShowDashboard?: () => void;
  onShowCards?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onShowInsights?: () => void;
  onOpenTransaction?: (transactionId: string) => void;
};

export function Accounts({
  accounts,
  cards,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
  onUpdateAccount,
  onShowDashboard,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowInsights,
  onOpenTransaction,
}: AccountsProps) {
  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]));
  }, [cards]);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedTransactions = selectedAccount
    ? getAccountTransactions(transactions, selectedAccount.id)
    : [];
  const activityMonth = latestActivityMonth(transactions);
  const selectedPeriodActivity =
    selectedAccount && activityMonth
      ? calculateAccountPeriodActivity(
          transactions,
          selectedAccount.id,
          activityMonth.year,
          activityMonth.month,
        )
      : null;

  return (
    <div className="app-shell">
      <SiteHeader
        current="accounts"
        onShowDashboard={() => {
          onShowDashboard?.();
        }}
        onShowAccounts={() => undefined}
        onShowCards={() => {
          onShowCards?.();
        }}
        onShowTransactions={() => {
          onShowTransactions?.();
        }}
        onShowSpending={() => {
          onShowSpending?.();
        }}
        onShowInsights={() => {
          onShowInsights?.();
        }}
      />

      <main className="page">
        <div className="page-intro">
          <h1>Accounts</h1>
          <p className="page-lede">
            The bank, cash, and investment positions in this snapshot.
          </p>
        </div>

        <section className="panel" aria-labelledby="accounts-list-heading">
          <div className="panel-header">
            <h2 id="accounts-list-heading">Your accounts</h2>
            <p className="panel-copy">
              Stored balances and types. Selecting an account shows its related
              transactions.
            </p>
          </div>

          {accounts.length === 0 ? (
            <p className="empty-state">No accounts in this snapshot.</p>
          ) : (
            <ul className="account-grid card-list-grid">
              {accounts.map((account) => {
                const selected = account.id === selectedAccountId;

                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      className={
                        selected
                          ? "account-card account-card-button is-selected"
                          : "account-card account-card-button"
                      }
                      aria-pressed={selected}
                      onClick={() => {
                        onSelectAccount(account.id);
                      }}
                    >
                      <div className="account-card-top">
                        <h3>{account.name}</h3>
                        <p className="account-type">
                          {accountTypeLabel(account.type)}
                        </p>
                      </div>
                      <p className="account-balance">
                        {formatCurrency(account.balance, account.currency)}
                      </p>
                      <p className="account-note">
                        {account.type === "investment"
                          ? `Current value · ${account.currency}`
                          : `Available balance · ${account.currency}`}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {onCreateAccount || onUpdateAccount ? (
          <AccountManagement
            accounts={accounts}
            selectedAccount={selectedAccount}
            onCreateAccount={onCreateAccount}
            onUpdateAccount={onUpdateAccount}
          />
        ) : null}

        {selectedAccount ? (
          <AccountDetail
            account={selectedAccount}
            transactions={selectedTransactions}
            periodActivity={selectedPeriodActivity}
            activityMonth={activityMonth}
            accountsById={accountsById}
            cardsById={cardsById}
            onOpenTransaction={onOpenTransaction}
          />
        ) : (
          <section className="panel">
            <p className="empty-state">Select an account to see its details.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function AccountDetail({
  account,
  transactions,
  periodActivity,
  activityMonth,
  accountsById,
  cardsById,
  onOpenTransaction,
}: {
  account: Account;
  transactions: Transaction[];
  periodActivity: AccountPeriodActivity | null;
  activityMonth: { year: number; month: number } | null;
  accountsById: Map<string, Account>;
  cardsById: Map<string, Card>;
  onOpenTransaction?: (transactionId: string) => void;
}) {
  const headingId = `${account.id}-detail-heading`;
  const periodHeadingId = `${account.id}-period-heading`;

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>{account.name}</h2>
        <p className="panel-copy">
          {accountTypeLabel(account.type)} · {account.currency}
        </p>
      </div>

      <dl className="card-metrics">
        <div>
          <dt>Type</dt>
          <dd>{accountTypeLabel(account.type)}</dd>
        </div>
        <div>
          <dt>
            {account.type === "investment" ? "Current value" : "Balance"}
          </dt>
          <dd>{formatCurrency(account.balance, account.currency)}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{account.currency}</dd>
        </div>
        <div>
          <dt>Net worth</dt>
          <dd>
            {isAssetAccount(account)
              ? "Included as an asset"
              : "Not included as an asset"}
          </dd>
        </div>
      </dl>

      <section className="card-transactions" aria-labelledby={periodHeadingId}>
        <h3 id={periodHeadingId}>Selected period</h3>
        {activityMonth && periodActivity ? (
          <>
            <p className="panel-copy">
              {formatMonth(activityMonth.year, activityMonth.month)}
            </p>
            <dl className="card-metrics">
              <div>
                <dt>
                  {account.type === "investment" ? "Current value" : "Current balance"}
                </dt>
                <dd>{formatCurrency(account.balance, account.currency)}</dd>
              </div>
              <div>
                <dt>Activity this period</dt>
                <dd>
                  {periodActivity.count === 1
                    ? "1 transaction"
                    : `${periodActivity.count} transactions`}
                </dd>
              </div>
              <div>
                <dt>Net movement this period</dt>
                <dd>
                  {formatCurrency(
                    periodActivity.netMovement,
                    periodActivity.currency,
                    periodActivity.netMovement !== 0,
                  )}
                </dd>
              </div>
            </dl>
            <p className="panel-copy">
              Activity uses the same account relationships and signed amounts as
              the transaction list.
            </p>
          </>
        ) : (
          <p className="empty-state">No transactions in this snapshot</p>
        )}
      </section>

      <section
        className="card-transactions"
        aria-labelledby={`${account.id}-transactions-heading`}
      >
        <h3 id={`${account.id}-transactions-heading`}>Account transactions</h3>
        <p className="panel-copy">
          Events linked to this account by an explicit account relationship.
        </p>

        {transactions.length === 0 ? (
          <p className="empty-state">No transactions for this account.</p>
        ) : (
          <ol className="transaction-list">
            {transactions.map((transaction) => {
              const amount = signedAmount(transaction, account.id);
              const row = (
                <>
                  <div className="transaction-main">
                    <p className="transaction-description">
                      {transaction.description}
                    </p>
                    <p className="transaction-meta">
                      <span>
                        {transactionContext(
                          transaction,
                          accountsById,
                          cardsById,
                        )}
                      </span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={transaction.date}>
                        {formatDate(transaction.date)}
                      </time>
                    </p>
                  </div>
                  <div className="transaction-aside">
                    <p
                      className={
                        amount < 0
                          ? "transaction-amount is-outflow"
                          : "transaction-amount is-inflow"
                      }
                    >
                      {formatCurrency(amount, transaction.currency, true)}
                    </p>
                    <p className="transaction-type">
                      {eventTypeLabel(transaction.eventType)}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={transaction.id}>
                  {onOpenTransaction ? (
                    <button
                      type="button"
                      className="transaction-row transaction-row-button"
                      aria-label={`View ${transaction.description}`}
                      onClick={() => {
                        onOpenTransaction(transaction.id);
                      }}
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="transaction-row">{row}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}

type AccountFormMode = "closed" | "create" | "edit";

function emptyAccountDraft(): AccountDraft {
  return {
    name: "",
    type: "bank",
    balance: "",
  };
}

function draftFromAccount(account: Account): AccountDraft {
  return {
    name: account.name,
    type: account.type,
    balance: String(account.balance),
  };
}

function AccountManagement({
  accounts,
  selectedAccount,
  onCreateAccount,
  onUpdateAccount,
}: {
  accounts: Account[];
  selectedAccount: Account | null;
  onCreateAccount?: (draft: AccountDraft) => EntityMutationResult<Account>;
  onUpdateAccount?: (
    id: string,
    draft: AccountDraft,
  ) => EntityMutationResult<Account>;
}) {
  const [mode, setMode] = useState<AccountFormMode>("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const editingAccount =
    accounts.find((account) => account.id === editingId) ?? selectedAccount;

  const headingId = "account-management-heading";
  const canCreate = Boolean(onCreateAccount);
  const canEdit = Boolean(onUpdateAccount && selectedAccount);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result =
      mode === "create"
        ? onCreateAccount?.(draft)
        : editingId
          ? onUpdateAccount?.(editingId, draft)
          : undefined;

    if (!result) {
      return;
    }

    if (!result.ok) {
      setErrors(result.errors);
      setNotice("");
      return;
    }

    setErrors({});
    setNotice(mode === "create" ? "Account created." : "Account updated.");
    setMode("closed");
    setEditingId(null);
    setDraft(emptyAccountDraft());
  };

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>Manage accounts</h2>
        <p className="panel-copy">
          Create or edit the bank, cash, and investment positions already
          represented in this snapshot. Existing transactions keep their account
          relationships.
        </p>
      </div>

      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="form-actions">
        {canCreate ? (
          <button
            type="button"
            className="form-action"
            onClick={() => {
              setMode("create");
              setEditingId(null);
              setDraft(emptyAccountDraft());
              setErrors({});
              setNotice("");
            }}
          >
            Add account
          </button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            className="form-action-secondary"
            onClick={() => {
              setMode("edit");
              setEditingId(selectedAccount!.id);
              setDraft(draftFromAccount(selectedAccount!));
              setErrors({});
              setNotice("");
            }}
          >
            Edit this account
          </button>
        ) : null}
      </div>

      {mode !== "closed" ? (
        <form className="entity-form" onSubmit={submit} noValidate>
          <p className="panel-copy">
            {mode === "create"
              ? "New accounts receive a generated identifier. Currency stays USD."
              : `Editing ${editingAccount?.name ?? "this account"} keeps its identifier (${editingAccount?.id ?? ""}).`}
          </p>
          {errors.form ? (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="account-name">Account name</label>
            <input
              id="account-name"
              name="account-name"
              value={String(draft.name)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "account-name-error" : undefined}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value });
              }}
            />
            {errors.name ? (
              <p id="account-name-error" className="field-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>
          <fieldset className="field">
            <legend>Account type</legend>
            <div className="choice-row">
              {ACCOUNT_TYPES.map((type) => (
                <label key={type} className="choice">
                  <input
                    type="radio"
                    name="account-type"
                    value={type}
                    checked={draft.type === type}
                    onChange={() => {
                      setDraft({ ...draft, type });
                    }}
                  />
                  {accountTypeLabel(type)}
                </label>
              ))}
            </div>
            {errors.type ? (
              <p className="field-error" role="alert">
                {errors.type}
              </p>
            ) : null}
          </fieldset>
          <div className="field">
            <label htmlFor="account-balance">Account balance</label>
            <input
              id="account-balance"
              name="account-balance"
              inputMode="decimal"
              value={String(draft.balance)}
              aria-invalid={Boolean(errors.balance)}
              aria-describedby={
                errors.balance ? "account-balance-error" : undefined
              }
              onChange={(event) => {
                setDraft({ ...draft, balance: event.target.value });
              }}
            />
            {errors.balance ? (
              <p id="account-balance-error" className="field-error" role="alert">
                {errors.balance}
              </p>
            ) : null}
          </div>
          <div className="form-actions">
            <button type="submit" className="form-action">
              {mode === "create" ? "Save new account" : "Save account changes"}
            </button>
            <button
              type="button"
              className="form-action-secondary"
              onClick={() => {
                setMode("closed");
                setEditingId(null);
                setErrors({});
              }}
            >
              Cancel account form
            </button>
          </div>
        </form>
      ) : accounts.length === 0 ? (
        <p className="empty-state">Add an account to start this snapshot.</p>
      ) : null}
    </section>
  );
}

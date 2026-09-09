import { useMemo } from "react";
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
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type AccountsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
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

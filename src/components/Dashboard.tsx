import { useMemo, useState } from "react";
import {
  accountTypeLabel,
  cashTotal,
  creditOwed,
  formatCurrency,
  formatDate,
  getRecentTransactions,
  netBalance,
  signedAmount,
  transactionTypeLabel,
} from "../domain/finance.ts";
import type { Account, Transaction } from "../domain/types.ts";

export type DashboardProps = {
  accounts: Account[];
  transactions: Transaction[];
};

export function Dashboard({ accounts, transactions }: DashboardProps) {
  const [accountFilter, setAccountFilter] = useState("all");

  const recentTransactions = useMemo(
    () => getRecentTransactions(transactions, accountFilter),
    [accountFilter, transactions],
  );

  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const currency = accounts[0]?.currency ?? "USD";
  const net = netBalance(accounts);
  const cash = cashTotal(accounts);
  const credit = creditOwed(accounts);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <p className="brand-name">Finora</p>
          <p className="brand-tagline">Your financial life, clearly connected</p>
        </div>
      </header>

      <main className="page">
        <div className="page-intro">
          <h1>Dashboard</h1>
          <p className="page-lede">
            How much you have, where it sits, and what moved recently.
          </p>
        </div>

        <section className="panel" aria-labelledby="overview-heading">
          <div className="panel-header">
            <h2 id="overview-heading">Overview</h2>
            <p className="panel-copy">
              Credit card balances are amounts owed, so they reduce the net
              total instead of being added to cash.
            </p>
          </div>

          {accounts.length === 0 ? (
            <p className="empty-state">No accounts to summarize yet.</p>
          ) : (
            <div className="overview-grid">
              <article className="stat-card stat-card-primary">
                <h3>Net balance</h3>
                <p className="stat-value">{formatCurrency(net, currency)}</p>
                <p className="stat-note">Cash minus credit card balances</p>
              </article>
              <article className="stat-card">
                <h3>Cash</h3>
                <p className="stat-value">{formatCurrency(cash, currency)}</p>
                <p className="stat-note">Checking and savings</p>
              </article>
              <article className="stat-card">
                <h3>Credit cards</h3>
                <p className="stat-value stat-value-negative">
                  {formatCurrency(-credit, currency, credit !== 0)}
                </p>
                <p className="stat-note">Current balances owed</p>
              </article>
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="accounts-heading">
          <div className="panel-header">
            <h2 id="accounts-heading">Accounts</h2>
            <p className="panel-copy">
              The accounts currently included in this snapshot.
            </p>
          </div>

          {accounts.length === 0 ? (
            <p className="empty-state">No accounts yet.</p>
          ) : (
            <ul className="account-grid">
              {accounts.map((account) => (
                <li key={account.id}>
                  <article
                    className={
                      account.type === "credit"
                        ? "account-card account-card-credit"
                        : "account-card"
                    }
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
                      {account.type === "credit"
                        ? `Amount owed · ${account.currency}`
                        : `Available balance · ${account.currency}`}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="transactions-heading">
          <div className="panel-header">
            <h2 id="transactions-heading">Recent transactions</h2>
            <p className="panel-copy">
              Newest activity first. Filter by account to focus the list.
            </p>
          </div>

          <div
            className="filters"
            role="group"
            aria-label="Filter transactions by account"
          >
            <button
              type="button"
              className={accountFilter === "all" ? "filter-chip is-active" : "filter-chip"}
              aria-pressed={accountFilter === "all"}
              onClick={() => {
                setAccountFilter("all");
              }}
            >
              All accounts
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={
                  accountFilter === account.id
                    ? "filter-chip is-active"
                    : "filter-chip"
                }
                aria-pressed={accountFilter === account.id}
                onClick={() => {
                  setAccountFilter(account.id);
                }}
              >
                {account.name}
              </button>
            ))}
          </div>

          {recentTransactions.length === 0 ? (
            <p className="empty-state">
              {accountFilter === "all"
                ? "No recent transactions."
                : "No recent transactions for this account."}
            </p>
          ) : (
            <ol className="transaction-list">
              {recentTransactions.map((transaction) => {
                const account = accountsById.get(transaction.accountId);
                const amount = signedAmount(transaction);

                return (
                  <li key={transaction.id} className="transaction-row">
                    <div className="transaction-main">
                      <p className="transaction-description">
                        {transaction.description}
                      </p>
                      <p className="transaction-meta">
                        <span>{account?.name ?? "Unknown account"}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={transaction.date}>
                          {formatDate(transaction.date)}
                        </time>
                      </p>
                    </div>
                    <div className="transaction-aside">
                      <p
                        className={
                          transaction.type === "inflow"
                            ? "transaction-amount is-inflow"
                            : "transaction-amount is-outflow"
                        }
                      >
                        {formatCurrency(amount, account?.currency ?? currency, true)}
                      </p>
                      <p className="transaction-type">
                        {transactionTypeLabel(transaction.type)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

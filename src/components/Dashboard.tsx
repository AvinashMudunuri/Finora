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
  transactionDirection,
  transactionTypeLabel,
} from "../domain/finance.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";

export type DashboardProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
};

export function Dashboard({ accounts, cards, transactions }: DashboardProps) {
  const [accountFilter, setAccountFilter] = useState("all");

  const recentTransactions = useMemo(
    () => getRecentTransactions(transactions, accountFilter),
    [accountFilter, transactions],
  );

  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]));
  }, [cards]);

  const currency = accounts[0]?.currency ?? cards[0]?.currency ?? "USD";
  const net = netBalance(accounts, cards);
  const cash = cashTotal(accounts);
  const credit = creditOwed(cards);

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

          {accounts.length === 0 && cards.length === 0 ? (
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
                <p className="stat-note">Bank and cash accounts</p>
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

          {accounts.length === 0 && cards.length === 0 ? (
            <p className="empty-state">No accounts yet.</p>
          ) : (
            <ul className="account-grid">
              {accounts.map((account) => (
                <li key={account.id}>
                  <article className="account-card">
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
                  </article>
                </li>
              ))}
              {cards.map((card) => (
                <li key={card.id}>
                  <article className="account-card account-card-credit">
                    <div className="account-card-top">
                      <h3>{card.name}</h3>
                      <p className="account-type">Credit Card</p>
                    </div>
                    <p className="account-balance">
                      {formatCurrency(card.outstandingBalance, card.currency)}
                    </p>
                    <p className="account-note">
                      Amount owed · {card.currency}
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
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={
                  accountFilter === card.id
                    ? "filter-chip is-active"
                    : "filter-chip"
                }
                aria-pressed={accountFilter === card.id}
                onClick={() => {
                  setAccountFilter(card.id);
                }}
              >
                {card.name}
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
                const direction = transactionDirection(transaction, accountFilter);
                const amount = signedAmount(transaction, accountFilter);

                return (
                  <li key={transaction.id} className="transaction-row">
                    <div className="transaction-main">
                      <p className="transaction-description">
                        {transaction.description}
                      </p>
                      <p className="transaction-meta">
                        <span>
                          {transactionPartyName(
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
                          direction === "inflow"
                            ? "transaction-amount is-inflow"
                            : "transaction-amount is-outflow"
                        }
                      >
                        {formatCurrency(
                          amount,
                          transaction.currency,
                          true,
                        )}
                      </p>
                      <p className="transaction-type">
                        {transactionTypeLabel(direction)}
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

function transactionPartyName(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  cardsById: Map<string, Card>,
): string {
  if (transaction.eventType === "card_purchase" && transaction.cardId) {
    return cardsById.get(transaction.cardId)?.name ?? "Unknown card";
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

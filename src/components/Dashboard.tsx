import { useMemo, useState } from "react";
import {
  calculateAssetBreakdown,
  calculateCardUtilization,
  calculateMonthlySavings,
  calculateNetWorth,
  calculateNetWorthChange,
  latestActivityMonth,
  listMonthlyNetWorthHistory,
  listRecentMonthlyFlows,
} from "../domain/calculations.ts";
import { netWorthChangeDirectionLabel } from "../domain/insights.ts";
import { AttentionInsights } from "./AttentionInsights.tsx";
import {
  accountTypeLabel,
  formatCurrency,
  formatDate,
  formatMonth,
  formatUtilization,
  getRecentTransactions,
  paymentStatusLabel,
  signedAmount,
  transactionContext,
  transactionDirection,
  transactionTypeLabel,
} from "../domain/finance.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type DashboardProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onShowCards?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onShowAccounts?: () => void;
  onOpenCard?: (cardId: string) => void;
  onOpenAccount?: (accountId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
  onShowInsights?: () => void;
};

export function Dashboard({
  accounts,
  cards,
  transactions,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowAccounts,
  onOpenCard,
  onOpenAccount,
  onOpenTransaction,
  onShowInsights,
}: DashboardProps) {
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

  const worth = calculateNetWorth(accounts, cards);
  const assets = calculateAssetBreakdown(accounts);
  const activityMonth = latestActivityMonth(transactions);
  const selectedYear = activityMonth?.year ?? 0;
  const selectedMonth = activityMonth?.month ?? 1;
  const monthlyFlow = calculateMonthlySavings(
    transactions,
    selectedYear,
    selectedMonth,
  );
  const cardUtilization = useMemo(() => {
    return new Map(
      calculateCardUtilization(cards).map((result) => [result.cardId, result]),
    );
  }, [cards]);
  const netWorthChange = calculateNetWorthChange(accounts, cards, transactions);
  const netWorthHistory = listMonthlyNetWorthHistory(
    accounts,
    cards,
    transactions,
  );
  const monthlyHistory = listRecentMonthlyFlows(transactions);

  return (
    <div className="app-shell">
      <SiteHeader
        current="dashboard"
        onShowDashboard={() => undefined}
        onShowAccounts={() => {
          onShowAccounts?.();
        }}
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
          <h1>Dashboard</h1>
          <p className="page-lede">
            How much you have, where it sits, and what moved recently.
          </p>
        </div>

        <section className="panel" aria-labelledby="overview-heading">
          <div className="panel-header">
            <h2 id="overview-heading">Overview</h2>
            <p className="panel-copy">
              Net worth is assets minus liabilities. Assets are bank, cash, and
              investment balances. Liabilities are card balances owed.
            </p>
          </div>

          {accounts.length === 0 && cards.length === 0 ? (
            <p className="empty-state">No accounts to summarize yet.</p>
          ) : (
            <div className="overview-grid">
              <article className="stat-card stat-card-primary">
                <h3>Net worth</h3>
                <p className="stat-value">
                  {formatCurrency(worth.netWorth, worth.currency)}
                </p>
                <p className="stat-note">
                  {formatCurrency(worth.assets, worth.currency)} assets −{" "}
                  {formatCurrency(worth.liabilities, worth.currency)} liabilities
                </p>
                <p className="stat-note stat-note-quiet">Assets − liabilities</p>
                {netWorthChange ? (
                  <dl className="position-breakdown">
                    <div>
                      <dt>Previous</dt>
                      <dd>
                        {formatCurrency(
                          netWorthChange.previousNetWorth,
                          netWorthChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Change</dt>
                      <dd className="stat-change">
                        {formatCurrency(
                          netWorthChange.direction === "decreased"
                            ? -netWorthChange.absoluteChange
                            : netWorthChange.absoluteChange,
                          netWorthChange.currency,
                          netWorthChange.direction !== "unchanged",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Direction</dt>
                      <dd>
                        {netWorthChangeDirectionLabel(netWorthChange.direction)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="stat-note">
                    No recorded activity month to compare.
                  </p>
                )}
              </article>
              <article className="stat-card">
                <h3>Assets</h3>
                <p className="stat-value">
                  {formatCurrency(assets.total, assets.currency)}
                </p>
                <dl className="position-breakdown">
                  <div>
                    <dt>Bank</dt>
                    <dd>{formatCurrency(assets.bank, assets.currency)}</dd>
                  </div>
                  <div>
                    <dt>Cash</dt>
                    <dd>{formatCurrency(assets.cash, assets.currency)}</dd>
                  </div>
                  <div data-item="investment">
                    <dt>Investment</dt>
                    <dd>{formatCurrency(assets.investment, assets.currency)}</dd>
                  </div>
                  <div>
                    <dt>Liquid</dt>
                    <dd>{formatCurrency(assets.liquid, assets.currency)}</dd>
                  </div>
                </dl>
                <p className="stat-note">
                  Liquid is bank + cash. Investments are assets, not liquid
                  cash.
                </p>
                {onShowAccounts ? (
                  <button
                    type="button"
                    className="inline-action"
                    onClick={onShowAccounts}
                  >
                    View accounts
                  </button>
                ) : null}
              </article>
              <article className="stat-card">
                <h3>Liabilities</h3>
                <p className="stat-value stat-value-negative">
                  {formatCurrency(
                    -worth.liabilities,
                    worth.currency,
                    worth.liabilities !== 0,
                  )}
                </p>
                <dl className="position-breakdown">
                  <div>
                    <dt>Cards</dt>
                    <dd>{formatCurrency(worth.liabilities, worth.currency)}</dd>
                  </div>
                </dl>
                <p className="stat-note">Current card balances owed</p>
                {onShowCards ? (
                  <button
                    type="button"
                    className="inline-action"
                    onClick={onShowCards}
                  >
                    View cards
                  </button>
                ) : null}
              </article>
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="net-worth-history-heading">
          <div className="panel-header">
            <h2 id="net-worth-history-heading">Net worth history</h2>
            <p className="panel-copy">
              End-of-month net worth for each stored activity month, rewound
              from the current snapshot using recorded movements.
            </p>
          </div>

          {netWorthHistory.length === 0 ? (
            <p className="empty-state">
              No stored activity months to derive a history from.
            </p>
          ) : (
            <table className="history-table">
              <caption>Monthly net worth</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Net worth</th>
                </tr>
              </thead>
              <tbody>
                {netWorthHistory.map((point) => (
                  <tr key={`${point.year}-${point.month}`}>
                    <th scope="row">{formatMonth(point.year, point.month)}</th>
                    <td>{formatCurrency(point.netWorth, point.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel" aria-labelledby="monthly-flow-heading">
          <div className="panel-header">
            <h2 id="monthly-flow-heading">Monthly flow</h2>
            <p className="panel-copy">
              {activityMonth
                ? formatMonth(activityMonth.year, activityMonth.month)
                : "No transactions in this snapshot"}
            </p>
          </div>

          <div className="overview-grid">
            <article className="stat-card">
              <h3>Income</h3>
              <p className="stat-value">
                {formatCurrency(monthlyFlow.income, monthlyFlow.currency)}
              </p>
            </article>
            <article className="stat-card">
              <h3>Spending</h3>
              <p className="stat-value">
                {formatCurrency(monthlyFlow.spending, monthlyFlow.currency)}
              </p>
              {onShowSpending ? (
                <button
                  type="button"
                  className="inline-action"
                  onClick={onShowSpending}
                >
                  View spending
                </button>
              ) : null}
            </article>
            <article className="stat-card">
              <h3>Savings</h3>
              <p
                className={
                  monthlyFlow.savings < 0
                    ? "stat-value stat-value-negative"
                    : "stat-value"
                }
              >
                {formatCurrency(monthlyFlow.savings, monthlyFlow.currency)}
              </p>
              <p className="stat-note">Income − spending</p>
            </article>
          </div>
        </section>

        <section className="panel" aria-labelledby="monthly-history-heading">
          <div className="panel-header">
            <h2 id="monthly-history-heading">Recent months</h2>
            <p className="panel-copy">
              Income, spending, and savings for each stored activity month,
              using the same monthly calculations as this dashboard.
            </p>
          </div>

          {monthlyHistory.length === 0 ? (
            <p className="empty-state">
              No stored activity months to compare income, spending, and savings.
            </p>
          ) : (
            <table className="history-table">
              <caption>Monthly income, spending, and savings</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Income</th>
                  <th scope="col">Spending</th>
                  <th scope="col">Savings</th>
                </tr>
              </thead>
              <tbody>
                {monthlyHistory.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <th scope="row">{formatMonth(row.year, row.month)}</th>
                    <td>{formatCurrency(row.income, row.currency)}</td>
                    <td>{formatCurrency(row.spending, row.currency)}</td>
                    <td>{formatCurrency(row.savings, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel" aria-labelledby="attention-heading">
          <div className="panel-header">
            <h2 id="attention-heading">Attention</h2>
            <p className="panel-copy">
              What deserves inspection from stored records, using the same
              attention list as Insights. No recommendations are invented.
            </p>
          </div>
          <AttentionInsights
            accounts={accounts}
            cards={cards}
            transactions={transactions}
            onOpenCard={onOpenCard}
            onOpenTransaction={onOpenTransaction}
            onShowSpending={onShowSpending}
          />
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
              {accounts.map((account) => {
                const accountBody = (
                  <>
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
                  </>
                );

                return (
                  <li key={account.id}>
                    {onOpenAccount ? (
                      <button
                        type="button"
                        className="account-card account-card-button"
                        aria-label={`View ${account.name}`}
                        onClick={() => {
                          onOpenAccount(account.id);
                        }}
                      >
                        {accountBody}
                      </button>
                    ) : (
                      <article className="account-card">{accountBody}</article>
                    )}
                  </li>
                );
              })}
              {cards.map((card) => {
                const cardBody = (
                  <>
                    <div className="account-card-top">
                      <h3>{card.name}</h3>
                      <p className="account-type">Credit Card</p>
                    </div>
                    <p className="account-balance">
                      {formatCurrency(card.outstandingBalance, card.currency)}
                    </p>
                    <p className="account-note">
                      {formatUtilization(
                        cardUtilization.get(card.id)?.utilization ?? null,
                      )}{" "}
                      utilized · {card.currency}
                    </p>
                    <p className="account-note">
                      {paymentStatusLabel(card.paymentStatus)} · min{" "}
                      {formatCurrency(card.minimumPayment, card.currency)}
                    </p>
                  </>
                );

                return (
                  <li key={card.id}>
                    {onOpenCard ? (
                      <button
                        type="button"
                        className="account-card account-card-credit account-card-button"
                        aria-label={`View ${card.name}`}
                        onClick={() => {
                          onOpenCard(card.id);
                        }}
                      >
                        {cardBody}
                      </button>
                    ) : (
                      <article className="account-card account-card-credit">
                        {cardBody}
                      </article>
                    )}
                  </li>
                );
              })}
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
      </main>
    </div>
  );
}


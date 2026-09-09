import { useMemo, useState } from "react";
import {
  calculateAssetBreakdown,
  calculateCardUtilization,
  calculateCardPaymentAttention,
  calculateHighCardUtilization,
  calculateMonthlySavings,
  calculateNetWorth,
  calculateNetWorthChange,
  calculateSpendingChange,
  latestActivityMonth,
  listNetWorthChangeEvidence,
  listSpendingChangeDrivers,
} from "../domain/calculations.ts";
import {
  netWorthChangeDirectionLabel,
  netWorthChangeHeadline,
  spendingChangeHeadline,
} from "../domain/insights.ts";
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
  const netWorthEvidence = netWorthChange
    ? listNetWorthChangeEvidence(transactions, netWorthChange)
    : [];
  const spendingChange = calculateSpendingChange(transactions);
  const drivers = spendingChange
    ? listSpendingChangeDrivers(transactions, spendingChange)
    : [];
  const paymentAttention = calculateCardPaymentAttention(cards);
  const paymentCard = paymentAttention
    ? cardsById.get(paymentAttention.cardId)
    : undefined;
  const highUtilization = calculateHighCardUtilization(cards);
  const attentionCard = highUtilization
    ? cardsById.get(highUtilization.cardId)
    : undefined;

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
                <p className="stat-note">Assets − liabilities</p>
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
                      <dd>
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
                  <div>
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

        {netWorthChange ? (
          <section className="panel" aria-labelledby="net-worth-change-heading">
            <div className="panel-header">
              <h2 id="net-worth-change-heading">Net worth change</h2>
              <p className="panel-copy">
                How the current snapshot compares with the previous calendar
                month after reversing recorded activity in the latest month.
                This does not use market prices or forecasts.
              </p>
            </div>

            <article
              className="insight-card"
              data-direction={netWorthChange.direction}
            >
              <h3>{netWorthChangeHeadline(netWorthChange.direction)}</h3>
              <p className="insight-body">
                Net worth is{" "}
                {formatCurrency(
                  netWorthChange.currentNetWorth,
                  netWorthChange.currency,
                )}{" "}
                this month, compared with{" "}
                {formatCurrency(
                  netWorthChange.previousNetWorth,
                  netWorthChange.currency,
                )}{" "}
                last month.
              </p>
              <p className="stat-note">
                {formatMonth(
                  netWorthChange.currentPeriod.year,
                  netWorthChange.currentPeriod.month,
                )}{" "}
                compared with{" "}
                {formatMonth(
                  netWorthChange.previousPeriod.year,
                  netWorthChange.previousPeriod.month,
                )}
              </p>
              <p className="stat-note">
                Change:{" "}
                {formatCurrency(
                  netWorthChange.direction === "decreased"
                    ? -netWorthChange.absoluteChange
                    : netWorthChange.absoluteChange,
                  netWorthChange.currency,
                  netWorthChange.direction !== "unchanged",
                )}
              </p>
              {netWorthEvidence.length > 0 ? (
                <>
                  <p className="stat-note">
                    Largest recorded movements this month. These do not claim a
                    complete cause.
                  </p>
                  <ol
                    className="transaction-list"
                    aria-label="Net worth change evidence"
                  >
                    {netWorthEvidence.map((item) => {
                      const row = (
                        <>
                          <div className="transaction-main">
                            <p className="transaction-description">
                              {item.description}
                            </p>
                            <p className="transaction-meta">
                              <span>
                                {formatMonth(item.period.year, item.period.month)}
                              </span>
                            </p>
                          </div>
                          <div className="transaction-aside">
                            <p
                              className={
                                item.impact < 0
                                  ? "transaction-amount is-outflow"
                                  : "transaction-amount is-inflow"
                              }
                            >
                              {formatCurrency(
                                item.impact,
                                netWorthChange.currency,
                                true,
                              )}
                            </p>
                          </div>
                        </>
                      );

                      return (
                        <li key={item.transactionId}>
                          {onOpenTransaction ? (
                            <button
                              type="button"
                              className="transaction-row transaction-row-button"
                              aria-label={`Inspect ${item.description}`}
                              onClick={() => {
                                onOpenTransaction(item.transactionId);
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
                </>
              ) : netWorthChange.direction === "unchanged" ? (
                <p className="stat-note">
                  Stored records do not show a net-worth movement to explain.
                </p>
              ) : (
                <p className="stat-note">
                  Stored records do not establish a trustworthy cause for this
                  change.
                </p>
              )}
            </article>
          </section>
        ) : null}

        {spendingChange ? (
          <section className="panel" aria-labelledby="spending-change-heading">
            <div className="panel-header">
              <h2 id="spending-change-heading">Spending change</h2>
              <p className="panel-copy">
                How spending this month compares with the previous month, using
                the same expense and card-purchase totals as the spending
                metric.
              </p>
            </div>

            <article
              className="insight-card"
              data-direction={spendingChange.direction}
            >
              <h3>{spendingChangeHeadline(spendingChange.direction)}</h3>
              <p className="insight-body">
                You spent{" "}
                {formatCurrency(
                  spendingChange.currentSpending,
                  spendingChange.currency,
                )}{" "}
                this month, compared with{" "}
                {formatCurrency(
                  spendingChange.previousSpending,
                  spendingChange.currency,
                )}{" "}
                last month.
              </p>
              <p className="stat-note">
                {formatMonth(
                  spendingChange.currentPeriod.year,
                  spendingChange.currentPeriod.month,
                )}{" "}
                compared with{" "}
                {formatMonth(
                  spendingChange.previousPeriod.year,
                  spendingChange.previousPeriod.month,
                )}
              </p>
              {drivers.length > 0 ? (
                <>
                  <p className="stat-note">
                    Largest spending in{" "}
                    {formatMonth(
                      drivers[0]!.period.year,
                      drivers[0]!.period.month,
                    )}
                  </p>
                  <ol
                    className="transaction-list"
                    aria-label="Spending change drivers"
                  >
                    {drivers.map((driver) => {
                      const row = (
                        <>
                          <div className="transaction-main">
                            <p className="transaction-description">
                              {driver.description}
                            </p>
                            <p className="transaction-meta">
                              <span>
                                {formatMonth(
                                  driver.period.year,
                                  driver.period.month,
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="transaction-aside">
                            <p className="transaction-amount is-outflow">
                              {formatCurrency(
                                driver.amount,
                                spendingChange.currency,
                              )}
                            </p>
                          </div>
                        </>
                      );

                      return (
                        <li key={driver.transactionId}>
                          {onOpenTransaction ? (
                            <button
                              type="button"
                              className="transaction-row transaction-row-button"
                              aria-label={`View ${driver.description}`}
                              onClick={() => {
                                onOpenTransaction(driver.transactionId);
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
                </>
              ) : null}
              {onShowSpending ? (
                <button
                  type="button"
                  className="inline-action"
                  onClick={onShowSpending}
                >
                  Inspect spending
                </button>
              ) : null}
            </article>
          </section>
        ) : null}


        {paymentAttention && paymentCard ? (
          <section className="panel" aria-labelledby="card-payment-heading">
            <div className="panel-header">
              <h2 id="card-payment-heading">Card payment</h2>
              <p className="panel-copy">
                A card whose stored payment status is due or overdue.
              </p>
            </div>

            <article className="insight-card" data-direction="increased">
              <h3>
                Card payment{" "}
                {paymentStatusLabel(paymentAttention.paymentStatus).toLowerCase()}
              </h3>
              <p className="insight-body">
                {paymentCard.name} ·{" "}
                {paymentStatusLabel(paymentAttention.paymentStatus)}
              </p>
              <p className="stat-note">
                Due:{" "}
                <time dateTime={paymentAttention.paymentDueDate}>
                  {formatDate(paymentAttention.paymentDueDate)}
                </time>
              </p>
              <p className="stat-note">
                Minimum payment:{" "}
                {formatCurrency(
                  paymentAttention.minimumPayment,
                  paymentCard.currency,
                )}
              </p>
              <p className="stat-note">
                Outstanding:{" "}
                {formatCurrency(
                  paymentAttention.outstandingBalance,
                  paymentCard.currency,
                )}
              </p>
              {onOpenCard ? (
                <button
                  type="button"
                  className="inline-action"
                  onClick={() => {
                    onOpenCard(paymentAttention.cardId);
                  }}
                >
                  Inspect card
                </button>
              ) : null}
            </article>
          </section>
        ) : null}

        {highUtilization && attentionCard ? (
          <section className="panel" aria-labelledby="card-utilization-heading">
            <div className="panel-header">
              <h2 id="card-utilization-heading">Card utilization</h2>
              <p className="panel-copy">
                A card at or above the attention threshold, using the existing
                utilization calculation.
              </p>
            </div>

            <article className="insight-card" data-direction="increased">
              <h3>{attentionCard.name} needs attention</h3>
              <p className="insight-body">
                Utilization is {formatUtilization(highUtilization.utilization)},
                at or above {formatUtilization(highUtilization.threshold)}.
              </p>
              <p className="stat-note">Consider paying down the balance.</p>
              {onOpenCard ? (
                <button
                  type="button"
                  className="inline-action"
                  onClick={() => {
                    onOpenCard(highUtilization.cardId);
                  }}
                >
                  Inspect card
                </button>
              ) : null}
            </article>
          </section>
        ) : null}

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


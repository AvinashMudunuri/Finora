import {
  listNetWorthChangeBreakdown,
  listNetWorthChangeEvidence,
  listSpendingChangeDrivers,
} from "../domain/calculations.ts";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  formatUtilization,
  paymentStatusLabel,
} from "../domain/finance.ts";
import {
  listAttentionInsights,
  netWorthChangeHeadline,
  spendingChangeHeadline,
} from "../domain/insights.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type InsightsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onShowDashboard?: () => void;
  onShowAccounts?: () => void;
  onShowCards?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onOpenCard?: (cardId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
};

export function Insights({
  accounts,
  cards,
  transactions,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onOpenCard,
  onOpenTransaction,
}: InsightsProps) {
  const insights = listAttentionInsights(accounts, cards, transactions);
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  return (
    <div className="app-shell">
      <SiteHeader
        current="insights"
        onShowDashboard={() => {
          onShowDashboard?.();
        }}
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
        onShowInsights={() => undefined}
      />

      <main className="page">
        <div className="page-intro">
          <h1>Insights</h1>
          <p className="page-lede">
            Attention-worthy changes from stored records, using the same
            calculations as the Dashboard.
          </p>
        </div>

        <section className="panel" aria-labelledby="attention-heading">
          <div className="panel-header">
            <h2 id="attention-heading">Attention</h2>
            <p className="panel-copy">
              Ordered by stored payment risk, utilization, then meaningful
              monthly change. No recommendations are invented.
            </p>
          </div>

          {insights.length === 0 ? (
            <p className="empty-state">
              Nothing requires attention based on the available stored data.
            </p>
          ) : (
            <ol className="insight-stack" aria-label="Attention insights">
              {insights.map((insight) => {
                if (
                  insight.kind === "card-payment-overdue" ||
                  insight.kind === "card-payment-due"
                ) {
                  const card = cardsById.get(insight.payment.cardId);
                  if (!card) {
                    return null;
                  }
                  return (
                    <li key={insight.kind}>
                      <article
                        className="insight-card"
                        data-direction="increased"
                      >
                        <h3>
                          Card payment{" "}
                          {paymentStatusLabel(
                            insight.payment.paymentStatus,
                          ).toLowerCase()}
                        </h3>
                        <p className="insight-body">
                          {card.name} ·{" "}
                          {paymentStatusLabel(insight.payment.paymentStatus)}
                        </p>
                        <p className="stat-note">
                          Due:{" "}
                          <time dateTime={insight.payment.paymentDueDate}>
                            {formatDate(insight.payment.paymentDueDate)}
                          </time>
                        </p>
                        <p className="stat-note">
                          Minimum payment:{" "}
                          {formatCurrency(
                            insight.payment.minimumPayment,
                            card.currency,
                          )}
                        </p>
                        <p className="stat-note">
                          Outstanding:{" "}
                          {formatCurrency(
                            insight.payment.outstandingBalance,
                            card.currency,
                          )}
                        </p>
                        {onOpenCard ? (
                          <button
                            type="button"
                            className="inline-action"
                            onClick={() => {
                              onOpenCard(insight.payment.cardId);
                            }}
                          >
                            Inspect card
                          </button>
                        ) : null}
                      </article>
                    </li>
                  );
                }

                if (insight.kind === "high-card-utilization") {
                  const card = cardsById.get(insight.utilization.cardId);
                  if (!card) {
                    return null;
                  }
                  return (
                    <li key={insight.kind}>
                      <article
                        className="insight-card"
                        data-direction="increased"
                      >
                        <h3>{card.name} needs attention</h3>
                        <p className="insight-body">
                          Utilization is{" "}
                          {formatUtilization(insight.utilization.utilization)},
                          at or above{" "}
                          {formatUtilization(insight.utilization.threshold)}.
                        </p>
                        {onOpenCard ? (
                          <button
                            type="button"
                            className="inline-action"
                            onClick={() => {
                              onOpenCard(insight.utilization.cardId);
                            }}
                          >
                            Inspect utilization
                          </button>
                        ) : null}
                      </article>
                    </li>
                  );
                }

                if (insight.kind === "spending-change") {
                  const drivers = listSpendingChangeDrivers(
                    transactions,
                    insight.change,
                  );
                  return (
                    <li key={insight.kind}>
                      <article
                        className="insight-card"
                        data-direction={insight.change.direction}
                      >
                        <h3>
                          {spendingChangeHeadline(insight.change.direction)}
                        </h3>
                        <p className="insight-body">
                          You spent{" "}
                          {formatCurrency(
                            insight.change.currentSpending,
                            insight.change.currency,
                          )}{" "}
                          this month, compared with{" "}
                          {formatCurrency(
                            insight.change.previousSpending,
                            insight.change.currency,
                          )}{" "}
                          last month.
                        </p>
                        <p className="stat-note">
                          {formatMonth(
                            insight.change.currentPeriod.year,
                            insight.change.currentPeriod.month,
                          )}{" "}
                          compared with{" "}
                          {formatMonth(
                            insight.change.previousPeriod.year,
                            insight.change.previousPeriod.month,
                          )}
                        </p>
                        {drivers.length > 0 ? (
                          <ol
                            className="transaction-list"
                            aria-label="Spending change drivers"
                          >
                            {drivers.map((driver) => (
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
                                    <div className="transaction-main">
                                      <p className="transaction-description">
                                        {driver.description}
                                      </p>
                                    </div>
                                    <div className="transaction-aside">
                                      <p className="transaction-amount is-outflow">
                                        {formatCurrency(
                                          driver.amount,
                                          insight.change.currency,
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                ) : (
                                  <div className="transaction-row">
                                    <p className="transaction-description">
                                      {driver.description}
                                    </p>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
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
                    </li>
                  );
                }

                if (insight.kind !== "net-worth-change") {
                  return null;
                }

                const evidence = listNetWorthChangeEvidence(
                  transactions,
                  insight.change,
                );
                const breakdown = listNetWorthChangeBreakdown(
                  transactions,
                  insight.change,
                );
                return (
                  <li key={insight.kind}>
                    <article
                      className="insight-card"
                      data-direction={insight.change.direction}
                    >
                      <h3>
                        {netWorthChangeHeadline(insight.change.direction)}
                      </h3>
                      <p className="insight-body">
                        Net worth is{" "}
                        {formatCurrency(
                          insight.change.currentNetWorth,
                          insight.change.currency,
                        )}{" "}
                        this month, compared with{" "}
                        {formatCurrency(
                          insight.change.previousNetWorth,
                          insight.change.currency,
                        )}{" "}
                        last month.
                      </p>
                      <p className="stat-note">
                        {formatMonth(
                          insight.change.currentPeriod.year,
                          insight.change.currentPeriod.month,
                        )}{" "}
                        compared with{" "}
                        {formatMonth(
                          insight.change.previousPeriod.year,
                          insight.change.previousPeriod.month,
                        )}
                      </p>
                      <p className="stat-note">
                        Change:{" "}
                        {formatCurrency(
                          insight.change.direction === "decreased"
                            ? -insight.change.absoluteChange
                            : insight.change.absoluteChange,
                          insight.change.currency,
                          insight.change.direction !== "unchanged",
                        )}
                      </p>
                      <dl
                        className="position-breakdown"
                        aria-label="Net worth change breakdown"
                      >
                        <div>
                          <dt>Account movement</dt>
                          <dd>
                            {formatCurrency(
                              breakdown.assetMovement,
                              insight.change.currency,
                              breakdown.assetMovement !== 0,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Card movement</dt>
                          <dd>
                            {formatCurrency(
                              breakdown.liabilityMovement,
                              insight.change.currency,
                              breakdown.liabilityMovement !== 0,
                            )}
                          </dd>
                        </div>
                      </dl>
                      {evidence.length > 0 ? (
                        <ol
                          className="transaction-list"
                          aria-label="Net worth change evidence"
                        >
                          {evidence.map((item) => (
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
                                  <div className="transaction-main">
                                    <p className="transaction-description">
                                      {item.description}
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
                                        insight.change.currency,
                                        true,
                                      )}
                                    </p>
                                  </div>
                                </button>
                              ) : (
                                <div className="transaction-row">
                                  <p className="transaction-description">
                                    {item.description}
                                  </p>
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      {onShowDashboard ? (
                        <button
                          type="button"
                          className="inline-action"
                          onClick={onShowDashboard}
                        >
                          Inspect net worth
                        </button>
                      ) : null}
                    </article>
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

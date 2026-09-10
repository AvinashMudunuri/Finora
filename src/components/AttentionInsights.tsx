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
  ATTENTION_EMPTY_COPY,
  attentionTitle,
  listAttentionInsights,
  type AttentionInsight,
} from "../domain/insights.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";

export type AttentionInsightsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onOpenCard?: (cardId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
  onShowSpending?: () => void;
  onShowDashboard?: () => void;
};

export function AttentionInsights({
  accounts,
  cards,
  transactions,
  onOpenCard,
  onOpenTransaction,
  onShowSpending,
  onShowDashboard,
}: AttentionInsightsProps) {
  const insights = listAttentionInsights(accounts, cards, transactions);
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  if (insights.length === 0) {
    return <p className="empty-state">{ATTENTION_EMPTY_COPY}</p>;
  }

  return (
    <ol className="insight-stack" aria-label="Attention insights">
      {insights.map((insight) => (
        <li key={insight.kind}>
          <AttentionCard
            insight={insight}
            cardsById={cardsById}
            transactions={transactions}
            onOpenCard={onOpenCard}
            onOpenTransaction={onOpenTransaction}
            onShowSpending={onShowSpending}
            onShowDashboard={onShowDashboard}
          />
        </li>
      ))}
    </ol>
  );
}

function insightTone(insight: AttentionInsight): {
  label: "Action required" | "Positive movement" | "Observation";
  tone: "action" | "positive" | "observation";
} {
  if (
    insight.kind === "card-payment-overdue" ||
    insight.kind === "card-payment-due" ||
    insight.kind === "high-card-utilization"
  ) {
    return { label: "Action required", tone: "action" };
  }
  if (insight.kind === "net-worth-change" && insight.change.direction === "increased") {
    return { label: "Positive movement", tone: "positive" };
  }
  if (insight.kind === "net-worth-change") {
    return { label: "Action required", tone: "action" };
  }
  return { label: "Observation", tone: "observation" };
}

function AttentionKicker({ insight }: { insight: AttentionInsight }) {
  const { label } = insightTone(insight);
  return (
    <>
      <p className="insight-tone">{label}</p>
      <p className="stat-note">Priority {insight.priority}</p>
    </>
  );
}

function AttentionCard({
  insight,
  cardsById,
  transactions,
  onOpenCard,
  onOpenTransaction,
  onShowSpending,
  onShowDashboard,
}: {
  insight: AttentionInsight;
  cardsById: Map<string, Card>;
  transactions: Transaction[];
  onOpenCard?: (cardId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
  onShowSpending?: () => void;
  onShowDashboard?: () => void;
}) {
  if (
    insight.kind === "card-payment-overdue" ||
    insight.kind === "card-payment-due"
  ) {
    const card = cardsById.get(insight.payment.cardId);
    if (!card) {
      return null;
    }
    return (
      <article className="insight-card" data-tone={insightTone(insight).tone}>
        <AttentionKicker insight={insight} />
        <h3>{attentionTitle(insight)}</h3>
        <p className="insight-body">
          {card.name} · {paymentStatusLabel(insight.payment.paymentStatus)}
        </p>
        <p className="stat-note">
          Due:{" "}
          <time dateTime={insight.payment.paymentDueDate}>
            {formatDate(insight.payment.paymentDueDate)}
          </time>
        </p>
        <p className="stat-note">
          Minimum payment:{" "}
          {formatCurrency(insight.payment.minimumPayment, card.currency)}
        </p>
        <p className="stat-note">
          Outstanding:{" "}
          {formatCurrency(insight.payment.outstandingBalance, card.currency)}
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
    );
  }

  if (insight.kind === "high-card-utilization") {
    const card = cardsById.get(insight.utilization.cardId);
    if (!card) {
      return null;
    }
    return (
      <article className="insight-card" data-tone={insightTone(insight).tone}>
        <AttentionKicker insight={insight} />
        <h3>{attentionTitle(insight)}</h3>
        <p className="insight-body">
          {card.name} is at {formatUtilization(insight.utilization.utilization)},
          at or above {formatUtilization(insight.utilization.threshold)}.
        </p>
        <p className="stat-note">
          Outstanding:{" "}
          {formatCurrency(
            insight.utilization.outstandingBalance,
            card.currency,
          )}
        </p>
        <p className="stat-note">
          Credit limit:{" "}
          {formatCurrency(insight.utilization.creditLimit, card.currency)}
        </p>
        {onOpenCard ? (
          <button
            type="button"
            className="inline-action"
            onClick={() => {
              onOpenCard(insight.utilization.cardId);
            }}
          >
            Inspect card
          </button>
        ) : null}
      </article>
    );
  }

  if (insight.kind === "spending-change") {
    const drivers = listSpendingChangeDrivers(transactions, insight.change);
    return (
      <article
        className="insight-card"
        data-tone={insightTone(insight).tone}
        data-direction={insight.change.direction}
      >
        <AttentionKicker insight={insight} />
        <h3>{attentionTitle(insight)}</h3>
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
          <>
            <p className="stat-note">
              Largest spending in{" "}
              {formatMonth(drivers[0]!.period.year, drivers[0]!.period.month)}
            </p>
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
                          {formatCurrency(driver.amount, insight.change.currency)}
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
    );
  }

  if (insight.kind !== "net-worth-change") {
    return null;
  }

  const evidence = listNetWorthChangeEvidence(transactions, insight.change);
  const breakdown = listNetWorthChangeBreakdown(transactions, insight.change);
  return (
    <article
      className="insight-card"
      data-tone={insightTone(insight).tone}
      data-direction={insight.change.direction}
    >
      <AttentionKicker insight={insight} />
      <h3>{attentionTitle(insight)}</h3>
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
      <dl className="position-breakdown" aria-label="Net worth change breakdown">
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
        <ol className="transaction-list" aria-label="Net worth change evidence">
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
                    <p className="transaction-description">{item.description}</p>
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
                  <p className="transaction-description">{item.description}</p>
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
  );
}

import { useMemo } from "react";
import {
  calculateCardUtilization,
  type CardUtilizationResult,
} from "../domain/calculations.ts";
import {
  formatCurrency,
  formatDate,
  formatUtilization,
  getCardTransactions,
  paymentStatusLabel,
  signedAmount,
  transactionDirection,
  transactionTypeLabel,
} from "../domain/finance.ts";
import type { Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type CardsProps = {
  cards: Card[];
  transactions: Transaction[];
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  onShowDashboard?: () => void;
  onShowAccounts?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onShowInsights?: () => void;
  onOpenTransaction?: (transactionId: string) => void;
};

export function Cards({
  cards,
  transactions,
  selectedCardId,
  onSelectCard,
  onShowDashboard,
  onShowAccounts,
  onShowTransactions,
  onShowSpending,
  onShowInsights,
  onOpenTransaction,
}: CardsProps) {
  const utilizationById = useMemo(() => {
    return new Map(
      calculateCardUtilization(cards).map((result) => [result.cardId, result]),
    );
  }, [cards]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedUtilization = selectedCard
    ? utilizationById.get(selectedCard.id)
    : undefined;
  const selectedTransactions = selectedCard
    ? getCardTransactions(transactions, selectedCard.id)
    : [];

  return (
    <div className="app-shell">
      <SiteHeader
        current="cards"
        onShowDashboard={() => {
          onShowDashboard?.();
        }}
        onShowAccounts={() => {
          onShowAccounts?.();
        }}
        onShowCards={() => undefined}
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
          <h1>Cards</h1>
          <p className="page-lede">
            Balances, available credit, and what is due on each card.
          </p>
        </div>

        <section className="panel" aria-labelledby="cards-list-heading">
          <div className="panel-header">
            <h2 id="cards-list-heading">Your cards</h2>
            <p className="panel-copy">
              Outstanding balances, limits, and payment status for this
              snapshot.
            </p>
          </div>

          {cards.length === 0 ? (
            <p className="empty-state">No cards in this snapshot.</p>
          ) : (
            <ul className="account-grid card-list-grid">
              {cards.map((card) => {
                const utilization = utilizationById.get(card.id);

                if (!utilization) {
                  return null;
                }

                const selected = card.id === selectedCardId;

                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      className={
                        selected
                          ? "account-card account-card-credit account-card-button is-selected"
                          : "account-card account-card-credit account-card-button"
                      }
                      aria-pressed={selected}
                      onClick={() => {
                        onSelectCard(card.id);
                      }}
                    >
                      <div className="account-card-top">
                        <h3>{card.name}</h3>
                        <p className="account-type">Credit Card</p>
                      </div>
                      <p className="account-note">{card.issuer}</p>
                      <CardFacts card={card} utilization={utilization} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedCard && selectedUtilization ? (
          <CardDetail
            card={selectedCard}
            utilization={selectedUtilization}
            transactions={selectedTransactions}
            onOpenTransaction={onOpenTransaction}
          />
        ) : (
          <section className="panel">
            <p className="empty-state">Select a card to see its details.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function CardDetail({
  card,
  utilization,
  transactions,
  onOpenTransaction,
}: {
  card: Card;
  utilization: CardUtilizationResult;
  transactions: Transaction[];
  onOpenTransaction?: (transactionId: string) => void;
}) {
  const headingId = `${card.id}-detail-heading`;

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>{card.name}</h2>
        <p className="panel-copy">{card.issuer}</p>
      </div>

      <CardFacts
        card={card}
        utilization={utilization}
        includeStatementAndMinimum
      />

      <section
        className="card-transactions"
        aria-labelledby={`${card.id}-transactions-heading`}
      >
        <h3 id={`${card.id}-transactions-heading`}>Card transactions</h3>
        <p className="panel-copy">
          Activity linked to this card. Purchases and payments are included.
        </p>

        {transactions.length === 0 ? (
          <p className="empty-state">No transactions for this card.</p>
        ) : (
          <ol className="transaction-list">
            {transactions.map((transaction) => {
              const direction = transactionDirection(transaction, card.id);
              const amount = signedAmount(transaction, card.id);
              const row = (
                <>
                  <div className="transaction-main">
                    <p className="transaction-description">
                      {transaction.description}
                    </p>
                    <p className="transaction-meta">
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
                      {formatCurrency(amount, transaction.currency, true)}
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
    </section>
  );
}

function CardFacts({
  card,
  utilization,
  includeStatementAndMinimum = false,
}: {
  card: Card;
  utilization: CardUtilizationResult;
  includeStatementAndMinimum?: boolean;
}) {
  return (
    <dl className="card-metrics">
      <div>
        <dt>Outstanding</dt>
        <dd>{formatCurrency(utilization.outstandingBalance, card.currency)}</dd>
      </div>
      <div>
        <dt>Credit limit</dt>
        <dd>{formatCurrency(utilization.creditLimit, card.currency)}</dd>
      </div>
      <div>
        <dt>Available credit</dt>
        <dd>{formatCurrency(utilization.availableCredit, card.currency)}</dd>
      </div>
      <div>
        <dt>Utilization</dt>
        <dd>{formatUtilization(utilization.utilization)}</dd>
      </div>
      <div>
        <dt>Payment due</dt>
        <dd>
          <time dateTime={card.paymentDueDate}>
            {formatDate(card.paymentDueDate)}
          </time>
        </dd>
      </div>
      <div>
        <dt>Minimum payment</dt>
        <dd>{formatCurrency(card.minimumPayment, card.currency)}</dd>
      </div>
      <div>
        <dt>Payment status</dt>
        <dd>{paymentStatusLabel(card.paymentStatus)}</dd>
      </div>
      {includeStatementAndMinimum ? (
        <div>
          <dt>Statement end</dt>
          <dd>
            <time dateTime={card.statementPeriodEnd}>
              {formatDate(card.statementPeriodEnd)}
            </time>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

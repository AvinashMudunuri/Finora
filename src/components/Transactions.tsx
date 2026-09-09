import { useMemo, useState } from "react";
import {
  eventTypeLabel,
  formatCurrency,
  formatDate,
  listTransactions,
  signedAmount,
  transactionContext,
  type TransactionListFilter,
} from "../domain/finance.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { TRANSACTION_EVENT_TYPES } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type TransactionsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  selectedTransactionId: string;
  onSelectTransaction: (transactionId: string) => void;
  onShowDashboard?: () => void;
  onShowAccounts?: () => void;
  onShowCards?: () => void;
  onShowSpending?: () => void;
  onShowInsights?: () => void;
};

export function Transactions({
  accounts,
  cards,
  transactions,
  selectedTransactionId,
  onSelectTransaction,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowSpending,
  onShowInsights,
}: TransactionsProps) {
  const [filter, setFilter] = useState<TransactionListFilter>({ kind: "all" });

  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]));
  }, [cards]);

  const listed = useMemo(
    () => listTransactions(transactions, filter),
    [filter, transactions],
  );

  const selectedTransaction = transactions.find(
    (transaction) => transaction.id === selectedTransactionId,
  );
  const selectedIsVisible = listed.some(
    (transaction) => transaction.id === selectedTransactionId,
  );
  const signContext = filter.kind === "party" ? filter.id : "all";

  return (
    <div className="app-shell">
      <SiteHeader
        current="transactions"
        onShowDashboard={() => {
          onShowDashboard?.();
        }}
        onShowAccounts={() => {
          onShowAccounts?.();
        }}
        onShowCards={() => {
          onShowCards?.();
        }}
        onShowTransactions={() => undefined}
        onShowSpending={() => {
          onShowSpending?.();
        }}
        onShowInsights={() => {
          onShowInsights?.();
        }}
      />

      <main className="page">
        <div className="page-intro">
          <h1>Transactions</h1>
          <p className="page-lede">
            The financial events behind the dashboard and cards.
          </p>
        </div>

        <section className="panel" aria-labelledby="transactions-list-heading">
          <div className="panel-header">
            <h2 id="transactions-list-heading">Your transactions</h2>
            <p className="panel-copy">
              Newest first. Filter by account, card, or financial event type.
            </p>
          </div>

          <div
            className="filters"
            role="group"
            aria-label="Filter transactions"
          >
            <button
              type="button"
              className={
                filter.kind === "all" ? "filter-chip is-active" : "filter-chip"
              }
              aria-pressed={filter.kind === "all"}
              onClick={() => {
                setFilter({ kind: "all" });
              }}
            >
              All transactions
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={
                  filter.kind === "party" && filter.id === account.id
                    ? "filter-chip is-active"
                    : "filter-chip"
                }
                aria-pressed={filter.kind === "party" && filter.id === account.id}
                onClick={() => {
                  setFilter({ kind: "party", id: account.id });
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
                  filter.kind === "party" && filter.id === card.id
                    ? "filter-chip is-active"
                    : "filter-chip"
                }
                aria-pressed={filter.kind === "party" && filter.id === card.id}
                onClick={() => {
                  setFilter({ kind: "party", id: card.id });
                }}
              >
                {card.name}
              </button>
            ))}
            {TRANSACTION_EVENT_TYPES.map((eventType) => (
              <button
                key={eventType}
                type="button"
                className={
                  filter.kind === "event" && filter.eventType === eventType
                    ? "filter-chip is-active"
                    : "filter-chip"
                }
                aria-pressed={
                  filter.kind === "event" && filter.eventType === eventType
                }
                onClick={() => {
                  setFilter({ kind: "event", eventType });
                }}
              >
                {eventTypeLabel(eventType)}
              </button>
            ))}
          </div>

          {listed.length === 0 ? (
            <p className="empty-state">
              {transactions.length === 0
                ? "No transactions in this snapshot."
                : "No transactions for this filter."}
            </p>
          ) : (
            <ol className="transaction-list" aria-label="Transaction list">
              {listed.map((transaction) => {
                const selected = transaction.id === selectedTransactionId;
                const amount = signedAmount(transaction, signContext);

                return (
                  <li key={transaction.id}>
                    <button
                      type="button"
                      className={
                        selected
                          ? "transaction-row transaction-row-button is-selected"
                          : "transaction-row transaction-row-button"
                      }
                      aria-pressed={selected}
                      onClick={() => {
                        onSelectTransaction(transaction.id);
                      }}
                    >
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
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {selectedTransaction && selectedIsVisible ? (
          <TransactionDetail
            transaction={selectedTransaction}
            accountsById={accountsById}
            cardsById={cardsById}
            signContext={signContext}
          />
        ) : selectedTransaction && listed.length > 0 ? (
          <section className="panel">
            <p className="empty-state">
              This transaction is not in the current filter.
            </p>
          </section>
        ) : listed.length > 0 ? (
          <section className="panel">
            <p className="empty-state">
              Select a transaction to inspect it.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function TransactionDetail({
  transaction,
  accountsById,
  cardsById,
  signContext,
}: {
  transaction: Transaction;
  accountsById: Map<string, Account>;
  cardsById: Map<string, Card>;
  signContext: string;
}) {
  const headingId = `${transaction.id}-detail-heading`;
  const sourceAccount = transaction.accountId
    ? accountsById.get(transaction.accountId)
    : undefined;
  const destinationAccount = transaction.counterpartyAccountId
    ? accountsById.get(transaction.counterpartyAccountId)
    : undefined;
  const card = transaction.cardId
    ? cardsById.get(transaction.cardId)
    : undefined;

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>{transaction.description}</h2>
        <p className="panel-copy">
          {eventTypeLabel(transaction.eventType)} on{" "}
          {formatDate(transaction.date)}
        </p>
      </div>

      <dl className="card-metrics">
        <div>
          <dt>Transaction ID</dt>
          <dd>{transaction.id}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>
            <time dateTime={transaction.date}>
              {formatDate(transaction.date)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>
            {formatCurrency(
              signedAmount(transaction, signContext),
              transaction.currency,
              true,
            )}
          </dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{transaction.currency}</dd>
        </div>
        <div>
          <dt>Event type</dt>
          <dd>{eventTypeLabel(transaction.eventType)}</dd>
        </div>
        {sourceAccount ? (
          <div>
            <dt>
              {transaction.eventType === "transfer" ? "From account" : "Account"}
            </dt>
            <dd>{sourceAccount.name}</dd>
          </div>
        ) : null}
        {destinationAccount ? (
          <div>
            <dt>To account</dt>
            <dd>{destinationAccount.name}</dd>
          </div>
        ) : null}
        {card ? (
          <div>
            <dt>Card</dt>
            <dd>{card.name}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

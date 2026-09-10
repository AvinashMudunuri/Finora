import { useMemo, useState } from "react";
import { listActivityMonths } from "../domain/calculations.ts";
import {
  eventTypeLabel,
  formatCurrency,
  formatDate,
  formatMonth,
  listTransactions,
  signedAmount,
  transactionContext,
  transactionListEmptyReason,
  type TransactionListFilter,
} from "../domain/finance.ts";
import type { Account, Card, Transaction, TransactionEventType } from "../domain/types.ts";
import { TRANSACTION_EVENT_TYPES } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type TransactionsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  selectedTransactionId: string;
  onSelectTransaction: (transactionId: string) => void;
  onOpenAccount?: (accountId: string) => void;
  onOpenCard?: (cardId: string) => void;
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
  onOpenAccount,
  onOpenCard,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowSpending,
  onShowInsights,
}: TransactionsProps) {
  const [query, setQuery] = useState("");
  const [partyId, setPartyId] = useState<string | undefined>();
  const [eventType, setEventType] = useState<TransactionEventType | undefined>();
  const [periodIndex, setPeriodIndex] = useState(-1);

  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]));
  }, [cards]);

  const activityMonths = useMemo(
    () => listActivityMonths(transactions),
    [transactions],
  );
  const selectedPeriod = periodIndex >= 0 ? activityMonths[periodIndex] : undefined;

  const filter = useMemo<TransactionListFilter>(
    () => ({
      kind: partyId ? "party" : eventType ? "event" : "all",
      ...(partyId === undefined ? {} : { id: partyId }),
      ...(eventType === undefined ? {} : { eventType }),
      ...(query.trim() === "" ? {} : { query }),
      ...(selectedPeriod === undefined
        ? {}
        : { year: selectedPeriod.year, month: selectedPeriod.month }),
    }),
    [eventType, partyId, query, selectedPeriod],
  );

  const listed = useMemo(
    () => listTransactions(transactions, filter, { accounts, cards }),
    [accounts, cards, filter, transactions],
  );
  const periodListed = useMemo(
    () =>
      listTransactions(
        transactions,
        selectedPeriod
          ? { kind: "all", year: selectedPeriod.year, month: selectedPeriod.month }
          : { kind: "all" },
      ),
    [selectedPeriod, transactions],
  );

  const emptyReason = transactionListEmptyReason(
    transactions.length,
    periodListed.length,
    listed.length,
    selectedPeriod !== undefined,
  );

  const selectedTransaction = transactions.find(
    (transaction) => transaction.id === selectedTransactionId,
  );
  const selectedIsVisible = listed.some(
    (transaction) => transaction.id === selectedTransactionId,
  );
  const signContext = partyId ?? "all";

  const olderDisabled = activityMonths.length === 0 || periodIndex === activityMonths.length - 1;
  const newerDisabled = periodIndex < 0;

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
            The stored events behind Finora&apos;s position, change, and attention.
          </p>
        </div>

        <section className="panel" aria-labelledby="transactions-list-heading">
          <div className="panel-header">
            <h2 id="transactions-list-heading">Your transactions</h2>
            <p className="panel-copy">
              Newest first. Search and filters use only stored transaction facts.
            </p>
          </div>

          {activityMonths.length > 0 ? (
            <div className="month-controls">
              <button
                type="button"
                className="inline-action history-month-action"
                disabled={olderDisabled}
                onClick={() => {
                  setPeriodIndex((current) => {
                    if (current < 0) {
                      return 0;
                    }
                    return Math.min(current + 1, activityMonths.length - 1);
                  });
                }}
              >
                Older period
              </button>
              <h3 className="month-heading">
                {selectedPeriod
                  ? formatMonth(selectedPeriod.year, selectedPeriod.month)
                  : "All stored months"}
              </h3>
              <button
                type="button"
                className="inline-action history-month-action"
                disabled={newerDisabled}
                onClick={() => {
                  setPeriodIndex((current) => current - 1);
                }}
              >
                Newer period
              </button>
            </div>
          ) : null}

          <label className="transaction-search">
            <span>Search transactions</span>
            <input
              type="search"
              value={query}
              placeholder="Description, event, account, or card"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>

          <div className="filters" role="group" aria-label="Filter transactions">
            <button
              type="button"
              className={
                partyId === undefined && eventType === undefined
                  ? "filter-chip is-active"
                  : "filter-chip"
              }
              aria-pressed={partyId === undefined && eventType === undefined}
              onClick={() => {
                setPartyId(undefined);
                setEventType(undefined);
              }}
            >
              All transactions
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={
                  partyId === account.id ? "filter-chip is-active" : "filter-chip"
                }
                aria-label={`Show only ${account.name}`}
                aria-pressed={partyId === account.id}
                onClick={() => {
                  setPartyId((current) =>
                    current === account.id ? undefined : account.id,
                  );
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
                  partyId === card.id ? "filter-chip is-active" : "filter-chip"
                }
                aria-label={`Show only ${card.name}`}
                aria-pressed={partyId === card.id}
                onClick={() => {
                  setPartyId((current) => (current === card.id ? undefined : card.id));
                }}
              >
                {card.name}
              </button>
            ))}
            {TRANSACTION_EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  eventType === type ? "filter-chip is-active" : "filter-chip"
                }
                aria-label={`Show only ${eventTypeLabel(type)}`}
                aria-pressed={eventType === type}
                onClick={() => {
                  setEventType((current) => (current === type ? undefined : type));
                }}
              >
                {eventTypeLabel(type)}
              </button>
            ))}
          </div>

          <p className="panel-copy" aria-live="polite">
            {describeActiveState({
              query,
              partyId,
              eventType,
              selectedPeriod,
              accountsById,
              cardsById,
              listedCount: listed.length,
            })}
          </p>

          {emptyReason === "none-stored" ? (
            <p className="empty-state">No transactions in this snapshot.</p>
          ) : emptyReason === "none-in-period" && selectedPeriod ? (
            <p className="empty-state">
              No transactions in {formatMonth(selectedPeriod.year, selectedPeriod.month)}.
            </p>
          ) : emptyReason === "none-match" ? (
            <p className="empty-state">
              No transactions match the current search and filters.
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
            onOpenAccount={onOpenAccount}
            onOpenCard={onOpenCard}
          />
        ) : selectedTransaction && listed.length > 0 ? (
          <section className="panel">
            <p className="empty-state">
              This transaction is not in the current filter.
            </p>
          </section>
        ) : listed.length > 0 ? (
          <section className="panel">
            <p className="empty-state">Select a transaction to inspect it.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function describeActiveState({
  query,
  partyId,
  eventType,
  selectedPeriod,
  accountsById,
  cardsById,
  listedCount,
}: {
  query: string;
  partyId?: string;
  eventType?: TransactionEventType;
  selectedPeriod?: { year: number; month: number };
  accountsById: Map<string, Account>;
  cardsById: Map<string, Card>;
  listedCount: number;
}): string {
  const parts = [
    selectedPeriod
      ? formatMonth(selectedPeriod.year, selectedPeriod.month)
      : "All stored months",
    partyId
      ? (accountsById.get(partyId)?.name ?? cardsById.get(partyId)?.name ?? partyId)
      : undefined,
    eventType ? eventTypeLabel(eventType) : undefined,
    query.trim() === "" ? undefined : `“${query.trim()}”`,
  ].filter((part): part is string => part !== undefined);

  return `${listedCount} ${listedCount === 1 ? "transaction" : "transactions"} · ${parts.join(" · ")}`;
}

function TransactionDetail({
  transaction,
  accountsById,
  cardsById,
  signContext,
  onOpenAccount,
  onOpenCard,
}: {
  transaction: Transaction;
  accountsById: Map<string, Account>;
  cardsById: Map<string, Card>;
  signContext: string;
  onOpenAccount?: (accountId: string) => void;
  onOpenCard?: (cardId: string) => void;
}) {
  const headingId = `${transaction.id}-detail-heading`;
  const sourceAccount = transaction.accountId
    ? accountsById.get(transaction.accountId)
    : undefined;
  const destinationAccount = transaction.counterpartyAccountId
    ? accountsById.get(transaction.counterpartyAccountId)
    : undefined;
  const card = transaction.cardId ? cardsById.get(transaction.cardId) : undefined;

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>{transaction.description}</h2>
        <p className="panel-copy">
          {eventTypeLabel(transaction.eventType)} on {formatDate(transaction.date)}
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
            <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
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

      {sourceAccount && onOpenAccount ? (
        <button
          type="button"
          className="inline-action"
          onClick={() => {
            onOpenAccount(sourceAccount.id);
          }}
        >
          Inspect {sourceAccount.name}
        </button>
      ) : null}
      {destinationAccount && onOpenAccount ? (
        <button
          type="button"
          className="inline-action"
          onClick={() => {
            onOpenAccount(destinationAccount.id);
          }}
        >
          Inspect {destinationAccount.name}
        </button>
      ) : null}
      {card && onOpenCard ? (
        <button
          type="button"
          className="inline-action"
          onClick={() => {
            onOpenCard(card.id);
          }}
        >
          Inspect {card.name}
        </button>
      ) : null}
    </section>
  );
}

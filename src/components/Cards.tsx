import { useMemo, useState, type FormEvent } from "react";
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
import type { Card, CardDraft, Transaction } from "../domain/types.ts";
import { CARD_PAYMENT_STATUSES } from "../domain/types.ts";
import type { EntityMutationResult, FieldErrors } from "../domain/validate.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type CardsProps = {
  cards: Card[];
  transactions: Transaction[];
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  onCreateCard?: (draft: CardDraft) => EntityMutationResult<Card>;
  onUpdateCard?: (id: string, draft: CardDraft) => EntityMutationResult<Card>;
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
  onCreateCard,
  onUpdateCard,
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

        {onCreateCard || onUpdateCard ? (
          <CardManagement
            cards={cards}
            selectedCard={selectedCard}
            onCreateCard={onCreateCard}
            onUpdateCard={onUpdateCard}
          />
        ) : null}

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

type CardFormMode = "closed" | "create" | "edit";

function emptyCardDraft(): CardDraft {
  return {
    name: "",
    issuer: "",
    creditLimit: "",
    outstandingBalance: "",
    statementPeriodEnd: "",
    paymentDueDate: "",
    minimumPayment: "",
    paymentStatus: "current",
  };
}

function draftFromCard(card: Card): CardDraft {
  return {
    name: card.name,
    issuer: card.issuer,
    creditLimit: String(card.creditLimit),
    outstandingBalance: String(card.outstandingBalance),
    statementPeriodEnd: card.statementPeriodEnd,
    paymentDueDate: card.paymentDueDate,
    minimumPayment: String(card.minimumPayment),
    paymentStatus: card.paymentStatus,
  };
}

function previewAvailableCredit(draft: CardDraft): string | null {
  const limit = Number(draft.creditLimit);
  const outstanding = Number(draft.outstandingBalance);
  if (!Number.isFinite(limit) || !Number.isFinite(outstanding)) {
    return null;
  }
  return formatCurrency(limit - outstanding, "USD");
}

function CardManagement({
  cards,
  selectedCard,
  onCreateCard,
  onUpdateCard,
}: {
  cards: Card[];
  selectedCard: Card | null;
  onCreateCard?: (draft: CardDraft) => EntityMutationResult<Card>;
  onUpdateCard?: (id: string, draft: CardDraft) => EntityMutationResult<Card>;
}) {
  const [mode, setMode] = useState<CardFormMode>("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyCardDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const availableCredit = previewAvailableCredit(draft);
  const editingCard = cards.find((card) => card.id === editingId) ?? selectedCard;

  const headingId = "card-management-heading";
  const canCreate = Boolean(onCreateCard);
  const canEdit = Boolean(onUpdateCard && selectedCard);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result =
      mode === "create"
        ? onCreateCard?.(draft)
        : editingId
          ? onUpdateCard?.(editingId, draft)
          : undefined;

    if (!result) {
      return;
    }

    if (!result.ok) {
      setErrors(result.errors);
      setNotice("");
      return;
    }

    setErrors({});
    setNotice(mode === "create" ? "Card created." : "Card updated.");
    setMode("closed");
    setEditingId(null);
    setDraft(emptyCardDraft());
  };

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>Manage cards</h2>
        <p className="panel-copy">
          Create or edit the cards already represented in this snapshot.
          Available credit is calculated from the limit and outstanding balance.
        </p>
      </div>

      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="form-actions">
        {canCreate ? (
          <button
            type="button"
            className="form-action"
            onClick={() => {
              setMode("create");
              setEditingId(null);
              setDraft(emptyCardDraft());
              setErrors({});
              setNotice("");
            }}
          >
            Add card
          </button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            className="form-action-secondary"
            onClick={() => {
              setMode("edit");
              setEditingId(selectedCard!.id);
              setDraft(draftFromCard(selectedCard!));
              setErrors({});
              setNotice("");
            }}
          >
            Edit this card
          </button>
        ) : null}
      </div>

      {mode !== "closed" ? (
        <form className="entity-form" onSubmit={submit} noValidate>
          <p className="panel-copy">
            {mode === "create"
              ? "New cards receive a generated identifier. Currency stays USD."
              : `Editing ${editingCard?.name ?? "this card"} keeps its identifier (${editingCard?.id ?? ""}).`}
          </p>
          {errors.form ? (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="card-name">Card name</label>
            <input
              id="card-name"
              name="card-name"
              value={draft.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "card-name-error" : undefined}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value });
              }}
            />
            {errors.name ? (
              <p id="card-name-error" className="field-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="card-issuer">Card issuer</label>
            <input
              id="card-issuer"
              name="card-issuer"
              value={draft.issuer}
              aria-invalid={Boolean(errors.issuer)}
              aria-describedby={errors.issuer ? "card-issuer-error" : undefined}
              onChange={(event) => {
                setDraft({ ...draft, issuer: event.target.value });
              }}
            />
            {errors.issuer ? (
              <p id="card-issuer-error" className="field-error" role="alert">
                {errors.issuer}
              </p>
            ) : null}
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="card-credit-limit">Credit limit</label>
              <input
                id="card-credit-limit"
                name="card-credit-limit"
                inputMode="decimal"
                value={String(draft.creditLimit)}
                aria-invalid={Boolean(errors.creditLimit)}
                aria-describedby={
                  errors.creditLimit ? "card-credit-limit-error" : undefined
                }
                onChange={(event) => {
                  setDraft({ ...draft, creditLimit: event.target.value });
                }}
              />
              {errors.creditLimit ? (
                <p id="card-credit-limit-error" className="field-error" role="alert">
                  {errors.creditLimit}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="card-outstanding">Outstanding balance</label>
              <input
                id="card-outstanding"
                name="card-outstanding"
                inputMode="decimal"
                value={String(draft.outstandingBalance)}
                aria-invalid={Boolean(errors.outstandingBalance)}
                aria-describedby={
                  errors.outstandingBalance ? "card-outstanding-error" : undefined
                }
                onChange={(event) => {
                  setDraft({ ...draft, outstandingBalance: event.target.value });
                }}
              />
              {errors.outstandingBalance ? (
                <p id="card-outstanding-error" className="field-error" role="alert">
                  {errors.outstandingBalance}
                </p>
              ) : null}
            </div>
          </div>
          <p className="panel-copy">
            Available credit is calculated as credit limit minus outstanding
            {availableCredit ? ` · ${availableCredit}` : "."}
          </p>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="card-statement-end">Statement end</label>
              <input
                id="card-statement-end"
                name="card-statement-end"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={draft.statementPeriodEnd}
                aria-invalid={Boolean(errors.statementPeriodEnd)}
                aria-describedby={
                  errors.statementPeriodEnd
                    ? "card-statement-end-error"
                    : undefined
                }
                onChange={(event) => {
                  setDraft({ ...draft, statementPeriodEnd: event.target.value });
                }}
              />
              {errors.statementPeriodEnd ? (
                <p id="card-statement-end-error" className="field-error" role="alert">
                  {errors.statementPeriodEnd}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="card-due-date">Payment due date</label>
              <input
                id="card-due-date"
                name="card-due-date"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={draft.paymentDueDate}
                aria-invalid={Boolean(errors.paymentDueDate)}
                aria-describedby={
                  errors.paymentDueDate ? "card-due-date-error" : undefined
                }
                onChange={(event) => {
                  setDraft({ ...draft, paymentDueDate: event.target.value });
                }}
              />
              {errors.paymentDueDate ? (
                <p id="card-due-date-error" className="field-error" role="alert">
                  {errors.paymentDueDate}
                </p>
              ) : null}
            </div>
          </div>
          <div className="field">
            <label htmlFor="card-minimum-payment">Minimum payment</label>
            <input
              id="card-minimum-payment"
              name="card-minimum-payment"
              inputMode="decimal"
              value={String(draft.minimumPayment)}
              aria-invalid={Boolean(errors.minimumPayment)}
              aria-describedby={
                errors.minimumPayment ? "card-minimum-payment-error" : undefined
              }
              onChange={(event) => {
                setDraft({ ...draft, minimumPayment: event.target.value });
              }}
            />
            {errors.minimumPayment ? (
              <p id="card-minimum-payment-error" className="field-error" role="alert">
                {errors.minimumPayment}
              </p>
            ) : null}
          </div>
          <fieldset className="field">
            <legend>Payment status</legend>
            <div className="choice-row">
              {CARD_PAYMENT_STATUSES.map((status) => (
                <label key={status} className="choice">
                  <input
                    type="radio"
                    name="card-payment-status"
                    value={status}
                    checked={draft.paymentStatus === status}
                    onChange={() => {
                      setDraft({ ...draft, paymentStatus: status });
                    }}
                  />
                  {paymentStatusLabel(status)}
                </label>
              ))}
            </div>
            {errors.paymentStatus ? (
              <p className="field-error" role="alert">
                {errors.paymentStatus}
              </p>
            ) : null}
          </fieldset>
          <div className="form-actions">
            <button type="submit" className="form-action">
              {mode === "create" ? "Save new card" : "Save card changes"}
            </button>
            <button
              type="button"
              className="form-action-secondary"
              onClick={() => {
                setMode("closed");
                setEditingId(null);
                setErrors({});
              }}
            >
              Cancel card form
            </button>
          </div>
        </form>
      ) : cards.length === 0 ? (
        <p className="empty-state">Add a card to start this snapshot.</p>
      ) : null}
    </section>
  );
}

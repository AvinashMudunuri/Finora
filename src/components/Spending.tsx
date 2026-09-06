import { useMemo, useState } from "react";
import {
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  latestActivityMonth,
  listMonthlyIncomeTransactions,
  listMonthlySpendingTransactions,
} from "../domain/calculations.ts";
import {
  eventTypeLabel,
  formatCurrency,
  formatDate,
  formatMonth,
  signedAmount,
  transactionContext,
} from "../domain/finance.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type SpendingProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onOpenTransaction?: (transactionId: string) => void;
  onShowDashboard?: () => void;
  onShowAccounts?: () => void;
  onShowCards?: () => void;
  onShowTransactions?: () => void;
};

function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

export function Spending({
  accounts,
  cards,
  transactions,
  onOpenTransaction,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowTransactions,
}: SpendingProps) {
  const defaultMonth = latestActivityMonth(transactions);
  const [selected, setSelected] = useState(() => ({
    year: defaultMonth?.year ?? 2026,
    month: defaultMonth?.month ?? 1,
  }));

  const accountsById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]));
  }, [cards]);

  const income = calculateMonthlyIncome(
    transactions,
    selected.year,
    selected.month,
  );
  const spending = calculateMonthlySpending(
    transactions,
    selected.year,
    selected.month,
  );
  const savings = calculateMonthlySavings(
    transactions,
    selected.year,
    selected.month,
  );
  const incomeTransactions = listMonthlyIncomeTransactions(
    transactions,
    selected.year,
    selected.month,
  );
  const spendingTransactions = listMonthlySpendingTransactions(
    transactions,
    selected.year,
    selected.month,
  );
  const empty =
    incomeTransactions.length === 0 && spendingTransactions.length === 0;

  return (
    <div className="app-shell">
      <SiteHeader
        current="spending"
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
        onShowSpending={() => undefined}
      />

      <main className="page">
        <div className="page-intro">
          <h1>Spending</h1>
          <p className="page-lede">
            What you earned, what you spent, and the resulting savings for the
            selected month.
          </p>
        </div>

        <section className="panel" aria-labelledby="month-heading">
          <div className="month-controls">
            <button
              type="button"
              className="filter-chip"
              aria-label="Previous month"
              onClick={() => {
                setSelected((current) =>
                  shiftMonth(current.year, current.month, -1),
                );
              }}
            >
              Previous
            </button>
            <h2 id="month-heading" className="month-heading">
              {formatMonth(selected.year, selected.month)}
            </h2>
            <button
              type="button"
              className="filter-chip"
              aria-label="Next month"
              onClick={() => {
                setSelected((current) =>
                  shiftMonth(current.year, current.month, 1),
                );
              }}
            >
              Next
            </button>
          </div>

          <div className="overview-grid">
            <article className="stat-card">
              <h3>Income</h3>
              <p className="stat-value">
                {formatCurrency(income.total, income.currency)}
              </p>
            </article>
            <article className="stat-card">
              <h3>Spending</h3>
              <p className="stat-value">
                {formatCurrency(spending.total, spending.currency)}
              </p>
            </article>
            <article className="stat-card">
              <h3>Savings</h3>
              <p
                className={
                  savings.savings < 0
                    ? "stat-value stat-value-negative"
                    : "stat-value"
                }
              >
                {formatCurrency(savings.savings, savings.currency)}
              </p>
              <p className="stat-note">Income − spending</p>
            </article>
          </div>
        </section>

        {empty ? (
          <p className="empty-state">No income or spending in this month.</p>
        ) : (
          <>
            <EvidenceList
              heading="Income"
              headingId="income-evidence-heading"
              copy="Income events in the selected month."
              emptyCopy="No income in this month."
              transactions={incomeTransactions}
              accountsById={accountsById}
              cardsById={cardsById}
              onOpenTransaction={onOpenTransaction}
            />
            <EvidenceList
              heading="Spending"
              headingId="spending-evidence-heading"
              copy="Expenses and card purchases in the selected month."
              emptyCopy="No spending in this month."
              transactions={spendingTransactions}
              accountsById={accountsById}
              cardsById={cardsById}
              onOpenTransaction={onOpenTransaction}
            />
          </>
        )}
      </main>
    </div>
  );
}

function EvidenceList({
  heading,
  headingId,
  copy,
  emptyCopy,
  transactions,
  accountsById,
  cardsById,
  onOpenTransaction,
}: {
  heading: string;
  headingId: string;
  copy: string;
  emptyCopy: string;
  transactions: Transaction[];
  accountsById: Map<string, Account>;
  cardsById: Map<string, Card>;
  onOpenTransaction?: (transactionId: string) => void;
}) {
  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-header">
        <h2 id={headingId}>{heading}</h2>
        <p className="panel-copy">{copy}</p>
      </div>

      {transactions.length === 0 ? (
        <p className="empty-state">{emptyCopy}</p>
      ) : (
        <ol className="transaction-list">
          {transactions.map((transaction) => {
            const amount = signedAmount(transaction);
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
  );
}

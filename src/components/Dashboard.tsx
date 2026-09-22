import {
  calculateAssetBreakdown,
  calculateIncomeChange,
  calculateMonthlySavings,
  calculateNetWorth,
  calculateNetWorthChange,
  calculateSavingsChange,
  calculateSpendingChange,
  latestActivityMonth,
  listCardPaymentObligations,
  listInvestmentAccounts,
  listMonthlyNetWorthHistory,
  listRecentMonthlyFlows,
} from "../domain/calculations.ts";
import { netWorthChangeDirectionLabel } from "../domain/insights.ts";
import { AttentionInsights } from "./AttentionInsights.tsx";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  paymentStatusLabel,
} from "../domain/finance.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type DashboardProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  systemNotice?: string;
  onShowCards?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onShowAccounts?: () => void;
  onOpenCard?: (cardId: string) => void;
  onOpenAccount?: (accountId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
  onShowInsights?: () => void;
};

function signedChangeAmount(
  direction: "increased" | "decreased" | "unchanged",
  absoluteChange: number,
): number {
  return direction === "decreased" ? -absoluteChange : absoluteChange;
}

export function Dashboard({
  accounts,
  cards,
  transactions,
  systemNotice,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowAccounts,
  onOpenAccount,
  onOpenCard,
  onOpenTransaction,
  onShowInsights,
}: DashboardProps) {
  const worth = calculateNetWorth(accounts, cards);
  const assets = calculateAssetBreakdown(accounts);
  const investmentAccounts = listInvestmentAccounts(accounts);
  const activityMonth = latestActivityMonth(transactions);
  const selectedYear = activityMonth?.year ?? 0;
  const selectedMonth = activityMonth?.month ?? 1;
  const monthlyFlow = calculateMonthlySavings(
    transactions,
    selectedYear,
    selectedMonth,
  );
  const netWorthChange = calculateNetWorthChange(accounts, cards, transactions);
  const spendingChange = calculateSpendingChange(transactions);
  const incomeChange = calculateIncomeChange(transactions);
  const savingsChange = calculateSavingsChange(transactions);
  const netWorthHistory = listMonthlyNetWorthHistory(
    accounts,
    cards,
    transactions,
  );
  const monthlyHistory = listRecentMonthlyFlows(transactions);
  const cardPaymentObligations = listCardPaymentObligations(cards);
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  return (
    <div className="app-shell">
      <SiteHeader
        current="dashboard"
        systemNotice={systemNotice}
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
            What you have now, what changed, what needs attention, and how to
            inspect it.
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
                <div className="investment-inspect">
                  {investmentAccounts.length === 0 ? (
                    <p className="stat-note">
                      No investment accounts in this snapshot.
                    </p>
                  ) : (
                    <>
                      <p className="stat-note">
                        {investmentAccounts.length === 1
                          ? "1 investment account"
                          : `${investmentAccounts.length} investment accounts`}
                      </p>
                      <ul
                        className="investment-account-list"
                        aria-label="Investment accounts"
                      >
                        {investmentAccounts.map((account) => (
                          <li key={account.id}>
                            <div className="investment-account-row">
                              <span>{account.name}</span>
                              <span className="account-balance">
                                {formatCurrency(account.balance, account.currency)}
                              </span>
                            </div>
                            {onOpenAccount ? (
                              <button
                                type="button"
                                className="inline-action"
                                onClick={() => {
                                  onOpenAccount(account.id);
                                }}
                              >
                                Inspect {account.name}
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
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

        <section className="panel" aria-labelledby="change-heading">
          <div className="panel-header">
            <h2 id="change-heading">What changed</h2>
            <p className="panel-copy">
              Existing net-worth, spending, income, and savings comparisons for
              stored months. Unchanged values stay visible here. Attention only
              includes meaningful movement.
            </p>
          </div>

          <div className="overview-grid change-grid">
            <article className="stat-card">
              <h3>Net worth change</h3>
              {netWorthChange ? (
                <>
                  <p className="stat-value">
                    {formatCurrency(
                      signedChangeAmount(
                        netWorthChange.direction,
                        netWorthChange.absoluteChange,
                      ),
                      netWorthChange.currency,
                      netWorthChange.direction !== "unchanged",
                    )}
                  </p>
                  <dl className="position-breakdown">
                    <div>
                      <dt>Current</dt>
                      <dd>
                        {formatCurrency(
                          netWorthChange.currentNetWorth,
                          netWorthChange.currency,
                        )}
                      </dd>
                    </div>
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
                      <dt>Direction</dt>
                      <dd>
                        {netWorthChangeDirectionLabel(netWorthChange.direction)}
                      </dd>
                    </div>
                  </dl>
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
                </>
              ) : (
                <p className="stat-note">
                  No recorded activity month to compare.
                </p>
              )}
            </article>
            <article className="stat-card">
              <h3>Spending change</h3>
              {spendingChange ? (
                <>
                  <p className="stat-value">
                    {formatCurrency(
                      signedChangeAmount(
                        spendingChange.direction,
                        spendingChange.absoluteChange,
                      ),
                      spendingChange.currency,
                      spendingChange.direction !== "unchanged",
                    )}
                  </p>
                  <dl className="position-breakdown">
                    <div>
                      <dt>This month</dt>
                      <dd>
                        {formatCurrency(
                          spendingChange.currentSpending,
                          spendingChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Last month</dt>
                      <dd>
                        {formatCurrency(
                          spendingChange.previousSpending,
                          spendingChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Direction</dt>
                      <dd>
                        {netWorthChangeDirectionLabel(spendingChange.direction)}
                      </dd>
                    </div>
                  </dl>
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
                </>
              ) : (
                <p className="stat-note">
                  No stored months to compare spending.
                </p>
              )}
            </article>
            <article className="stat-card">
              <h3>Income change</h3>
              {incomeChange ? (
                <>
                  <p className="stat-value">
                    {formatCurrency(
                      signedChangeAmount(
                        incomeChange.direction,
                        incomeChange.absoluteChange,
                      ),
                      incomeChange.currency,
                      incomeChange.direction !== "unchanged",
                    )}
                  </p>
                  <dl className="position-breakdown">
                    <div>
                      <dt>This month</dt>
                      <dd>
                        {formatCurrency(
                          incomeChange.currentIncome,
                          incomeChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Last month</dt>
                      <dd>
                        {formatCurrency(
                          incomeChange.previousIncome,
                          incomeChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Direction</dt>
                      <dd>
                        {netWorthChangeDirectionLabel(incomeChange.direction)}
                      </dd>
                    </div>
                  </dl>
                  <p className="stat-note">
                    {formatMonth(
                      incomeChange.currentPeriod.year,
                      incomeChange.currentPeriod.month,
                    )}{" "}
                    compared with{" "}
                    {formatMonth(
                      incomeChange.previousPeriod.year,
                      incomeChange.previousPeriod.month,
                    )}
                  </p>
                </>
              ) : (
                <p className="stat-note">
                  No stored months to compare income.
                </p>
              )}
            </article>
            <article className="stat-card">
              <h3>Savings change</h3>
              {savingsChange ? (
                <>
                  <p
                    className={
                      signedChangeAmount(
                        savingsChange.direction,
                        savingsChange.absoluteChange,
                      ) < 0
                        ? "stat-value stat-value-negative"
                        : "stat-value"
                    }
                  >
                    {formatCurrency(
                      signedChangeAmount(
                        savingsChange.direction,
                        savingsChange.absoluteChange,
                      ),
                      savingsChange.currency,
                      savingsChange.direction !== "unchanged",
                    )}
                  </p>
                  <dl className="position-breakdown">
                    <div>
                      <dt>This month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.currentSavings,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Last month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.previousSavings,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Income this month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.currentIncome,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Income last month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.previousIncome,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Spending this month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.currentSpending,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Spending last month</dt>
                      <dd>
                        {formatCurrency(
                          savingsChange.previousSpending,
                          savingsChange.currency,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Direction</dt>
                      <dd>
                        {netWorthChangeDirectionLabel(savingsChange.direction)}
                      </dd>
                    </div>
                  </dl>
                  <p className="stat-note">Income − spending</p>
                  <p className="stat-note">
                    {formatMonth(
                      savingsChange.currentPeriod.year,
                      savingsChange.currentPeriod.month,
                    )}{" "}
                    compared with{" "}
                    {formatMonth(
                      savingsChange.previousPeriod.year,
                      savingsChange.previousPeriod.month,
                    )}
                  </p>
                </>
              ) : (
                <p className="stat-note">
                  No stored months to compare savings.
                </p>
              )}
            </article>
          </div>
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

          <div className="flow-obligation">
            <h3 id="card-payment-heading">Card payment</h3>
            <p className="stat-note">
              Stored minimum payment for cards that are due or overdue. This is
              not deducted from savings.
            </p>
            {cardPaymentObligations.length === 0 ? (
              <p className="stat-note stat-note-quiet">
                No stored card payment is due.
              </p>
            ) : (
              <ul className="flow-obligation-list">
                {cardPaymentObligations.map((obligation) => {
                  const card = cardsById.get(obligation.cardId);
                  if (!card) {
                    return null;
                  }

                  return (
                    <li key={obligation.cardId}>
                      <p className="flow-obligation-identity">
                        {card.name} · {paymentStatusLabel(obligation.paymentStatus)}
                      </p>
                      <p className="stat-note">
                        Minimum payment{" "}
                        {formatCurrency(obligation.minimumPayment, card.currency)}
                        {" · Due "}
                        <time dateTime={obligation.paymentDueDate}>
                          {formatDate(obligation.paymentDueDate)}
                        </time>
                      </p>
                      {onOpenCard ? (
                        <button
                          type="button"
                          className="inline-action"
                          onClick={() => {
                            onOpenCard(obligation.cardId);
                          }}
                        >
                          Inspect {card.name}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="attention-heading">
          <div className="panel-header">
            <h2 id="attention-heading">Attention</h2>
            <p className="panel-copy">
              What needs inspection now, from stored records. Open Insights
              for why each item appears and the supporting evidence. No
              recommendations are invented.
            </p>
          </div>
          <AttentionInsights
            accounts={accounts}
            cards={cards}
            transactions={transactions}
            presentation="summary"
            onOpenCard={onOpenCard}
            onOpenTransaction={onOpenTransaction}
            onShowSpending={onShowSpending}
          />
        </section>

        <section className="panel" aria-labelledby="net-worth-history-heading">
          <div className="panel-header">
            <h2 id="net-worth-history-heading">Net worth history</h2>
            <p className="panel-copy">
              Stored activity months only. Open Spending for the monthly
              breakdown behind these points.
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

        <section className="panel" aria-labelledby="inspect-heading">
          <div className="panel-header">
            <h2 id="inspect-heading">Inspect</h2>
            <p className="panel-copy">
              Open the existing Finora surfaces for accounts, cards,
              transactions, spending, and insights. This overview does not
              replace them.
            </p>
          </div>
          <div className="inspect-paths">
            {onShowTransactions ? (
              <button
                type="button"
                className="inline-action"
                onClick={onShowTransactions}
              >
                View transactions
              </button>
            ) : null}
            {onShowInsights ? (
              <button
                type="button"
                className="inline-action"
                onClick={onShowInsights}
              >
                View insights
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

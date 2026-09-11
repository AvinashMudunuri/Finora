import {
  calculateAssetBreakdown,
  calculateMonthlySavings,
  calculateNetWorth,
  calculateNetWorthChange,
  calculateSpendingChange,
  latestActivityMonth,
  listMonthlyNetWorthHistory,
  listRecentMonthlyFlows,
} from "../domain/calculations.ts";
import { netWorthChangeDirectionLabel } from "../domain/insights.ts";
import { AttentionInsights } from "./AttentionInsights.tsx";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
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
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowAccounts,
  onOpenCard,
  onOpenTransaction,
  onShowInsights,
}: DashboardProps) {
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
  const netWorthChange = calculateNetWorthChange(accounts, cards, transactions);
  const spendingChange = calculateSpendingChange(transactions);
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
              Existing net-worth and spending comparisons for stored months.
              Unchanged values stay visible here. Attention only includes
              meaningful movement.
            </p>
          </div>

          <div className="overview-grid">
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

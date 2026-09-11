import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateAssetBreakdown,
  calculateCardPaymentAttention,
  calculateHighCardUtilization,
  calculateLiquidAssets,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
  calculateNetWorthChange,
  calculateSpendingChange,
  latestActivityMonth,
  listMonthlyNetWorthHistory,
  listNetWorthChangeBreakdown,
  listNetWorthChangeEvidence,
  listRecentMonthlyFlows,
  listSpendingChangeDrivers,
} from "../domain/calculations.ts";
import type { Account, Card, Transaction } from "../domain/types.ts";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  formatUtilization,
  paymentStatusLabel,
  signedAmount,
} from "../domain/finance.ts";
import {
  ATTENTION_EMPTY_COPY,
  attentionTitle,
  listAttentionInsights,
} from "../domain/insights.ts";
import { Dashboard } from "./Dashboard.tsx";

function renderDashboard() {
  return render(
    <Dashboard
      accounts={fixtureAccounts}
      cards={fixtureCards}
      transactions={fixtureTransactions}
    />,
  );
}

function attentionArticle(title: string) {
  const article = screen.getByRole("heading", { name: title }).closest("article");
  expect(article).not.toBeNull();
  return article!;
}

describe("Finora dashboard", () => {
  it("renders the dashboard with a product heading", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Finora" })).toBeInTheDocument();
  });

  it("tells the position, change, attention, and inspect story without dumping accounts", () => {
    renderDashboard();

    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "What changed" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Attention" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Inspect" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Accounts" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recent transactions" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Everyday Checking")).not.toBeInTheDocument();
    expect(screen.queryByText("Emergency Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Investment Account")).not.toBeInTheDocument();
  });

  it("shows calculated net worth and monthly spending from existing calculations", () => {
    renderDashboard();

    const overview = screen.getByRole("region", { name: "Overview" });
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);
    const period = latestActivityMonth(fixtureTransactions);
    const flow = calculateMonthlySavings(
      fixtureTransactions,
      period!.year,
      period!.month,
    );
    const monthly = screen.getByRole("region", { name: "Monthly flow" });

    expect(
      within(overview).getByText(formatCurrency(worth.netWorth, worth.currency)),
    ).toBeInTheDocument();
    expect(within(overview).queryByText("$2,049.61")).not.toBeInTheDocument();
    expect(
      within(monthly).getByText(formatCurrency(flow.spending, flow.currency)),
    ).toBeInTheDocument();
    expect(screen.queryByText(`${formatUtilization(1842.19 / 5000)} utilized · USD`)).not.toBeInTheDocument();
  });

  it("keeps transaction evidence on existing attention inspect paths", () => {
    renderDashboard();

    const evidence = within(attentionArticle("Net worth increased")).getByRole(
      "list",
      { name: "Net worth change evidence" },
    );
    expect(within(evidence).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(evidence).getByText("Whole Foods Market")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recent transactions" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Inflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Outflow")).not.toBeInTheDocument();
  });

  it("formats transaction amounts from their financial event", () => {
    const paycheck = fixtureTransactions.find(
      (tx) => tx.description === "Payroll — Acme Corp",
    );
    const groceries = fixtureTransactions.find(
      (tx) => tx.description === "Whole Foods Market",
    );

    expect(paycheck).toBeDefined();
    expect(groceries).toBeDefined();
    expect(formatCurrency(signedAmount(paycheck!), "USD", true)).toBe("+$3,200.00");
    expect(formatCurrency(signedAmount(groceries!), "USD", true)).toBe("-$87.42");
  });

  it("opens inspect paths when callbacks are provided", async () => {
    const user = userEvent.setup();
    const onShowTransactions = vi.fn();
    const onShowInsights = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowTransactions={onShowTransactions}
        onShowInsights={onShowInsights}
      />,
    );

    const inspect = screen.getByRole("region", { name: "Inspect" });
    await user.click(within(inspect).getByRole("button", { name: "View transactions" }));
    await user.click(within(inspect).getByRole("button", { name: "View insights" }));

    expect(onShowTransactions).toHaveBeenCalledTimes(1);
    expect(onShowInsights).toHaveBeenCalledTimes(1);
  });

  it("renders the provided dataset without fixture names or a transaction browser", () => {
    render(
      <Dashboard
        accounts={[
          {
            id: "acc-harbor",
            name: "Harbor Checking",
            type: "bank",
            balance: 100,
            currency: "USD",
          },
        ]}
        cards={[]}
        transactions={[
          {
            id: "txn-harbor",
            date: "2026-09-01",
            description: "Harbor Payroll",
            amount: 10,
            currency: "USD",
            eventType: "income",
            accountId: "acc-harbor",
            counterpartyAccountId: null,
            cardId: null,
          },
        ]}
      />,
    );

    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getAllByText("$100.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Harbor Payroll")).toBeInTheDocument();
    expect(screen.queryByText("Everyday Checking")).not.toBeInTheDocument();
    expect(screen.queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recent transactions" }),
    ).not.toBeInTheDocument();
  });

  it("shows first-class net worth and spending change from existing calculations", () => {
    renderDashboard();

    const change = screen.getByRole("region", { name: "What changed" });
    const netWorth = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const spending = calculateSpendingChange(fixtureTransactions);

    expect(netWorth).not.toBeNull();
    expect(spending).not.toBeNull();
    expect(within(change).getByRole("heading", { name: "Net worth change" })).toBeInTheDocument();
    expect(within(change).getByRole("heading", { name: "Spending change" })).toBeInTheDocument();
    expect(
      within(change).getByText(
        formatCurrency(netWorth!.currentNetWorth, netWorth!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(change).getByText(
        formatCurrency(netWorth!.previousNetWorth, netWorth!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(change).getByText(
        formatCurrency(netWorth!.absoluteChange, netWorth!.currency, true),
      ),
    ).toBeInTheDocument();
    expect(within(change).getByText("Increased")).toBeInTheDocument();
    expect(
      within(change).getByText(
        formatCurrency(spending!.currentSpending, spending!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(change).getByText(
        formatCurrency(spending!.previousSpending, spending!.currency),
      ),
    ).toBeInTheDocument();
    expect(within(change).getByText("Decreased")).toBeInTheDocument();
  });

  it("shows assets, liabilities, and the asset breakdown from existing calculations", () => {
    renderDashboard();

    const overview = screen.getByRole("region", { name: "Overview" });
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);
    const assets = calculateAssetBreakdown(fixtureAccounts);
    const liquid = calculateLiquidAssets(fixtureAccounts);

    expect(within(overview).getByRole("heading", { name: "Assets" })).toBeInTheDocument();
    expect(within(overview).getByRole("heading", { name: "Liabilities" })).toBeInTheDocument();
    expect(
      within(overview).getAllByText(formatCurrency(worth.assets, worth.currency))
        .length,
    ).toBeGreaterThan(0);
    expect(
      within(overview).getAllByText(
        formatCurrency(worth.liabilities, worth.currency),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(overview).getByText(formatCurrency(assets.bank, "USD")),
    ).toBeInTheDocument();
    expect(
      within(overview).getByText(formatCurrency(assets.cash, "USD")),
    ).toBeInTheDocument();
    expect(
      within(overview).getByText(formatCurrency(assets.investment, "USD")),
    ).toBeInTheDocument();
    expect(
      within(overview).getByText(formatCurrency(liquid, "USD")),
    ).toBeInTheDocument();
    expect(within(overview).getByText("Assets − liabilities")).toBeInTheDocument();
  });

  it("shows monthly income, spending, and savings for the same latest activity month", () => {
    renderDashboard();

    const period = latestActivityMonth(fixtureTransactions);
    const flow = calculateMonthlySavings(
      fixtureTransactions,
      period!.year,
      period!.month,
    );
    const region = screen.getByRole("region", { name: "Monthly flow" });

    expect(period).not.toBeNull();
    expect(flow.year).toBe(period!.year);
    expect(flow.month).toBe(period!.month);
    expect(flow.savings).toBe(flow.income - flow.spending);
    expect(
      within(region).getByText(formatMonth(period!.year, period!.month)),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { name: "Income" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { name: "Spending" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { name: "Savings" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.income, flow.currency)),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.spending, flow.currency)),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.savings, flow.currency)),
    ).toBeInTheDocument();
    expect(within(region).queryByText("$4.12")).not.toBeInTheDocument();
    expect(within(region).queryByText("$2,049.61")).not.toBeInTheDocument();
  });

  it("uses existing income, spending, and savings semantics for the latest month", () => {
    const transactions: Transaction[] = [
      {
        id: "txn-income",
        date: "2026-12-20",
        description: "Payroll",
        amount: 1000,
        currency: "USD",
        eventType: "income",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-expense",
        date: "2026-12-21",
        description: "Groceries",
        amount: 80,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-card",
        date: "2026-12-22",
        description: "Card dinner",
        amount: 40,
        currency: "USD",
        eventType: "card_purchase",
        accountId: null,
        counterpartyAccountId: null,
        cardId: "card-harbor",
      },
      {
        id: "txn-transfer",
        date: "2026-12-23",
        description: "To savings",
        amount: 200,
        currency: "USD",
        eventType: "transfer",
        accountId: "acc-harbor",
        counterpartyAccountId: "acc-save",
        cardId: null,
      },
      {
        id: "txn-payment",
        date: "2026-12-24",
        description: "Card payment",
        amount: 40,
        currency: "USD",
        eventType: "card_payment",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: "card-harbor",
      },
      {
        id: "txn-invest",
        date: "2026-12-25",
        description: "Brokerage buy",
        amount: 300,
        currency: "USD",
        eventType: "investment",
        accountId: "acc-invest",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-jan",
        date: "2027-01-02",
        description: "January coffee",
        amount: 6,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];
    const accounts: Account[] = [
      {
        id: "acc-harbor",
        name: "Harbor Checking",
        type: "bank",
        balance: 100,
        currency: "USD",
      },
    ];
    const period = latestActivityMonth(transactions);
    const flow = calculateMonthlySavings(
      transactions,
      period!.year,
      period!.month,
    );
    const spending = calculateMonthlySpending(
      transactions,
      period!.year,
      period!.month,
    );

    render(
      <Dashboard
        accounts={accounts}
        cards={[]}
        transactions={transactions}
      />,
    );

    const region = screen.getByRole("region", { name: "Monthly flow" });
    expect(period).toEqual({ year: 2027, month: 1 });
    expect(flow.income).toBe(0);
    expect(flow.spending).toBe(6);
    expect(flow.savings).toBe(-6);
    expect(spending.total).toBe(6);
    expect(
      within(region).getByText(formatMonth(period!.year, period!.month)),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.income, flow.currency)),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.spending, flow.currency)),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(formatCurrency(flow.savings, flow.currency)),
    ).toBeInTheDocument();
    expect(within(region).queryByText("$1,000.00")).not.toBeInTheDocument();
    expect(within(region).queryByText("$80.00")).not.toBeInTheDocument();
  });

  it("renders dashboard attention from the same list as Insights", () => {
    renderDashboard();

    const titles = listAttentionInsights(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    ).map(attentionTitle);

    expect(titles).toEqual([
      "Card payment due",
      "Spending decreased",
      "Net worth increased",
    ]);
    expect(
      within(screen.getByRole("list", { name: "Attention insights" }))
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(titles);
    expect(screen.queryByText("Consider paying down the balance.")).not.toBeInTheDocument();
  });

  it("shows zero monthly flow when there are no transactions", () => {
    render(
      <Dashboard
        accounts={[
          {
            id: "acc-harbor",
            name: "Harbor Checking",
            type: "bank",
            balance: 100,
            currency: "USD",
          },
        ]}
        cards={[]}
        transactions={[]}
      />,
    );

    const region = screen.getByRole("region", { name: "Monthly flow" });
    expect(
      within(region).getByText("No transactions in this snapshot"),
    ).toBeInTheDocument();
    expect(within(region).getAllByText("$0.00").length).toBe(3);
    expect(screen.queryByRole("heading", { name: "Spending decreased" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Spending increased" })).not.toBeInTheDocument();
  });

  it("opens accounts and cards from the financial-position cards when callbacks are provided", async () => {
    const user = userEvent.setup();
    const onShowAccounts = vi.fn();
    const onShowCards = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowAccounts={onShowAccounts}
        onShowCards={onShowCards}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View accounts" }));
    await user.click(screen.getByRole("button", { name: "View cards" }));

    expect(onShowAccounts).toHaveBeenCalledTimes(1);
    expect(onShowCards).toHaveBeenCalledTimes(1);
  });

  it("does not render a card-utilization insight when no card qualifies", () => {
    renderDashboard();

    expect(calculateHighCardUtilization(fixtureCards)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "High card utilization" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("needs attention")).not.toBeInTheDocument();
  });

  it("renders the high-utilization insight from the calculated result", () => {
    const cards: Card[] = [
      {
        ...fixtureCards[1]!,
        outstandingBalance: 400,
        availableCredit: fixtureCards[1]!.creditLimit - 400,
      },
      {
        ...fixtureCards[0]!,
        outstandingBalance: 3700,
        availableCredit: fixtureCards[0]!.creditLimit - 3700,
      },
    ];
    const insight = calculateHighCardUtilization(cards);
    const attentionCard = cards.find((card) => card.id === insight?.cardId);

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={cards}
        transactions={fixtureTransactions}
      />,
    );

    const region = attentionArticle("High card utilization");
    expect(insight?.cardId).toBe("card-visa");
    expect(attentionCard?.name).toBe("Visa Rewards");
    expect(within(region).getByText("Priority 3")).toBeInTheDocument();
    expect(
      within(region).getByText(
        `Visa Rewards is at ${formatUtilization(insight!.utilization)}, at or above ${formatUtilization(insight!.threshold)}.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `Outstanding: ${formatCurrency(insight!.outstandingBalance, attentionCard!.currency)}`,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `Credit limit: ${formatCurrency(insight!.creditLimit, attentionCard!.currency)}`,
      ),
    ).toBeInTheDocument();
    expect(within(region).queryByText("Amex Everyday")).not.toBeInTheDocument();
    expect(within(region).queryByText(/consider/i)).not.toBeInTheDocument();
  });

  it("opens the qualifying card from the utilization insight", async () => {
    const user = userEvent.setup();
    const onOpenCard = vi.fn();
    const cards: Card[] = [
      {
        ...fixtureCards[0]!,
        outstandingBalance: 3700,
        availableCredit: fixtureCards[0]!.creditLimit - 3700,
      },
    ];

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={cards}
        transactions={fixtureTransactions}
        onOpenCard={onOpenCard}
      />,
    );

    const region = attentionArticle("High card utilization");
    await user.click(
      within(region).getByRole("button", { name: "Inspect card" }),
    );
    expect(onOpenCard).toHaveBeenCalledWith("card-visa");
  });

  it("renders the spending change insight from the calculated result", () => {
    renderDashboard();

    const insight = calculateSpendingChange(fixtureTransactions);
    expect(insight).not.toBeNull();

    const region = attentionArticle("Spending decreased");
    expect(within(region).getByText("Priority 4")).toBeInTheDocument();
    expect(
      within(region).getByText(
        `You spent ${formatCurrency(insight!.currentSpending, insight!.currency)} this month, compared with ${formatCurrency(insight!.previousSpending, insight!.currency)} last month.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `${formatMonth(insight!.currentPeriod.year, insight!.currentPeriod.month)} compared with ${formatMonth(insight!.previousPeriod.year, insight!.previousPeriod.month)}`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Spending increased" })).not.toBeInTheDocument();

    const drivers = listSpendingChangeDrivers(fixtureTransactions, insight!);
    const driverList = within(region).getByRole("list", {
      name: "Spending change drivers",
    });
    expect(
      within(region).getByText(
        `Largest spending in ${formatMonth(drivers[0]!.period.year, drivers[0]!.period.month)}`,
      ),
    ).toBeInTheDocument();
    expect(within(driverList).getByText("Rent — Oak Street Apt")).toBeInTheDocument();
    expect(within(driverList).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(driverList).getByText("Transit — Metro Card")).toBeInTheDocument();
    expect(within(driverList).queryByText("Whole Foods Market")).not.toBeInTheDocument();
    expect(within(driverList).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
  });

  it("renders an increased insight from the calculated result, not hard-coded fixture copy", () => {
    const transactions = [
      {
        id: "txn-prev",
        date: "2026-03-10",
        description: "Older grocery",
        amount: 20,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-current",
        date: "2026-04-02",
        description: "Newer grocery",
        amount: 55,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];
    const insight = calculateSpendingChange(transactions);

    render(
      <Dashboard
        accounts={[
          {
            id: "acc-harbor",
            name: "Harbor Checking",
            type: "bank",
            balance: 100,
            currency: "USD",
          },
        ]}
        cards={[]}
        transactions={transactions}
      />,
    );

    const region = attentionArticle("Spending increased");
    expect(insight?.direction).toBe("increased");
    expect(within(region).getByText("Priority 4")).toBeInTheDocument();
    expect(
      within(region).getByText(
        `You spent ${formatCurrency(55, "USD")} this month, compared with ${formatCurrency(20, "USD")} last month.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Spending decreased")).not.toBeInTheDocument();
    expect(screen.queryByText("$87.42")).not.toBeInTheDocument();

    const driverList = within(region).getByRole("list", {
      name: "Spending change drivers",
    });
    expect(within(driverList).getByText("Newer grocery")).toBeInTheDocument();
    expect(within(driverList).queryByText("Older grocery")).not.toBeInTheDocument();
  });

  it("omits unchanged spending from attention", () => {
    const transactions = [
      {
        id: "txn-prev",
        date: "2026-03-10",
        description: "Older grocery",
        amount: 40,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-current",
        date: "2026-04-02",
        description: "Newer grocery",
        amount: 40,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];

    render(
      <Dashboard
        accounts={[
          {
            id: "acc-harbor",
            name: "Harbor Checking",
            type: "bank",
            balance: 100,
            currency: "USD",
          },
        ]}
        cards={[]}
        transactions={transactions}
      />,
    );

    expect(calculateSpendingChange(transactions)?.direction).toBe("unchanged");
    expect(
      screen.queryByRole("heading", { name: "Spending unchanged" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Spending change drivers" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Largest spending in")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "What changed" })).getByText(
        "Unchanged",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "What changed" })).getByRole(
        "heading",
        { name: "Spending change" },
      ),
    ).toBeInTheDocument();
  });

  it("does not render a spending change insight when there is no activity month", () => {
    render(
      <Dashboard
        accounts={[
          {
            id: "acc-harbor",
            name: "Harbor Checking",
            type: "bank",
            balance: 100,
            currency: "USD",
          },
        ]}
        cards={[]}
        transactions={[]}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Spending decreased" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Spending increased" })).not.toBeInTheDocument();
  });

  it("opens spending from the insight when a callback is provided", async () => {
    const user = userEvent.setup();
    const onShowSpending = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowSpending={onShowSpending}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Inspect spending" }),
    );

    expect(onShowSpending).toHaveBeenCalledTimes(1);
  });

  it("opens a spending-change driver through the existing transaction callback", async () => {
    const user = userEvent.setup();
    const onOpenTransaction = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onOpenTransaction={onOpenTransaction}
      />,
    );

    const region = attentionArticle("Spending decreased");
    await user.click(
      within(region).getByRole("button", { name: "View Rent — Oak Street Apt" }),
    );

    expect(onOpenTransaction).toHaveBeenCalledWith("txn-004");
  });

  it("shows current, previous, absolute change, and direction in What changed", () => {
    renderDashboard();

    const region = screen.getByRole("region", { name: "What changed" });
    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const netWorthCard = within(region)
      .getByRole("heading", { name: "Net worth change" })
      .closest("article");

    expect(change).not.toBeNull();
    expect(netWorthCard).not.toBeNull();
    expect(
      within(netWorthCard!).getByText(
        formatCurrency(change!.currentNetWorth, change!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(netWorthCard!).getByText(
        formatCurrency(change!.previousNetWorth, change!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(netWorthCard!).getByText(
        formatCurrency(change!.absoluteChange, change!.currency, true),
      ),
    ).toBeInTheDocument();
    expect(within(netWorthCard!).getByText("Increased")).toBeInTheDocument();
    expect(within(netWorthCard!).queryByText("Decreased")).not.toBeInTheDocument();
  });

  it("renders the net-worth change insight and evidence from the calculated result", () => {
    renderDashboard();

    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const evidence = listNetWorthChangeEvidence(fixtureTransactions, change!);
    const region = attentionArticle("Net worth increased");

    expect(within(region).getByText("Priority 5")).toBeInTheDocument();
    expect(
      within(region).getByText(
        `Net worth is ${formatCurrency(change!.currentNetWorth, change!.currency)} this month, compared with ${formatCurrency(change!.previousNetWorth, change!.currency)} last month.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `${formatMonth(change!.currentPeriod.year, change!.currentPeriod.month)} compared with ${formatMonth(change!.previousPeriod.year, change!.previousPeriod.month)}`,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `Change: ${formatCurrency(change!.absoluteChange, change!.currency, true)}`,
      ),
    ).toBeInTheDocument();

    const evidenceList = within(region).getByRole("list", {
      name: "Net worth change evidence",
    });
    expect(within(evidenceList).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(evidenceList).getByText("Whole Foods Market")).toBeInTheDocument();
    expect(within(evidenceList).queryByText("Payment — Thank you")).not.toBeInTheDocument();
    expect(evidence.map((item) => item.transactionId)).toEqual(["txn-001", "txn-002"]);
    expect(
      within(region).queryByText(
        "Stored records do not establish a trustworthy cause for this change.",
      ),
    ).not.toBeInTheDocument();
  });

  it("renders a decreased net-worth insight from the calculated result", () => {
    const transactions = fixtureTransactions.filter(
      (transaction) => transaction.id !== "txn-001",
    );
    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      transactions,
    );

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={transactions}
      />,
    );

    const region = attentionArticle("Net worth decreased");
    expect(change?.direction).toBe("decreased");
    expect(screen.queryByRole("heading", { name: "Net worth increased" })).not.toBeInTheDocument();
    expect(
      within(region).getByText("Whole Foods Market"),
    ).toBeInTheDocument();
  });

  it("omits unchanged net worth from attention while overview still shows the comparison", () => {
    const transactions = fixtureTransactions.filter(
      (transaction) => transaction.id !== "txn-001" && transaction.id !== "txn-002",
    );
    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      transactions,
    );

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={transactions}
      />,
    );

    const region = screen.getByRole("region", { name: "What changed" });
    expect(change?.direction).toBe("unchanged");
    expect(within(region).getByText("Unchanged")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Net worth unchanged" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Net worth change evidence" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Stored records do not show a net-worth movement to explain.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not render a net-worth change insight when there is no activity month", () => {
    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={[]}
      />,
    );

    const region = screen.getByRole("region", { name: "What changed" });
    expect(
      within(region).getByText("No recorded activity month to compare."),
    ).toBeInTheDocument();
    expect(
      within(region).getByText("No stored months to compare spending."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Net worth increased" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Net worth decreased" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No stored activity months to derive a history from."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No stored activity months to compare income, spending, and savings.",
      ),
    ).toBeInTheDocument();
  });

  it("opens net-worth evidence through the existing transaction callback", async () => {
    const user = userEvent.setup();
    const onOpenTransaction = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onOpenTransaction={onOpenTransaction}
      />,
    );

    const region = attentionArticle("Net worth increased");
    await user.click(
      within(region).getByRole("button", {
        name: "Inspect Payroll — Acme Corp",
      }),
    );

    expect(onOpenTransaction).toHaveBeenCalledWith("txn-001");
  });

  it("renders the payment-attention insight from the calculated due result", () => {
    renderDashboard();

    const insight = calculateCardPaymentAttention(fixtureCards);
    const attentionCard = fixtureCards.find((card) => card.id === insight?.cardId);

    expect(insight?.paymentStatus).toBe("due");
    const region = attentionArticle("Card payment due");
    expect(within(region).getByText("Priority 2")).toBeInTheDocument();
    expect(region.textContent).toContain(
      `${attentionCard!.name} · ${paymentStatusLabel(insight!.paymentStatus)}`,
    );
    expect(region.textContent).toContain(
      `Due: ${formatDate(insight!.paymentDueDate)}`,
    );
    expect(region.textContent).toContain(
      `Minimum payment: ${formatCurrency(insight!.minimumPayment, attentionCard!.currency)}`,
    );
    expect(region.textContent).toContain(
      `Outstanding: ${formatCurrency(insight!.outstandingBalance, attentionCard!.currency)}`,
    );
    expect(within(region).queryByText("Amex Everyday")).not.toBeInTheDocument();
  });

  it("renders an overdue payment-attention insight from the calculated result", () => {
    const cards: Card[] = [
      {
        ...fixtureCards[1]!,
        paymentStatus: "current",
      },
      {
        ...fixtureCards[0]!,
        paymentStatus: "overdue",
        paymentDueDate: "2026-08-15",
        minimumPayment: 40,
      },
    ];
    const insight = calculateCardPaymentAttention(cards);
    const attentionCard = cards.find((card) => card.id === insight?.cardId);

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={cards}
        transactions={fixtureTransactions}
      />,
    );

    const region = attentionArticle("Card payment overdue");
    expect(insight?.cardId).toBe("card-visa");
    expect(insight?.paymentStatus).toBe("overdue");
    expect(within(region).getByText("Priority 1")).toBeInTheDocument();
    expect(region.textContent).toContain(
      `${attentionCard!.name} · ${paymentStatusLabel(insight!.paymentStatus)}`,
    );
    expect(region.textContent).toContain(
      `Due: ${formatDate(insight!.paymentDueDate)}`,
    );
    expect(screen.queryByText("Card payment due")).not.toBeInTheDocument();
  });

  it("does not render a payment-attention insight when every card is current", () => {
    const cards: Card[] = fixtureCards.map((card) => ({
      ...card,
      paymentStatus: "current" as const,
    }));

    expect(calculateCardPaymentAttention(cards)).toBeNull();
    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={cards}
        transactions={fixtureTransactions}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Card payment due" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Card payment overdue" })).not.toBeInTheDocument();
  });

  it("shows the deterministic empty attention state without a health judgment", () => {
    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards.map((card) => ({
          ...card,
          paymentStatus: "current" as const,
        }))}
        transactions={[]}
      />,
    );

    expect(screen.getByText(ATTENTION_EMPTY_COPY)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Attention insights" })).not.toBeInTheDocument();
    expect(screen.queryByText(/healthy/i)).toBeInTheDocument();
    expect(screen.queryByText(/consider/i)).not.toBeInTheDocument();
  });

  it("opens the selected card from the payment-attention insight", async () => {
    const user = userEvent.setup();
    const onOpenCard = vi.fn();

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onOpenCard={onOpenCard}
      />,
    );

    const region = attentionArticle("Card payment due");
    await user.click(
      within(region).getByRole("button", { name: "Inspect card" }),
    );

    expect(onOpenCard).toHaveBeenCalledWith("card-visa");
  });

  it("keeps stored payment status on the existing attention representation", () => {
    renderDashboard();

    const insight = calculateCardPaymentAttention(fixtureCards);
    const attentionCard = fixtureCards.find((card) => card.id === insight?.cardId);
    const region = attentionArticle("Card payment due");

    expect(insight?.paymentStatus).toBe("due");
    expect(region.textContent).toContain(
      `${attentionCard!.name} · ${paymentStatusLabel(insight!.paymentStatus)}`,
    );
    expect(region.textContent).toContain(
      `Minimum payment: ${formatCurrency(insight!.minimumPayment, attentionCard!.currency)}`,
    );
    expect(screen.queryByText(`min ${formatCurrency(insight!.minimumPayment, attentionCard!.currency)}`)).not.toBeInTheDocument();
  });

  it("shows historical net worth for stored activity months only", () => {
    renderDashboard();

    const history = listMonthlyNetWorthHistory(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const region = screen.getByRole("region", { name: "Net worth history" });
    const table = within(region).getByRole("table", { name: "Monthly net worth" });

    expect(history.map((point) => `${point.year}-${point.month}`)).toEqual([
      "2026-9",
      "2026-8",
    ]);
    expect(within(table).getByText("September 2026")).toBeInTheDocument();
    expect(within(table).getByText("August 2026")).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(history[0]!.netWorth, history[0]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(history[1]!.netWorth, history[1]!.currency)),
    ).toBeInTheDocument();
    expect(within(table).queryByText("July 2026")).not.toBeInTheDocument();
  });

  it("shows one historical net-worth point when only one month is stored", () => {
    const transactions = fixtureTransactions.filter((item) =>
      item.date.startsWith("2026-09"),
    );
    const history = listMonthlyNetWorthHistory(
      fixtureAccounts,
      fixtureCards,
      transactions,
    );

    render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={transactions}
      />,
    );

    const table = screen.getByRole("table", { name: "Monthly net worth" });
    expect(history).toHaveLength(1);
    expect(within(table).getByText("September 2026")).toBeInTheDocument();
    expect(within(table).queryByText("August 2026")).not.toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(history[0]!.netWorth, history[0]!.currency)),
    ).toBeInTheDocument();
  });

  it("shows account and card movement for the net-worth change", () => {
    renderDashboard();

    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const breakdown = listNetWorthChangeBreakdown(fixtureTransactions, change!);
    const region = attentionArticle("Net worth increased");
    const details = within(region).getByText("Account movement").closest("dl");

    expect(breakdown.assetMovement).toBeCloseTo(3200 - 87.42);
    expect(breakdown.liabilityMovement).toBe(0);
    expect(details).not.toBeNull();
    expect(within(details!).getByText("Card movement")).toBeInTheDocument();
    expect(
      within(details!).getByText(
        formatCurrency(breakdown.assetMovement, change!.currency, true),
      ),
    ).toBeInTheDocument();
    expect(within(details!).getByText("$0.00")).toBeInTheDocument();
  });

  it("shows recent monthly income, spending, and savings history", () => {
    renderDashboard();

    const rows = listRecentMonthlyFlows(fixtureTransactions);
    const region = screen.getByRole("region", { name: "Recent months" });
    const table = within(region).getByRole("table", {
      name: "Monthly income, spending, and savings",
    });

    expect(rows).toHaveLength(2);
    expect(within(table).getByText("September 2026")).toBeInTheDocument();
    expect(within(table).getByText("August 2026")).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[0]!.income, rows[0]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[0]!.spending, rows[0]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[0]!.savings, rows[0]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[1]!.income, rows[1]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[1]!.spending, rows[1]!.currency)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatCurrency(rows[1]!.savings, rows[1]!.currency)),
    ).toBeInTheDocument();
  });

});

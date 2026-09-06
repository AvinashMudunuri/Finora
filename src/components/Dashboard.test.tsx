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
  calculateLiquidAssets,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
  calculateSpendingChange,
} from "../domain/calculations.ts";
import {
  formatCurrency,
  formatMonth,
  formatUtilization,
  signedAmount,
} from "../domain/finance.ts";
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

describe("Finora dashboard", () => {
  it("renders the dashboard with a product heading", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Finora")).toBeInTheDocument();
  });

  it("shows account and card positions from the fixture data", () => {
    renderDashboard();

    const accounts = screen.getByRole("region", { name: "Accounts" });

    expect(within(accounts).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(accounts).getByText("Emergency Savings")).toBeInTheDocument();
    expect(within(accounts).getAllByText("Cash").length).toBeGreaterThan(0);
    expect(within(accounts).getByText("Investment Account")).toBeInTheDocument();
    expect(within(accounts).getByText("Visa Rewards")).toBeInTheDocument();
    expect(within(accounts).getAllByText("Bank").length).toBeGreaterThan(0);
    expect(within(accounts).getByText("Investment")).toBeInTheDocument();
    expect(within(accounts).getAllByText("Credit Card").length).toBeGreaterThan(0);

    for (const account of fixtureAccounts) {
      expect(
        within(accounts).getByText(formatCurrency(account.balance, account.currency)),
      ).toBeInTheDocument();
    }

    for (const card of fixtureCards) {
      expect(
        within(accounts).getByText(
          formatCurrency(card.outstandingBalance, card.currency),
        ),
      ).toBeInTheDocument();
    }
  });

  it("shows calculated net worth, monthly spending, and card utilization", () => {
    renderDashboard();

    const overview = screen.getByRole("region", { name: "Overview" });
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);
    const septemberSpending = calculateMonthlySpending(
      fixtureTransactions,
      2026,
      9,
    );

    expect(
      within(overview).getByText(formatCurrency(worth.netWorth, worth.currency)),
    ).toBeInTheDocument();
    expect(
      within(overview).getByText(formatCurrency(septemberSpending.total, "USD")),
    ).toBeInTheDocument();
    expect(within(overview).getByText("September 2026")).toBeInTheDocument();
    expect(within(overview).queryByText("$2,049.61")).not.toBeInTheDocument();

    const accounts = screen.getByRole("region", { name: "Accounts" });
    expect(within(accounts).getByText(`${formatUtilization(1842.19 / 5000)} utilized · USD`)).toBeInTheDocument();
    expect(within(accounts).getByText(`${formatUtilization(326.4 / 2500)} utilized · USD`)).toBeInTheDocument();
  });

  it("lists recent transactions with description, party, date, amount, and type", () => {
    renderDashboard();

    const transactions = screen.getByRole("region", { name: "Recent transactions" });
    const paycheck = within(transactions)
      .getByText("Payroll — Acme Corp")
      .closest("li");
    const groceries = within(transactions)
      .getByText("Whole Foods Market")
      .closest("li");

    expect(paycheck).not.toBeNull();
    expect(groceries).not.toBeNull();
    expect(within(paycheck!).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(paycheck!).getByText("Sep 3, 2026")).toBeInTheDocument();
    expect(within(paycheck!).getByText("+$3,200.00")).toBeInTheDocument();
    expect(within(paycheck!).getByText("Inflow")).toBeInTheDocument();
    expect(within(groceries!).getByText("-$87.42")).toBeInTheDocument();
    expect(within(groceries!).getByText("Outflow")).toBeInTheDocument();
  });

  it("formats transaction amounts from their financial event", () => {
    renderDashboard();

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
    expect(screen.getByText("+$3,200.00")).toBeInTheDocument();
    expect(screen.getByText("-$87.42")).toBeInTheDocument();
  });

  it("filters recent transactions by account or card", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: "Emergency Savings" }));

    const transactions = screen.getByRole("region", { name: "Recent transactions" });
    expect(within(transactions).getByText("Interest credit")).toBeInTheDocument();
    expect(within(transactions).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(transactions).queryByText("Dinner — Riverview")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Visa Rewards" }));
    expect(within(transactions).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(transactions).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All accounts" }));
    expect(within(transactions).getByText("Payroll — Acme Corp")).toBeInTheDocument();
  });

  it("renders accounts and transactions from the provided dataset", () => {
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

    expect(screen.getAllByText("Harbor Checking").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Harbor Payroll")).toBeInTheDocument();
    expect(screen.queryByText("Everyday Checking")).not.toBeInTheDocument();
    expect(screen.queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
  });

  it("shows an empty state when a filter has no transactions", async () => {
    const user = userEvent.setup();
    const emptyAccount = {
      id: "acc-empty",
      name: "New Brokerage",
      type: "investment" as const,
      balance: 0,
      currency: "USD" as const,
    };

    render(
      <Dashboard
        accounts={[...fixtureAccounts, emptyAccount]}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New Brokerage" }));

    expect(screen.getByText("No recent transactions for this account.")).toBeInTheDocument();
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

  it("shows monthly income and savings for the latest fixture month", () => {
    renderDashboard();

    const overview = screen.getByRole("region", { name: "Overview" });
    const income = calculateMonthlyIncome(fixtureTransactions, 2026, 9);
    const savings = calculateMonthlySavings(fixtureTransactions, 2026, 9);

    expect(
      within(overview).getByText(formatCurrency(income.total, "USD")),
    ).toBeInTheDocument();
    expect(
      within(overview).getByText(formatCurrency(savings.savings, "USD")),
    ).toBeInTheDocument();
    expect(within(overview).queryByText("$4.12")).not.toBeInTheDocument();
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

  it("shows a spending change insight from the calculated fixture result", () => {
    renderDashboard();

    const change = calculateSpendingChange(fixtureTransactions);
    expect(change).not.toBeNull();

    const insight = screen.getByRole("region", { name: "Spending change" });
    const overview = screen.getByRole("region", { name: "Overview" });

    expect(within(insight).getByText("Spending decreased")).toBeInTheDocument();
    expect(insight).toHaveTextContent(
      formatCurrency(change!.currentSpending, change!.currency),
    );
    expect(insight).toHaveTextContent(
      formatCurrency(change!.previousSpending, change!.currency),
    );
    expect(insight).toHaveTextContent(
      formatMonth(change!.currentPeriod.year, change!.currentPeriod.month),
    );
    expect(insight).toHaveTextContent(
      formatMonth(change!.previousPeriod.year, change!.previousPeriod.month),
    );
    expect(within(overview).queryByText("Spending decreased")).not.toBeInTheDocument();
    expect(
      within(overview).queryByText(
        formatCurrency(change!.previousSpending, change!.currency),
      ),
    ).not.toBeInTheDocument();
  });

  it("renders increased and unchanged insight copy from the calculated direction", () => {
    const increased = [
      {
        id: "txn-prev",
        date: "2026-08-10",
        description: "Earlier coffee",
        amount: 10,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-curr",
        date: "2026-09-04",
        description: "Later coffee",
        amount: 25,
        currency: "USD" as const,
        eventType: "expense" as const,
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];

    const { rerender } = render(
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
        transactions={increased}
      />,
    );

    const increasedChange = calculateSpendingChange(increased);
    expect(increasedChange?.direction).toBe("increased");
    expect(
      screen.getByRole("region", { name: "Spending change" }),
    ).toHaveTextContent("Spending increased");
    expect(
      screen.getByRole("region", { name: "Spending change" }),
    ).toHaveTextContent(
      formatCurrency(
        increasedChange!.currentSpending,
        increasedChange!.currency,
      ),
    );

    const unchanged = [
      increased[0]!,
      {
        ...increased[1]!,
        id: "txn-same",
        amount: 10,
        description: "Same coffee",
      },
    ];

    rerender(
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
        transactions={unchanged}
      />,
    );

    expect(calculateSpendingChange(unchanged)?.direction).toBe("unchanged");
    expect(
      screen.getByRole("region", { name: "Spending change" }),
    ).toHaveTextContent("Spending unchanged");
  });

  it("does not render a spending change insight without a latest activity month", () => {
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

    expect(
      screen.queryByRole("region", { name: "Spending change" }),
    ).not.toBeInTheDocument();
  });
});

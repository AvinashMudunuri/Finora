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
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateNetWorth,
  calculateSpendingChange,
  latestActivityMonth,
} from "../domain/calculations.ts";
import type { Account, Transaction } from "../domain/types.ts";
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

    expect(
      within(overview).getByText(formatCurrency(worth.netWorth, worth.currency)),
    ).toBeInTheDocument();
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
    expect(screen.queryByRole("region", { name: "Spending change" })).not.toBeInTheDocument();
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

  it("renders the spending change insight from the calculated result", () => {
    renderDashboard();

    const insight = calculateSpendingChange(fixtureTransactions);
    expect(insight).not.toBeNull();

    const region = screen.getByRole("region", { name: "Spending change" });
    expect(
      within(region).getByRole("heading", { name: "Spending decreased" }),
    ).toBeInTheDocument();
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
    expect(within(region).queryByText("Spending increased")).not.toBeInTheDocument();
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

    const region = screen.getByRole("region", { name: "Spending change" });
    expect(insight?.direction).toBe("increased");
    expect(
      within(region).getByRole("heading", { name: "Spending increased" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `You spent ${formatCurrency(55, "USD")} this month, compared with ${formatCurrency(20, "USD")} last month.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Spending decreased")).not.toBeInTheDocument();
    expect(screen.queryByText("$87.42")).not.toBeInTheDocument();
  });

  it("renders a neutral insight when spending is unchanged", () => {
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

    const region = screen.getByRole("region", { name: "Spending change" });
    expect(
      within(region).getByRole("heading", { name: "Spending unchanged" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `You spent ${formatCurrency(40, "USD")} this month, compared with ${formatCurrency(40, "USD")} last month.`,
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

    expect(
      screen.queryByRole("region", { name: "Spending change" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Spending decreased")).not.toBeInTheDocument();
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
});

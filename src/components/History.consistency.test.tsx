import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateMonthlySavings,
  calculateNetWorth,
  calculateNetWorthChange,
  latestActivityMonth,
  listMonthlyNetWorthHistory,
  listNetWorthChangeBreakdown,
  listRecentMonthlyFlows,
} from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import { Dashboard } from "./Dashboard.tsx";
import { Insights } from "./Insights.tsx";
import { Spending } from "./Spending.tsx";

describe("historical views stay consistent with Dashboard and Insights", () => {
  it("shows the same current position, change, and history on every view", () => {
    const worth = calculateNetWorth(fixtureAccounts, fixtureCards);
    const period = latestActivityMonth(fixtureTransactions)!;
    const flow = calculateMonthlySavings(
      fixtureTransactions,
      period.year,
      period.month,
    );
    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    )!;
    const breakdown = listNetWorthChangeBreakdown(fixtureTransactions, change);
    const netWorthHistory = listMonthlyNetWorthHistory(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const monthlyHistory = listRecentMonthlyFlows(fixtureTransactions);
    const signedChange = formatCurrency(
      change.direction === "decreased"
        ? -change.absoluteChange
        : change.absoluteChange,
      change.currency,
      change.direction !== "unchanged",
    );
    const netWorthBody = `Net worth is ${formatCurrency(change.currentNetWorth, change.currency)} this month, compared with ${formatCurrency(change.previousNetWorth, change.currency)} last month.`;
    const accountMovement = formatCurrency(
      breakdown.assetMovement,
      change.currency,
      breakdown.assetMovement !== 0,
    );

    const dashboard = render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    expect(
      screen.getAllByText(formatCurrency(worth.netWorth, worth.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(worth.assets, worth.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(worth.liabilities, worth.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(flow.income, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(flow.spending, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(flow.savings, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(netWorthBody)).toBeInTheDocument();
    expect(screen.getAllByText(signedChange).length).toBeGreaterThan(0);
    expect(screen.getAllByText(accountMovement).length).toBeGreaterThan(0);

    const dashboardNetWorth = screen.getByRole("table", {
      name: "Monthly net worth",
    });
    const dashboardMonths = screen.getByRole("table", {
      name: "Monthly income, spending, and savings",
    });
    expect(
      within(dashboardNetWorth).getByText(
        formatMonth(netWorthHistory[0]!.year, netWorthHistory[0]!.month),
      ),
    ).toBeInTheDocument();
    expect(
      within(dashboardMonths).getByText(
        formatCurrency(monthlyHistory[1]!.spending, monthlyHistory[1]!.currency),
      ),
    ).toBeInTheDocument();

    dashboard.unmount();

    const spending = render(
      <Spending
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    expect(
      screen.getAllByText(formatCurrency(flow.income, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(flow.spending, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(flow.savings, flow.currency)).length,
    ).toBeGreaterThan(0);
    expect(
      within(
        screen.getByRole("table", {
          name: "Monthly income, spending, and savings",
        }),
      ).getByText(
        formatCurrency(monthlyHistory[1]!.income, monthlyHistory[1]!.currency),
      ),
    ).toBeInTheDocument();

    spending.unmount();

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    expect(screen.getByText(netWorthBody)).toBeInTheDocument();
    expect(screen.getByText(signedChange)).toBeInTheDocument();
    expect(screen.getByText(accountMovement)).toBeInTheDocument();
    expect(screen.getByText("Account movement")).toBeInTheDocument();
    expect(screen.getByText("Card movement")).toBeInTheDocument();
    expect(worth.netWorth).toBe(change.currentNetWorth);
    expect(netWorthHistory[0]?.netWorth).toBe(worth.netWorth);
    expect(netWorthHistory[1]?.netWorth).toBe(change.previousNetWorth);
    expect(monthlyHistory[0]).toEqual(flow);
  });
});

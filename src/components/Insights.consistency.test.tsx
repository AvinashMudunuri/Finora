import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateCardPaymentAttention,
  calculateNetWorthChange,
  calculateSpendingChange,
} from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import { attentionTitle, listAttentionInsights } from "../domain/insights.ts";
import { Dashboard } from "./Dashboard.tsx";
import { Insights } from "./Insights.tsx";

function sharedInsightCopy() {
  const spending = calculateSpendingChange(fixtureTransactions);
  const netWorth = calculateNetWorthChange(
    fixtureAccounts,
    fixtureCards,
    fixtureTransactions,
  );
  const payment = calculateCardPaymentAttention(fixtureCards);

  return {
    spendingBody: `You spent ${formatCurrency(spending!.currentSpending, spending!.currency)} this month, compared with ${formatCurrency(spending!.previousSpending, spending!.currency)} last month.`,
    spendingPeriod: `${formatMonth(spending!.currentPeriod.year, spending!.currentPeriod.month)} compared with ${formatMonth(spending!.previousPeriod.year, spending!.previousPeriod.month)}`,
    netWorthBody: `Net worth is ${formatCurrency(netWorth!.currentNetWorth, netWorth!.currency)} this month, compared with ${formatCurrency(netWorth!.previousNetWorth, netWorth!.currency)} last month.`,
    netWorthPeriod: `${formatMonth(netWorth!.currentPeriod.year, netWorth!.currentPeriod.month)} compared with ${formatMonth(netWorth!.previousPeriod.year, netWorth!.previousPeriod.month)}`,
    paymentName: "Visa Rewards · Due",
    payment: payment!,
    spending: spending!,
    netWorth: netWorth!,
  };
}

function attentionTitles() {
  return within(screen.getByRole("list", { name: "Attention insights" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("Dashboard and Insights consistency", () => {
  it("shows the same spending, net-worth, and payment values on both views", () => {
    const copy = sharedInsightCopy();
    const expectedTitles = listAttentionInsights(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    ).map(attentionTitle);

    const dashboard = render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    const dashboardAttention = screen.getByRole("list", { name: "Attention insights" });
    expect(screen.getByText(copy.spendingBody)).toBeInTheDocument();
    expect(screen.getByText(copy.netWorthBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.paymentName).length).toBeGreaterThan(0);
    expect(attentionTitles()).toEqual(expectedTitles);
    expect(
      within(dashboardAttention).queryByRole("list", { name: "Spending change drivers" }),
    ).not.toBeInTheDocument();
    expect(
      within(dashboardAttention).queryByRole("list", { name: "Net worth change evidence" }),
    ).not.toBeInTheDocument();
    expect(
      within(dashboardAttention).queryByText(/This appears because/),
    ).not.toBeInTheDocument();

    dashboard.unmount();

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    const insightsAttention = screen.getByRole("list", { name: "Attention insights" });
    expect(screen.getByText(copy.spendingBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.spendingPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.netWorthBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.netWorthPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.paymentName)).toBeInTheDocument();
    expect(attentionTitles()).toEqual(expectedTitles);
    expect(
      within(insightsAttention).getByRole("list", { name: "Spending change drivers" }),
    ).toBeInTheDocument();
    expect(
      within(insightsAttention).getByRole("list", { name: "Net worth change evidence" }),
    ).toBeInTheDocument();
    expect(
      within(insightsAttention).getByText(
        "This appears because a stored card payment status is due.",
      ),
    ).toBeInTheDocument();
    expect(copy.spending.direction).toBe("decreased");
    expect(copy.netWorth.direction).toBe("increased");
    expect(copy.payment.cardId).toBe("card-visa");
  });
});

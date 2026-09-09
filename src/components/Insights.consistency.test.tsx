import { render, screen } from "@testing-library/react";
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

describe("Dashboard and Insights consistency", () => {
  it("shows the same spending, net-worth, and payment values on both views", () => {
    const copy = sharedInsightCopy();

    const dashboard = render(
      <Dashboard
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    expect(screen.getByText(copy.spendingBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.spendingPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.netWorthBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.netWorthPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.paymentName)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spending decreased" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Net worth increased" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card payment due" })).toBeInTheDocument();

    dashboard.unmount();

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    expect(screen.getByText(copy.spendingBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.spendingPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.netWorthBody)).toBeInTheDocument();
    expect(screen.getAllByText(copy.netWorthPeriod).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.paymentName)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spending decreased" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Net worth increased" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card payment due" })).toBeInTheDocument();
    expect(copy.spending.direction).toBe("decreased");
    expect(copy.netWorth.direction).toBe("increased");
    expect(copy.payment.cardId).toBe("card-visa");
  });
});

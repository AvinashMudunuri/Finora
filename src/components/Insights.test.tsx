import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  cardsWithCurrentPaymentStatus,
  cardsWithHighVisaUtilization,
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateCardPaymentAttention,
  calculateHighCardUtilization,
  calculateNetWorthChange,
  calculateSpendingChange,
  listNetWorthChangeBreakdown,
  listNetWorthChangeEvidence,
} from "../domain/calculations.ts";
import { formatCurrency, formatUtilization } from "../domain/finance.ts";
import { ATTENTION_EMPTY_COPY } from "../domain/insights.ts";
import { Insights } from "./Insights.tsx";

describe("Insights", () => {
  it("renders default attention insights in deterministic priority order", () => {
    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    const items = within(screen.getByRole("list", { name: "Attention insights" }))
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(items).toEqual([
      "Card payment due",
      "Spending decreased",
      "Net worth increased",
    ]);
    expect(screen.getByText("Action required")).toBeInTheDocument();
    expect(screen.getByText("Observation")).toBeInTheDocument();
    expect(screen.getByText("Positive movement")).toBeInTheDocument();
    expect(screen.getByText("Priority 2")).toBeInTheDocument();
    expect(screen.getByText("Priority 4")).toBeInTheDocument();
    expect(screen.getByText("Priority 5")).toBeInTheDocument();
  });

  it("uses the same spending and net-worth values as the existing calculations", () => {
    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
      />,
    );

    const spending = calculateSpendingChange(fixtureTransactions);
    const netWorth = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const payment = calculateCardPaymentAttention(fixtureCards);

    expect(spending).not.toBeNull();
    expect(netWorth).not.toBeNull();
    expect(payment).not.toBeNull();

    expect(
      screen.getByText(
        `You spent ${formatCurrency(spending!.currentSpending, spending!.currency)} this month, compared with ${formatCurrency(spending!.previousSpending, spending!.currency)} last month.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Net worth is ${formatCurrency(netWorth!.currentNetWorth, netWorth!.currency)} this month, compared with ${formatCurrency(netWorth!.previousNetWorth, netWorth!.currency)} last month.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Visa Rewards · Due")).toBeInTheDocument();
  });

  it("inspects spending, payment card, net worth, and net-worth evidence", async () => {
    const user = userEvent.setup();
    const onShowSpending = vi.fn();
    const onShowDashboard = vi.fn();
    const onOpenCard = vi.fn();
    const onOpenTransaction = vi.fn();
    const change = calculateNetWorthChange(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    )!;
    const evidence = listNetWorthChangeEvidence(fixtureTransactions, change);
    const breakdown = listNetWorthChangeBreakdown(fixtureTransactions, change);

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowSpending={onShowSpending}
        onShowDashboard={onShowDashboard}
        onOpenCard={onOpenCard}
        onOpenTransaction={onOpenTransaction}
      />,
    );

    expect(screen.getByText("Account movement")).toBeInTheDocument();
    expect(screen.getByText("Card movement")).toBeInTheDocument();
    expect(
      screen.getByText(
        formatCurrency(breakdown.assetMovement, change.currency, true),
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect spending" }));
    expect(onShowSpending).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Inspect card" }));
    expect(onOpenCard).toHaveBeenCalledWith("card-visa");

    await user.click(screen.getByRole("button", { name: "Inspect net worth" }));
    expect(onShowDashboard).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: `Inspect ${evidence[0]!.description}` }),
    );
    expect(onOpenTransaction).toHaveBeenCalledWith(evidence[0]!.transactionId);
  });

  it("inspects high utilization to the selected card", async () => {
    const user = userEvent.setup();
    const onOpenCard = vi.fn();
    const cards = cardsWithHighVisaUtilization(fixtureCards);
    const high = calculateHighCardUtilization(cards);

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={cards}
        transactions={[]}
        onOpenCard={onOpenCard}
      />,
    );

    expect(high).not.toBeNull();
    expect(
      screen.getByText(
        `Visa Rewards is at ${formatUtilization(high!.utilization)}, at or above ${formatUtilization(high!.threshold)}.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Outstanding: ${formatCurrency(high!.outstandingBalance, "USD")}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Credit limit: ${formatCurrency(high!.creditLimit, "USD")}`,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect card" }));
    expect(onOpenCard).toHaveBeenCalledWith("card-visa");
  });

  it("shows a deterministic empty state when nothing requires attention", () => {
    render(
      <Insights
        accounts={fixtureAccounts}
        cards={cardsWithCurrentPaymentStatus(fixtureCards)}
        transactions={[]}
      />,
    );

    expect(screen.getByText(ATTENTION_EMPTY_COPY)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Attention insights" })).not.toBeInTheDocument();
    expect(screen.queryByText(/consider/i)).not.toBeInTheDocument();
  });
});

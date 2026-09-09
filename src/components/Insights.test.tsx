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
  listNetWorthChangeEvidence,
} from "../domain/calculations.ts";
import { formatCurrency, formatUtilization } from "../domain/finance.ts";
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

  it("inspects spending, payment card, and net-worth evidence", async () => {
    const user = userEvent.setup();
    const onShowSpending = vi.fn();
    const onOpenCard = vi.fn();
    const onOpenTransaction = vi.fn();
    const evidence = listNetWorthChangeEvidence(
      fixtureTransactions,
      calculateNetWorthChange(fixtureAccounts, fixtureCards, fixtureTransactions)!,
    );

    render(
      <Insights
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowSpending={onShowSpending}
        onOpenCard={onOpenCard}
        onOpenTransaction={onOpenTransaction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Inspect spending" }));
    expect(onShowSpending).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Inspect card" }));
    expect(onOpenCard).toHaveBeenCalledWith("card-visa");

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
        `Utilization is ${formatUtilization(high!.utilization)}, at or above ${formatUtilization(high!.threshold)}.`,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect utilization" }));
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

    expect(
      screen.getByText("Nothing requires attention based on the available stored data."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Attention insights" })).not.toBeInTheDocument();
    expect(screen.queryByText(/consider/i)).not.toBeInTheDocument();
  });
});

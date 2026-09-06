import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
} from "../domain/calculations.ts";
import { formatCurrency } from "../domain/finance.ts";
import { Spending } from "./Spending.tsx";

function renderSpending(
  overrides: {
    onOpenTransaction?: (transactionId: string) => void;
  } = {},
) {
  return render(
    <Spending
      accounts={fixtureAccounts}
      cards={fixtureCards}
      transactions={fixtureTransactions}
      onOpenTransaction={overrides.onOpenTransaction}
    />,
  );
}

describe("Finora spending view", () => {
  it("renders the selected month income, spending, and savings", () => {
    renderSpending();

    const income = calculateMonthlyIncome(fixtureTransactions, 2026, 9);
    const spending = calculateMonthlySpending(fixtureTransactions, 2026, 9);
    const savings = calculateMonthlySavings(fixtureTransactions, 2026, 9);

    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(income.total, "USD"))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(spending.total, "USD"))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(savings.savings, "USD"))).toBeInTheDocument();
    expect(screen.getByText("Income − spending")).toBeInTheDocument();
  });

  it("moves to the previous month using the existing calculations", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const august = calculateMonthlySavings(fixtureTransactions, 2026, 8);
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(august.income, "USD"))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(august.spending, "USD"))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(august.savings, "USD"))).toBeInTheDocument();
  });

  it("moves to the next month and shows zeros when the month is empty", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(3);
    expect(
      screen.getByText("No income or spending in this month."),
    ).toBeInTheDocument();
  });

  it("lists the income and spending transactions that explain the summary", () => {
    renderSpending();

    const income = screen.getByRole("region", { name: "Income" });
    const spending = screen.getByRole("region", { name: "Spending" });

    expect(within(income).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(income).queryByText("Whole Foods Market")).not.toBeInTheDocument();
    expect(within(income).queryByText("Dividend — VTI")).not.toBeInTheDocument();
    expect(within(spending).getByText("Whole Foods Market")).toBeInTheDocument();
    expect(within(spending).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(spending).queryByText("Payment — Thank you")).not.toBeInTheDocument();
  });

  it("opens an underlying transaction through the existing callback", async () => {
    const user = userEvent.setup();
    const onOpenTransaction = vi.fn();
    renderSpending({ onOpenTransaction });

    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );

    expect(onOpenTransaction).toHaveBeenCalledWith("txn-001");
  });
});

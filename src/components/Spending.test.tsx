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
  calculateSpendingChange,
} from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import type { Account, Transaction } from "../domain/types.ts";
import { Spending } from "./Spending.tsx";

function harborAccount(): Account {
  return {
    id: "acc-harbor",
    name: "Harbor Checking",
    type: "bank",
    balance: 100,
    currency: "USD",
  };
}

function renderSpending(
  overrides: {
    accounts?: Account[];
    transactions?: Transaction[];
    onOpenTransaction?: (transactionId: string) => void;
  } = {},
) {
  return render(
    <Spending
      accounts={overrides.accounts ?? fixtureAccounts}
      cards={overrides.accounts ? [] : fixtureCards}
      transactions={overrides.transactions ?? fixtureTransactions}
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

  it("shows the spending-change comparison from the existing calculation", () => {
    renderSpending();

    const insight = calculateSpendingChange(fixtureTransactions);
    expect(insight).not.toBeNull();

    const region = screen.getByRole("region", { name: "Spending change" });
    expect(
      within(region).getByRole("heading", {
        name: "Spending decreased",
      }),
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

  it("keeps the comparison on the insight periods when another month is selected", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const insight = calculateSpendingChange(fixtureTransactions);
    const region = screen.getByRole("region", { name: "Spending change" });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(
      within(region).getByText(
        `${formatMonth(insight!.currentPeriod.year, insight!.currentPeriod.month)} compared with ${formatMonth(insight!.previousPeriod.year, insight!.previousPeriod.month)}`,
      ),
    ).toBeInTheDocument();
  });

  it("renders an increased comparison from the calculated result", () => {
    const transactions: Transaction[] = [
      {
        id: "txn-prev",
        date: "2026-03-10",
        description: "Older grocery",
        amount: 20,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-current",
        date: "2026-04-02",
        description: "Newer grocery",
        amount: 55,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];
    const insight = calculateSpendingChange(transactions);

    renderSpending({ accounts: [harborAccount()], transactions });

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

  it("renders an unchanged comparison from the calculated result", () => {
    const transactions: Transaction[] = [
      {
        id: "txn-prev",
        date: "2026-03-10",
        description: "Older grocery",
        amount: 40,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
      {
        id: "txn-current",
        date: "2026-04-02",
        description: "Newer grocery",
        amount: 40,
        currency: "USD",
        eventType: "expense",
        accountId: "acc-harbor",
        counterpartyAccountId: null,
        cardId: null,
      },
    ];

    renderSpending({ accounts: [harborAccount()], transactions });

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

  it("omits the comparison when the calculation has no activity month", () => {
    renderSpending({ accounts: [harborAccount()], transactions: [] });

    expect(
      screen.queryByRole("region", { name: "Spending change" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Spending decreased")).not.toBeInTheDocument();
  });
});

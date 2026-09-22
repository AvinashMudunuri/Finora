import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateIncomeChange,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateMonthlySpendingBreakdown,
  calculateSavingsChange,
  calculateSpendingChange,
  listRecentMonthlyFlows,
  listSpendingChangeDrivers,
} from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import type { Account, Transaction } from "../domain/types.ts";
import { Spending } from "./Spending.tsx";

function comparedInMonths(
  verb: "spent" | "received" | "retained",
  currentAmount: number,
  previousAmount: number,
  currency: string,
  currentPeriod: { year: number; month: number },
  previousPeriod: { year: number; month: number },
): string {
  return `You ${verb} ${formatCurrency(currentAmount, currency)} in ${formatMonth(currentPeriod.year, currentPeriod.month)}, compared with ${formatCurrency(previousAmount, currency)} in ${formatMonth(previousPeriod.year, previousPeriod.month)}.`;
}

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

    const selectedMonth = screen.getByRole("region", { name: "September 2026" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(
      within(selectedMonth).getByText(formatCurrency(income.total, "USD")),
    ).toBeInTheDocument();
    expect(
      within(selectedMonth).getAllByText(formatCurrency(spending.total, "USD"))
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      within(selectedMonth).getByText(formatCurrency(savings.savings, "USD")),
    ).toBeInTheDocument();
    expect(within(selectedMonth).getByText("Income − spending")).toBeInTheDocument();

    const breakdown = calculateMonthlySpendingBreakdown(
      fixtureTransactions,
      2026,
      9,
    );
    const source = screen.getByRole("region", {
      name: "Where this spending came from",
    });
    expect(within(source).getByText("Account-funded")).toBeInTheDocument();
    expect(within(source).getByText("Card purchases")).toBeInTheDocument();
    expect(
      within(source).getByText(
        formatCurrency(breakdown.accountFunded, breakdown.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(source).getByText(
        formatCurrency(breakdown.cardPurchases, breakdown.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(source).getByText(
        `Account-funded + card purchases = ${formatCurrency(breakdown.total, breakdown.currency)}`,
      ),
    ).toBeInTheDocument();
    expect(breakdown.total).toBe(spending.total);
  });

  it("moves to the previous month using the existing calculations", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const august = calculateMonthlySavings(fixtureTransactions, 2026, 8);
    const selectedMonth = screen.getByRole("region", { name: "August 2026" });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(
      within(selectedMonth).getByText(formatCurrency(august.income, "USD")),
    ).toBeInTheDocument();
    expect(
      within(selectedMonth).getByText(formatCurrency(august.spending, "USD")),
    ).toBeInTheDocument();
    expect(
      within(selectedMonth).getByText(formatCurrency(august.savings, "USD")),
    ).toBeInTheDocument();

    const breakdown = calculateMonthlySpendingBreakdown(
      fixtureTransactions,
      2026,
      8,
    );
    const source = within(selectedMonth).getByRole("region", {
      name: "Where this spending came from",
    });
    expect(
      within(source).getByText(
        formatCurrency(breakdown.accountFunded, breakdown.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(source).getByText(
        formatCurrency(breakdown.cardPurchases, breakdown.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(source).getByText(
        `Account-funded + card purchases = ${formatCurrency(breakdown.total, breakdown.currency)}`,
      ),
    ).toBeInTheDocument();
    expect(breakdown.total).toBe(august.spending);
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
        comparedInMonths(
          "spent",
          insight!.currentSpending,
          insight!.previousSpending,
          insight!.currency,
          insight!.currentPeriod,
          insight!.previousPeriod,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        `${formatMonth(insight!.currentPeriod.year, insight!.currentPeriod.month)} compared with ${formatMonth(insight!.previousPeriod.year, insight!.previousPeriod.month)}`,
      ),
    ).toBeInTheDocument();
    expect(within(region).queryByText("Spending increased")).not.toBeInTheDocument();

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
  });

  it("keeps the comparison on the insight periods when another month is selected", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const insight = calculateSpendingChange(fixtureTransactions);
    const region = screen.getByRole("region", { name: "Spending change" });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(
      within(region).getByText(/does not follow the month selected below/),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        comparedInMonths(
          "spent",
          insight!.currentSpending,
          insight!.previousSpending,
          insight!.currency,
          insight!.currentPeriod,
          insight!.previousPeriod,
        ),
      ),
    ).toBeInTheDocument();
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
        comparedInMonths(
          "spent",
          55,
          20,
          "USD",
          insight!.currentPeriod,
          insight!.previousPeriod,
        ),
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
        comparedInMonths("spent", 40, 40, "USD", { year: 2026, month: 4 }, { year: 2026, month: 3 }),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).queryByRole("list", { name: "Spending change drivers" }),
    ).not.toBeInTheDocument();
  });

  it("omits the comparison when the calculation has no activity month", () => {
    renderSpending({ accounts: [harborAccount()], transactions: [] });

    expect(
      screen.queryByRole("region", { name: "Spending change" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Spending decreased")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No stored activity months to compare income, spending, and savings.",
      ),
    ).toBeInTheDocument();
  });

  it("lists stored months and selects one from the history table", async () => {
    const user = userEvent.setup();
    renderSpending();

    const rows = listRecentMonthlyFlows(fixtureTransactions);
    const region = screen.getByRole("region", { name: "Recent months" });
    const table = within(region).getByRole("table", {
      name: "Monthly income, spending, and savings",
    });

    expect(within(table).getByText(formatCurrency(rows[0]!.income, "USD"))).toBeInTheDocument();
    expect(within(table).getByText(formatCurrency(rows[1]!.spending, "USD"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show August 2026" }));

    const selectedMonth = screen.getByRole("region", { name: "August 2026" });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(
      within(selectedMonth).getByText(formatCurrency(rows[1]!.income, "USD")),
    ).toBeInTheDocument();
  });

  it("shows income and savings change from the existing monthly calculations", () => {
    renderSpending();

    const income = calculateIncomeChange(fixtureTransactions);
    const savings = calculateSavingsChange(fixtureTransactions);
    expect(income).not.toBeNull();
    expect(savings).not.toBeNull();

    const region = screen.getByRole("region", {
      name: "Income and savings change",
    });
    expect(
      within(region).getByRole("heading", { name: "Income increased" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { name: "Savings increased" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        comparedInMonths(
          "received",
          income!.currentIncome,
          income!.previousIncome,
          income!.currency,
          income!.currentPeriod,
          income!.previousPeriod,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        comparedInMonths(
          "retained",
          savings!.currentSavings,
          savings!.previousSavings,
          savings!.currency,
          savings!.currentPeriod,
          savings!.previousPeriod,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        formatCurrency(savings!.currentIncome, savings!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        formatCurrency(savings!.previousIncome, savings!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        formatCurrency(savings!.currentSpending, savings!.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        formatCurrency(savings!.previousSpending, savings!.currency),
      ),
    ).toBeInTheDocument();
    expect(within(region).getByText("Income − spending")).toBeInTheDocument();
    expect(savings!.currentSavings).toBeCloseTo(
      savings!.currentIncome - savings!.currentSpending,
      2,
    );
    expect(income!.currentIncome).toBeCloseTo(3200, 2);
    expect(income!.previousIncome).toBeCloseTo(4.12, 2);
  });

  it("keeps income and savings change on the latest activity month when another month is selected", async () => {
    const user = userEvent.setup();
    renderSpending();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const income = calculateIncomeChange(fixtureTransactions);
    const region = screen.getByRole("region", {
      name: "Income and savings change",
    });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(
      within(region).getByText(/does not follow the month selected below/),
    ).toBeInTheDocument();
    expect(
      within(region).getAllByText(
        `${formatMonth(income!.currentPeriod.year, income!.currentPeriod.month)} compared with ${formatMonth(income!.previousPeriod.year, income!.previousPeriod.month)}`,
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("omits income and savings change when there is no activity month", () => {
    renderSpending({ accounts: [harborAccount()], transactions: [] });

    expect(
      screen.queryByRole("region", { name: "Income and savings change" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Income increased")).not.toBeInTheDocument();
    expect(screen.queryByText("Savings increased")).not.toBeInTheDocument();
  });
});

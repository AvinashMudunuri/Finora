import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fixtureAccounts, fixtureTransactions } from "../data/fixtures.ts";
import { formatCurrency, netBalance, signedAmount } from "../domain/finance.ts";
import { Dashboard } from "./Dashboard.tsx";

function renderDashboard() {
  return render(
    <Dashboard
      accounts={fixtureAccounts}
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

  it("shows each account name, type, and formatted balance", () => {
    renderDashboard();

    const accounts = screen.getByRole("region", { name: "Accounts" });

    expect(within(accounts).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(accounts).getByText("Emergency Savings")).toBeInTheDocument();
    expect(within(accounts).getByText("Visa Rewards")).toBeInTheDocument();
    expect(within(accounts).getByText("Checking")).toBeInTheDocument();
    expect(within(accounts).getByText("Savings")).toBeInTheDocument();
    expect(within(accounts).getByText("Credit Card")).toBeInTheDocument();

    for (const account of fixtureAccounts) {
      expect(
        within(accounts).getByText(formatCurrency(account.balance, account.currency)),
      ).toBeInTheDocument();
    }
  });

  it("shows a net balance that subtracts credit-card amounts owed", () => {
    renderDashboard();

    const overview = screen.getByRole("region", { name: "Overview" });
    const expected = formatCurrency(netBalance(fixtureAccounts), "USD");

    expect(within(overview).getByText(expected)).toBeInTheDocument();
    expect(within(overview).queryByText("$18,578.66")).not.toBeInTheDocument();
  });

  it("lists recent transactions with description, account, date, amount, and type", () => {
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

  it("formats transaction amounts from their type", () => {
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

  it("filters recent transactions by account", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: "Emergency Savings" }));

    const transactions = screen.getByRole("region", { name: "Recent transactions" });
    expect(within(transactions).getByText("Interest credit")).toBeInTheDocument();
    expect(within(transactions).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(transactions).queryByText("Dinner — Riverview")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All accounts" }));
    expect(within(transactions).getByText("Payroll — Acme Corp")).toBeInTheDocument();
  });

  it("shows an empty state when a filter has no transactions", async () => {
    const user = userEvent.setup();
    const emptyAccount = {
      id: "acc-empty",
      name: "New Brokerage",
      type: "checking" as const,
      balance: 0,
      currency: "USD" as const,
    };

    render(
      <Dashboard
        accounts={[...fixtureAccounts, emptyAccount]}
        transactions={fixtureTransactions}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New Brokerage" }));

    expect(screen.getByText("No recent transactions for this account.")).toBeInTheDocument();
  });
});

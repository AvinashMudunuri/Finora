import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fixtureTransactions } from "../data/fixtures.ts";
import { calculateSpendingChange } from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import App from "./App.tsx";

describe("Finora app navigation", () => {
  it("opens the cards experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cards" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your cards" })).toBeInTheDocument();
  });

  it("opens a selected card from dashboard attention", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Inspect card" }));

    const detail = screen.getByRole("region", { name: "Visa Rewards" });
    expect(within(detail).getByText("Northlake Bank")).toBeInTheDocument();
    expect(within(detail).getByText("Payment — Thank you")).toBeInTheDocument();
  });

  it("returns to the existing dashboard from cards", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: "Dashboard" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
  });

  it("opens the transactions experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Transactions" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Transaction list" })).toBeInTheDocument();
  });

  it("opens a selected transaction from dashboard net-worth evidence", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Inspect Payroll — Acme Corp" }),
    );

    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    expect(within(detail).getByText("Income")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
  });

  it("opens a card transaction in the transactions experience", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Inspect card" }));
    await user.click(
      screen.getByRole("button", { name: "View Dinner — Riverview" }),
    );

    const detail = screen.getByRole("region", { name: "Dinner — Riverview" });
    expect(within(detail).getByText("Card purchase")).toBeInTheDocument();
    expect(within(detail).getByText("Visa Rewards")).toBeInTheDocument();
  });

  it("opens the accounts experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Accounts" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Accounts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your accounts" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Everyday Checking" }),
    ).toBeInTheDocument();
  });

  it("opens a selected account from the dashboard accounts path", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View accounts" }));

    const detail = screen.getByRole("region", { name: "Everyday Checking" });
    expect(within(detail).getByText("Bank")).toBeInTheDocument();
    expect(within(detail).getByText("Payroll — Acme Corp")).toBeInTheDocument();
  });

  it("opens an account transaction in the existing transactions experience", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Accounts" }));
    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );

    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    expect(within(detail).getByText("Income")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accounts" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Accounts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Payroll — Acme Corp")).toBeInTheDocument();
  });

  it("opens accounts from the dashboard financial-position card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View accounts" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Accounts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your accounts" })).toBeInTheDocument();
  });

  it("opens cards from the dashboard liabilities card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View cards" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your cards" })).toBeInTheDocument();
  });

  it("opens the spending experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Spending" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
  });

  it("opens spending from the dashboard and returns after transaction detail", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View spending" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );
    expect(
      screen.getByRole("region", { name: "Payroll — Acme Corp" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Spending" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Payroll — Acme Corp")).toBeInTheDocument();
  });

  it("opens Insights from the primary navigation and inspects spending", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Insights" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Insights" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Attention insights" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card payment due" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spending decreased" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Net worth increased" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect spending" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
  });

  it("opens the existing spending view from the spending-change insight", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("region", { name: "Attention" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spending decreased" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inspect spending" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect spending" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inspect spending" })).not.toBeInTheDocument();

    const insight = calculateSpendingChange(fixtureTransactions);
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
  });

  it("opens a spending-change driver from the spending view into transaction detail", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Inspect spending" }));

    const region = screen.getByRole("region", { name: "Spending change" });
    await user.click(
      within(region).getByRole("button", { name: "View Rent — Oak Street Apt" }),
    );

    const detail = screen.getByRole("region", { name: "Rent — Oak Street Apt" });
    expect(within(detail).getByText("Expense")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
  });

  it("opens net-worth evidence from the dashboard into transaction detail", async () => {
    const user = userEvent.setup();
    render(<App />);

    const region = screen
      .getByRole("heading", { name: "Net worth increased" })
      .closest("article");
    expect(region).not.toBeNull();
    await user.click(
      within(region!).getByRole("button", { name: "Inspect Payroll — Acme Corp" }),
    );

    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    expect(within(detail).getByText("Income")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
  });
});

describe("Finora account and card management", () => {
  it("creates an account and reflects it in financial position", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Accounts" }));
    await user.click(screen.getByRole("button", { name: "Add account" }));
    await user.type(screen.getByLabelText("Account name"), "Travel Fund");
    await user.type(screen.getByLabelText("Account balance"), "500");
    await user.click(screen.getByRole("button", { name: "Save new account" }));

    expect(screen.getByRole("status")).toHaveTextContent("Account created.");
    expect(screen.getByRole("button", { name: /^Travel Fund/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getAllByText("$23,668.43").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$25,837.02").length).toBeGreaterThan(0);
  });

  it("edits an account name while keeping its transactions inspectable", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Accounts" }));
    await user.click(screen.getByRole("button", { name: "Edit this account" }));
    const name = screen.getByLabelText("Account name");
    await user.clear(name);
    await user.type(name, "Primary Checking");
    await user.click(screen.getByRole("button", { name: "Save account changes" }));

    expect(screen.getByRole("status")).toHaveTextContent("Account updated.");
    expect(screen.getByRole("region", { name: "Primary Checking" })).toBeInTheDocument();
    expect(screen.getByText("Payroll — Acme Corp")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );
    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    expect(within(detail).getByText("Primary Checking")).toBeInTheDocument();
  });

  it("creates and edits a card so utilization appears on the dashboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByLabelText("Card name"), "Store Card");
    await user.type(screen.getByLabelText("Card issuer"), "Northlake Bank");
    await user.type(screen.getByLabelText("Credit limit"), "1000");
    await user.type(screen.getByLabelText("Outstanding balance"), "100");
    await user.type(screen.getByLabelText("Statement end"), "2026-10-08");
    await user.type(screen.getByLabelText("Payment due date"), "2026-10-22");
    await user.type(screen.getByLabelText("Minimum payment"), "25");
    await user.click(screen.getByRole("button", { name: "Save new card" }));

    expect(screen.getByRole("status")).toHaveTextContent("Card created.");
    expect(screen.getByRole("button", { name: /^Store Card/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Visa Rewards/ }));
    await user.click(screen.getByRole("button", { name: "Edit this card" }));
    const limit = screen.getByLabelText("Credit limit");
    await user.clear(limit);
    await user.type(limit, "2500");
    await user.click(screen.getByRole("button", { name: "Save card changes" }));

    expect(screen.getByRole("status")).toHaveTextContent("Card updated.");
    expect(screen.getAllByText("73.7%").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getByRole("heading", { name: "High card utilization" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card payment due" })).toBeInTheDocument();
  });

  it("persists a created account across a remount", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await user.click(screen.getByRole("button", { name: "Accounts" }));
    await user.click(screen.getByRole("button", { name: "Add account" }));
    await user.type(screen.getByLabelText("Account name"), "Travel Fund");
    await user.type(screen.getByLabelText("Account balance"), "500");
    await user.click(screen.getByRole("button", { name: "Save new account" }));
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Accounts" }));
    expect(screen.getByRole("button", { name: /^Travel Fund/ })).toBeInTheDocument();
  });
});

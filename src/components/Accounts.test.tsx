import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  accountTypeLabel,
  formatCurrency,
} from "../domain/finance.ts";
import type { Account } from "../domain/types.ts";
import { Accounts } from "./Accounts.tsx";

function renderAccounts(
  overrides: {
    accounts?: Account[];
    selectedAccountId?: string;
    onSelectAccount?: (accountId: string) => void;
    onOpenTransaction?: (transactionId: string) => void;
    transactions?: typeof fixtureTransactions;
  } = {},
) {
  const accounts = overrides.accounts ?? fixtureAccounts;
  const selectedAccountId = overrides.selectedAccountId ?? accounts[0]?.id ?? "";

  return render(
    <Accounts
      accounts={accounts}
      cards={fixtureCards}
      transactions={overrides.transactions ?? fixtureTransactions}
      selectedAccountId={selectedAccountId}
      onSelectAccount={overrides.onSelectAccount ?? (() => undefined)}
      onOpenTransaction={overrides.onOpenTransaction}
    />,
  );
}

function accountSummary(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

describe("Finora accounts list", () => {
  it("renders every fixture account with name, type, balance, and currency", () => {
    renderAccounts();

    const list = screen.getByRole("region", { name: "Your accounts" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Accounts" }),
    ).toBeInTheDocument();

    for (const account of fixtureAccounts) {
      const summary = accountSummary(account.name);
      expect(
        within(summary).getAllByText(accountTypeLabel(account.type)).length,
      ).toBeGreaterThan(0);
      expect(
        within(summary).getByText(
          formatCurrency(account.balance, account.currency),
        ),
      ).toBeInTheDocument();
      expect(within(summary).getByText(new RegExp(account.currency))).toBeInTheDocument();
    }

    expect(within(list).queryByText("Checking", { exact: true })).not.toBeInTheDocument();
    expect(within(list).queryByText("Savings", { exact: true })).not.toBeInTheDocument();
    expect(within(list).queryByText("Brokerage", { exact: true })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no accounts", () => {
    renderAccounts({ accounts: [], selectedAccountId: "" });

    expect(screen.getByText("No accounts in this snapshot.")).toBeInTheDocument();
    expect(
      screen.getByText("Select an account to see its details."),
    ).toBeInTheDocument();
  });
});

describe("Finora account detail", () => {
  it("renders the selected account identity, stored balance, and type", () => {
    renderAccounts({ selectedAccountId: "acc-checking" });

    const detail = screen.getByRole("region", { name: "Everyday Checking" });
    const account = fixtureAccounts[0]!;

    expect(within(detail).getByText("Bank")).toBeInTheDocument();
    expect(
      within(detail).getByText(formatCurrency(account.balance, account.currency)),
    ).toBeInTheDocument();
    expect(within(detail).getByText("USD")).toBeInTheDocument();
  });

  it("lists related transactions from explicit account relationships", () => {
    renderAccounts({ selectedAccountId: "acc-checking" });

    const transactions = screen.getByRole("region", {
      name: "Account transactions",
    });

    expect(within(transactions).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(transactions).getByText("Whole Foods Market")).toBeInTheDocument();
    expect(within(transactions).getByText("Payment — Thank you")).toBeInTheDocument();
    expect(
      within(transactions).getByText("Transfer to Emergency Savings"),
    ).toBeInTheDocument();
    expect(
      within(transactions).queryByText("Transit — Metro Card"),
    ).not.toBeInTheDocument();
    expect(
      within(transactions).queryByText("Dinner — Riverview"),
    ).not.toBeInTheDocument();
    expect(
      within(transactions).queryByText("Interest credit"),
    ).not.toBeInTheDocument();
  });

  it("includes a transfer on the destination account and income on Emergency Savings", () => {
    renderAccounts({ selectedAccountId: "acc-savings" });

    const transactions = screen.getByRole("region", {
      name: "Account transactions",
    });

    expect(within(transactions).getByText("Interest credit")).toBeInTheDocument();
    expect(
      within(transactions).getByText("Transfer to Emergency Savings"),
    ).toBeInTheDocument();
    expect(
      within(transactions).queryByText("Payroll — Acme Corp"),
    ).not.toBeInTheDocument();
    expect(
      within(transactions).queryByText("Transit — Metro Card"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty transaction state when the account has no related events", () => {
    const idle: Account = {
      id: "acc-idle",
      name: "Idle Cash",
      type: "cash",
      balance: 12,
      currency: "USD",
    };

    renderAccounts({
      accounts: [idle],
      selectedAccountId: idle.id,
      transactions: fixtureTransactions,
    });

    expect(screen.getByRole("region", { name: "Idle Cash" })).toBeInTheDocument();
    expect(screen.getByText("No transactions for this account.")).toBeInTheDocument();
  });

  it("opens a related transaction through the existing callback", async () => {
    const user = userEvent.setup();
    const onOpenTransaction = vi.fn();
    renderAccounts({
      selectedAccountId: "acc-checking",
      onOpenTransaction,
    });

    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );

    expect(onOpenTransaction).toHaveBeenCalledWith("txn-001");
  });

  it("updates the detail after selecting a different account", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [selectedAccountId, setSelectedAccountId] = useState("acc-checking");

      return (
        <Accounts
          accounts={fixtureAccounts}
          cards={fixtureCards}
          transactions={fixtureTransactions}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
        />
      );
    }

    render(<Harness />);

    await user.click(accountSummary("Investment Account"));

    const detail = screen.getByRole("region", { name: "Investment Account" });
    expect(within(detail).getAllByText("Investment").length).toBeGreaterThan(0);
    expect(within(detail).getByText("$8,420.55")).toBeInTheDocument();

    const transactions = screen.getByRole("region", {
      name: "Account transactions",
    });
    expect(within(transactions).getByText("Dividend — VTI")).toBeInTheDocument();
    expect(within(transactions).getByText("Brokerage deposit")).toBeInTheDocument();
    expect(
      within(transactions).queryByText("Payroll — Acme Corp"),
    ).not.toBeInTheDocument();
  });
});

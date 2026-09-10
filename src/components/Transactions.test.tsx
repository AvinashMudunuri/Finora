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
  eventTypeLabel,
  formatCurrency,
  formatDate,
  signedAmount,
  transactionContext,
} from "../domain/finance.ts";
import { Transactions } from "./Transactions.tsx";

function renderTransactions(
  overrides: {
    selectedTransactionId?: string;
    transactions?: typeof fixtureTransactions;
    accounts?: typeof fixtureAccounts;
  } = {},
) {
  return render(
    <Transactions
      accounts={overrides.accounts ?? fixtureAccounts}
      cards={fixtureCards}
      transactions={overrides.transactions ?? fixtureTransactions}
      selectedTransactionId={overrides.selectedTransactionId ?? "txn-001"}
      onSelectTransaction={() => undefined}
    />,
  );
}

function transactionList() {
  return screen.getByRole("list", { name: "Transaction list" });
}

describe("Finora transactions list", () => {
  it("renders every fixture transaction with date, amount, event type, and context", () => {
    renderTransactions();

    const list = transactionList();
    const accountsById = new Map(
      fixtureAccounts.map((account) => [account.id, account]),
    );
    const cardsById = new Map(fixtureCards.map((card) => [card.id, card]));

    expect(within(list).getAllByRole("button")).toHaveLength(
      fixtureTransactions.length,
    );

    for (const transaction of fixtureTransactions) {
      const row = within(list)
        .getByText(transaction.description)
        .closest("button");
      expect(row).not.toBeNull();
      expect(
        within(row!).getByText(formatDate(transaction.date)),
      ).toBeInTheDocument();
      expect(
        within(row!).getByText(
          formatCurrency(signedAmount(transaction), transaction.currency, true),
        ),
      ).toBeInTheDocument();
      expect(
        within(row!).getByText(eventTypeLabel(transaction.eventType)),
      ).toBeInTheDocument();
      expect(
        within(row!).getByText(
          transactionContext(transaction, accountsById, cardsById),
        ),
      ).toBeInTheDocument();
    }
  });

  it("lists newest transactions first", () => {
    renderTransactions();

    const descriptions = within(transactionList())
      .getAllByRole("button")
      .map((row) => row.textContent ?? "");

    expect(descriptions[0]).toContain("Payroll — Acme Corp");
    expect(descriptions.at(-1)).toContain("Dividend — VTI");
  });

  it("filters by account and restores the complete list", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Emergency Savings" },
      ),
    );

    const list = transactionList();
    expect(within(list).getByText("Interest credit")).toBeInTheDocument();
    expect(within(list).getByText("Transfer to Emergency Savings")).toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(list).queryByText("Dinner — Riverview")).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "All transactions" },
      ),
    );

    expect(within(list).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(list).getAllByRole("button")).toHaveLength(
      fixtureTransactions.length,
    );
  });

  it("filters by card using the explicit card relationship", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Visa Rewards" },
      ),
    );

    const list = transactionList();
    expect(within(list).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(list).getByText("Payment — Thank you")).toBeInTheDocument();
    expect(within(list).queryByText("Groceries — Market Hall")).not.toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(list).queryByText("Whole Foods Market")).not.toBeInTheDocument();
  });

  it("filters by financial event type", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Card purchase" },
      ),
    );

    const list = transactionList();
    expect(within(list).getByText("Transit — Metro Card")).toBeInTheDocument();
    expect(within(list).getByText("Groceries — Market Hall")).toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(within(list).queryByText("Payment — Thank you")).not.toBeInTheDocument();
  });

  it("shows an empty state when no transactions match", async () => {
    const user = userEvent.setup();
    render(
      <Transactions
        accounts={[
          ...fixtureAccounts,
          {
            id: "acc-empty",
            name: "New Brokerage",
            type: "investment",
            balance: 0,
            currency: "USD",
          },
        ]}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        selectedTransactionId="txn-001"
        onSelectTransaction={() => undefined}
      />,
    );

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only New Brokerage" },
      ),
    );

    expect(
      screen.getByText("No transactions match the current search and filters."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the snapshot has no transactions", () => {
    renderTransactions({
      transactions: [],
      selectedTransactionId: "",
    });

    expect(
      screen.getByText("No transactions in this snapshot."),
    ).toBeInTheDocument();
  });
});

describe("Finora transaction detail", () => {
  it("shows the selected income transaction and its account", () => {
    renderTransactions({ selectedTransactionId: "txn-001" });

    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    const transaction = fixtureTransactions.find((item) => item.id === "txn-001")!;

    expect(within(detail).getByText("txn-001")).toBeInTheDocument();
    expect(within(detail).getByText(formatDate(transaction.date))).toBeInTheDocument();
    expect(within(detail).getByText("Income")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(detail).getByText("USD")).toBeInTheDocument();
    expect(
      within(detail).getByText(
        formatCurrency(signedAmount(transaction), transaction.currency, true),
      ),
    ).toBeInTheDocument();
    expect(within(detail).queryByText("Visa Rewards")).not.toBeInTheDocument();
  });

  it("shows funding account and card for a card payment", () => {
    renderTransactions({ selectedTransactionId: "txn-003" });

    const detail = screen.getByRole("region", { name: "Payment — Thank you" });

    expect(within(detail).getByText("Card payment")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(detail).getByText("Visa Rewards")).toBeInTheDocument();
  });

  it("selecting another transaction replaces the detail", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [selectedTransactionId, setSelectedTransactionId] = useState("txn-001");

      return (
        <Transactions
          accounts={fixtureAccounts}
          cards={fixtureCards}
          transactions={fixtureTransactions}
          selectedTransactionId={selectedTransactionId}
          onSelectTransaction={setSelectedTransactionId}
        />
      );
    }

    render(<Harness />);

    await user.click(
      within(transactionList()).getByRole("button", {
        name: /Dinner — Riverview/,
      }),
    );

    const detail = screen.getByRole("region", { name: "Dinner — Riverview" });
    expect(within(detail).getByText("Card purchase")).toBeInTheDocument();
    expect(within(detail).getByText("Visa Rewards")).toBeInTheDocument();
    expect(within(detail).queryByText("Amex Everyday")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Payroll — Acme Corp" })).not.toBeInTheDocument();
  });

  it("explains when the selected transaction is not in the current filter", async () => {
    const user = userEvent.setup();
    renderTransactions({ selectedTransactionId: "txn-001" });

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Emergency Savings" },
      ),
    );

    expect(
      screen.getByText("This transaction is not in the current filter."),
    ).toBeInTheDocument();
  });
});

describe("Finora transaction search and periods", () => {
  it("searches stored description, event, and account context", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "metro",
    );

    const list = transactionList();
    expect(within(list).getByText("Transit — Metro Card")).toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(
      screen.getByText(/1 transaction · All stored months · “metro”/),
    ).toBeInTheDocument();
  });

  it("combines search with account and event filters", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Visa Rewards" },
      ),
    );
    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Card purchase" },
      ),
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "dinner",
    );

    const list = transactionList();
    expect(within(list).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(list).queryByText("Payment — Thank you")).not.toBeInTheDocument();
    expect(within(list).queryByText("Transit — Metro Card")).not.toBeInTheDocument();
  });

  it("navigates stored activity months without inventing empty months", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.click(screen.getByRole("button", { name: "Older period" }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(within(transactionList()).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(transactionList()).queryByText("Dividend — VTI")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Older period" }));
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(within(transactionList()).getByText("Dividend — VTI")).toBeInTheDocument();
    expect(within(transactionList()).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Older period" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Newer period" }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
  });

  it("shows a dedicated empty state for an unmatched search", async () => {
    const user = userEvent.setup();
    renderTransactions();

    await user.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "no-such-merchant",
    );

    expect(
      screen.getByText("No transactions match the current search and filters."),
    ).toBeInTheDocument();
  });

  it("opens the related account from transaction detail", async () => {
    const user = userEvent.setup();
    const onOpenAccount = vi.fn();
    render(
      <Transactions
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        selectedTransactionId="txn-001"
        onSelectTransaction={() => undefined}
        onOpenAccount={onOpenAccount}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Inspect Everyday Checking" }));
    expect(onOpenAccount).toHaveBeenCalledWith("acc-checking");
  });
});

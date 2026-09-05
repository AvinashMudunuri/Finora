import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
        { name: "Emergency Savings" },
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
        { name: "Visa Rewards" },
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
        { name: "Card purchase" },
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
        { name: "New Brokerage" },
      ),
    );

    expect(
      screen.getByText("No transactions for this filter."),
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
        { name: "Emergency Savings" },
      ),
    );

    expect(
      screen.getByText("This transaction is not in the current filter."),
    ).toBeInTheDocument();
  });
});

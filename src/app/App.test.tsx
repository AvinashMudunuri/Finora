import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CardGateway } from "../application/cards/contract.ts";
import type { TransactionGateway } from "../application/transactions/contract.ts";
import { CARD_BACKEND_MIGRATED_KEY } from "../application/cards/migration.ts";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
  MANAGED_CARDS_STORAGE_KEY,
  saveManagedCards,
} from "../data/fixtures.ts";
import { calculateSpendingChange } from "../domain/calculations.ts";
import { formatCurrency, formatMonth } from "../domain/finance.ts";
import type { Card, Transaction } from "../domain/types.ts";
import { createCard, updateCard } from "../domain/validate.ts";
import App from "./App.tsx";

function memoryCardGateway(initial: Card[] = fixtureCards): CardGateway {
  let cards = initial.map((card) => ({ ...card }));
  return {
    list: async () => cards.map((card) => ({ ...card })),
    create: async (draft) => {
      const created = createCard(draft, cards);
      if (created.ok) {
        cards = [...cards, created.value];
      }
      return created;
    },
    update: async (id, draft) => {
      const updated = updateCard(id, draft, cards, fixtureTransactions, fixtureAccounts);
      if (updated.ok) {
        cards = cards.map((card) => (card.id === id ? updated.value : card));
      }
      return updated;
    },
  };
}

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

  it("opens a selected transaction from Insights net-worth evidence", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Insights" }));
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

  it("opens net-worth evidence from Insights into transaction detail", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Insights" }));
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

  it("persists a created card across a remount", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

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
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("button", { name: /^Store Card/ })).toBeInTheDocument();
  });
});

describe("Finora card backend integration", () => {
  it("loads, creates, and edits cards through the card gateway", async () => {
    const user = userEvent.setup();
    const cardGateway = memoryCardGateway();
    render(<App cardGateway={cardGateway} />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("button", { name: /^Visa Rewards/ })).toBeInTheDocument();

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
    expect((await cardGateway.list()).map((card) => card.name)).toContain("Store Card");

    await user.click(screen.getByRole("button", { name: /^Visa Rewards/ }));
    await user.click(screen.getByRole("button", { name: "Edit this card" }));
    const name = screen.getByLabelText("Card name");
    await user.clear(name);
    await user.type(name, "Primary Visa");
    await user.click(screen.getByRole("button", { name: "Save card changes" }));

    expect(screen.getByRole("status")).toHaveTextContent("Card updated.");
    expect(screen.getByRole("region", { name: "Primary Visa" })).toBeInTheDocument();
    expect(screen.getByText("Dinner — Riverview")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getByRole("heading", { name: "Card payment due" })).toBeInTheDocument();
  });

  it("surfaces card validation from the existing domain rules", async () => {
    const user = userEvent.setup();
    render(<App cardGateway={memoryCardGateway()} />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByLabelText("Card issuer"), "Northlake Bank");
    await user.type(screen.getByLabelText("Credit limit"), "1000");
    await user.type(screen.getByLabelText("Outstanding balance"), "100");
    await user.type(screen.getByLabelText("Statement end"), "2026-10-08");
    await user.type(screen.getByLabelText("Payment due date"), "2026-10-22");
    await user.type(screen.getByLabelText("Minimum payment"), "25");
    await user.click(screen.getByRole("button", { name: "Save new card" }));

    expect(screen.getByText("Card name is required.")).toBeInTheDocument();
  });

  it("migrates managed local cards onto a fixture-seeded backend and retires localStorage", async () => {
    saveManagedCards(
      window.localStorage,
      [
        ...fixtureCards,
        {
          id: "card-1",
          name: "Store Card",
          issuer: "Northlake Bank",
          creditLimit: 1000,
          outstandingBalance: 100,
          availableCredit: 900,
          currency: "USD",
          statementPeriodEnd: "2026-10-08",
          paymentDueDate: "2026-10-22",
          minimumPayment: 25,
          paymentStatus: "current",
        },
      ],
      fixtureTransactions,
      fixtureAccounts,
    );
    const cardGateway = memoryCardGateway();
    const user = userEvent.setup();
    render(<App cardGateway={cardGateway} />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Store Card/ })).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(MANAGED_CARDS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CARD_BACKEND_MIGRATED_KEY)).toBe("1");
    expect((await cardGateway.list()).map((card) => card.name)).toContain("Store Card");
  });

  it("keeps a renamed card's fixture transactions inspectable", async () => {
    const user = userEvent.setup();
    render(<App cardGateway={memoryCardGateway()} />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: /^Visa Rewards/ }));
    await user.click(screen.getByRole("button", { name: "Edit this card" }));
    const name = screen.getByLabelText("Card name");
    await user.clear(name);
    await user.type(name, "Primary Visa");
    await user.click(screen.getByRole("button", { name: "Save card changes" }));

    await user.click(
      screen.getByRole("button", { name: "View Dinner — Riverview" }),
    );
    const detail = screen.getByRole("region", { name: "Dinner — Riverview" });
    expect(within(detail).getByText("Primary Visa")).toBeInTheDocument();
  });
});

function memoryTransactionGateway(
  initial: Transaction[] = fixtureTransactions,
): TransactionGateway {
  const transactions = initial.map((transaction) => ({ ...transaction }));
  return {
    list: async () => transactions.map((transaction) => ({ ...transaction })),
  };
}

describe("Finora transaction backend integration", () => {
  it("loads fixture transactions through the transaction gateway", async () => {
    const user = userEvent.setup();
    render(<App transactionGateway={memoryTransactionGateway()} />);

    await user.click(screen.getByRole("button", { name: "Transactions" }));
    const list = await waitFor(() => screen.getByRole("list", { name: "Transaction list" }));
    expect(within(list).getByText("Payroll — Acme Corp")).toBeInTheDocument();
    expect(within(list).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(list).getByText("Dividend — VTI")).toBeInTheDocument();
  });

  it("filters gateway-backed transactions by card and search", async () => {
    const user = userEvent.setup();
    render(<App transactionGateway={memoryTransactionGateway()} />);

    await user.click(screen.getByRole("button", { name: "Transactions" }));
    const list = await waitFor(() => screen.getByRole("list", { name: "Transaction list" }));
    expect(within(list).getByText("Payroll — Acme Corp")).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Visa Rewards" },
      ),
    );
    expect(within(list).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "All transactions" },
      ),
    );
    await user.type(screen.getByLabelText("Search transactions"), "Riverview");
    expect(within(list).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(list).queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
  });

  it("keeps card-linked transactions after a card rename", async () => {
    const user = userEvent.setup();
    render(
      <App
        cardGateway={memoryCardGateway()}
        transactionGateway={memoryTransactionGateway()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: /^Visa Rewards/ }));
    await user.click(screen.getByRole("button", { name: "Edit this card" }));
    const name = screen.getByLabelText("Card name");
    await user.clear(name);
    await user.type(name, "Primary Visa");
    await user.click(screen.getByRole("button", { name: "Save card changes" }));

    await user.click(screen.getByRole("button", { name: "Transactions" }));
    await waitFor(() => {
      expect(screen.getByText("Dinner — Riverview")).toBeInTheDocument();
    });
    await user.click(
      within(screen.getByRole("group", { name: "Filter transactions" })).getByRole(
        "button",
        { name: "Show only Primary Visa" },
      ),
    );
    expect(screen.getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(screen.queryByText("Payroll — Acme Corp")).not.toBeInTheDocument();
  });

  it("surfaces a transaction backend failure without changing fixture calculations in memory", async () => {
    const user = userEvent.setup();
    render(
      <App
        transactionGateway={{
          list: async () => {
            throw new Error("offline");
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Transactions are temporarily unavailable."),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Transactions" }));
    expect(
      within(screen.getByRole("list", { name: "Transaction list" })).getByText(
        "Payroll — Acme Corp",
      ),
    ).toBeInTheDocument();
  });
});

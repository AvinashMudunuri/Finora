import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import { calculateCardUtilization } from "../domain/calculations.ts";
import {
  formatCurrency,
  formatDate,
  formatUtilization,
  paymentStatusLabel,
} from "../domain/finance.ts";
import type { Card } from "../domain/types.ts";
import { Cards, type CardsProps } from "./Cards.tsx";

function renderCards(
  overrides: {
    cards?: Card[];
    selectedCardId?: string;
    onCreateCard?: CardsProps["onCreateCard"];
    onUpdateCard?: CardsProps["onUpdateCard"];
  } = {},
) {
  const cards = overrides.cards ?? fixtureCards;
  const selectedCardId = overrides.selectedCardId ?? cards[0]?.id ?? "";

  return render(
    <Cards
      cards={cards}
      transactions={fixtureTransactions}
      selectedCardId={selectedCardId}
      onSelectCard={() => undefined}
      onCreateCard={overrides.onCreateCard}
      onUpdateCard={overrides.onUpdateCard}
    />,
  );
}

function cardSummary(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

describe("Finora cards list", () => {
  it("renders every fixture card with its identity and issuer", () => {
    renderCards();

    const list = screen.getByRole("region", { name: "Your cards" });

    expect(within(list).getByText("Visa Rewards")).toBeInTheDocument();
    expect(within(list).getByText("Northlake Bank")).toBeInTheDocument();
    expect(within(list).getByText("Amex Everyday")).toBeInTheDocument();
    expect(within(list).getByText("American Express")).toBeInTheDocument();
  });

  it("renders outstanding balance, credit limit, and available credit from the calculation", () => {
    renderCards();

    const utilization = calculateCardUtilization(fixtureCards);
    const list = screen.getByRole("region", { name: "Your cards" });

    for (const result of utilization) {
      const card = fixtureCards.find((item) => item.id === result.cardId);
      expect(card).toBeDefined();

      const summary = within(list)
        .getByText(card!.name)
        .closest("button");
      expect(summary).not.toBeNull();

      expect(
        within(summary!).getByText(
          formatCurrency(result.outstandingBalance, card!.currency),
        ),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(
          formatCurrency(result.creditLimit, card!.currency),
        ),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(
          formatCurrency(result.availableCredit, card!.currency),
        ),
      ).toBeInTheDocument();
    }
  });

  it("renders calculated utilization instead of a UI-local formula", () => {
    renderCards();

    const [visa, amex] = calculateCardUtilization(fixtureCards);
    const list = screen.getByRole("region", { name: "Your cards" });

    expect(visa).toBeDefined();
    expect(amex).toBeDefined();
    expect(
      within(list).getByText(formatUtilization(visa!.utilization)),
    ).toBeInTheDocument();
    expect(
      within(list).getByText(formatUtilization(amex!.utilization)),
    ).toBeInTheDocument();
  });

  it("renders each card's own outstanding, minimum payment, due date, and status", () => {
    renderCards();

    const list = screen.getByRole("region", { name: "Your cards" });

    for (const card of fixtureCards) {
      const summary = within(list).getByText(card.name).closest("button");
      expect(summary).not.toBeNull();
      expect(
        within(summary!).getByText(
          formatCurrency(card.outstandingBalance, card.currency),
        ),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(
          formatCurrency(card.minimumPayment, card.currency),
        ),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(formatDate(card.paymentDueDate)),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(paymentStatusLabel(card.paymentStatus)),
      ).toBeInTheDocument();
    }

    const visa = within(list).getByText("Visa Rewards").closest("button");
    const amex = within(list).getByText("Amex Everyday").closest("button");
    expect(visa).not.toBeNull();
    expect(amex).not.toBeNull();
    expect(within(visa!).queryByText("$25.00")).not.toBeInTheDocument();
    expect(within(amex!).queryByText("$35.00")).not.toBeInTheDocument();
    expect(within(visa!).queryByText("Current")).not.toBeInTheDocument();
    expect(within(amex!).queryByText("Due")).not.toBeInTheDocument();
  });

  it("keeps zero and overdue obligations on the card that owns them", () => {
    const cards: Card[] = [
      {
        ...fixtureCards[0]!,
        id: "card-paid",
        name: "Paid Card",
        outstandingBalance: 0,
        availableCredit: fixtureCards[0]!.creditLimit,
        minimumPayment: 0,
        paymentDueDate: "2026-10-01",
        paymentStatus: "current",
      },
      {
        ...fixtureCards[1]!,
        id: "card-late",
        name: "Late Card",
        outstandingBalance: 120,
        availableCredit: fixtureCards[1]!.creditLimit - 120,
        minimumPayment: 40,
        paymentDueDate: "2026-08-15",
        paymentStatus: "overdue",
      },
    ];

    renderCards({ cards, selectedCardId: "card-paid" });

    const list = screen.getByRole("region", { name: "Your cards" });
    const paid = within(list).getByText("Paid Card").closest("button");
    const late = within(list).getByText("Late Card").closest("button");
    expect(paid).not.toBeNull();
    expect(late).not.toBeNull();

    expect(within(paid!).getAllByText("$0.00").length).toBeGreaterThanOrEqual(2);
    expect(within(paid!).getByText("Current")).toBeInTheDocument();
    expect(within(paid!).getByText(formatDate("2026-10-01"))).toBeInTheDocument();
    expect(within(paid!).queryByText("Overdue")).not.toBeInTheDocument();
    expect(within(paid!).queryByText("$40.00")).not.toBeInTheDocument();

    expect(within(late!).getByText("$120.00")).toBeInTheDocument();
    expect(within(late!).getByText("$40.00")).toBeInTheDocument();
    expect(within(late!).getByText("Overdue")).toBeInTheDocument();
    expect(within(late!).getByText(formatDate("2026-08-15"))).toBeInTheDocument();
    expect(within(late!).queryByText("Current")).not.toBeInTheDocument();
  });

  it("preserves the null utilization display for a zero credit limit", () => {
    const zeroLimitCard: Card = {
      ...fixtureCards[0]!,
      id: "card-zero",
      name: "Closed Card",
      creditLimit: 0,
      outstandingBalance: 10,
      availableCredit: 0,
    };
    const [result] = calculateCardUtilization([zeroLimitCard]);

    renderCards({
      cards: [zeroLimitCard],
      selectedCardId: zeroLimitCard.id,
    });

    expect(result?.utilization).toBeNull();
    expect(screen.getAllByText(formatUtilization(null)).length).toBeGreaterThan(0);
  });
});

describe("Finora card detail", () => {
  it("renders the selected card identity, balances, and payment information", () => {
    renderCards({ selectedCardId: "card-visa" });

    const detail = screen.getByRole("region", { name: "Visa Rewards" });
    const [visa] = calculateCardUtilization(fixtureCards);
    const card = fixtureCards[0]!;

    expect(within(detail).getByText("Northlake Bank")).toBeInTheDocument();
    expect(
      within(detail).getByText(
        formatCurrency(visa!.outstandingBalance, card.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(formatCurrency(visa!.creditLimit, card.currency)),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(
        formatCurrency(visa!.availableCredit, card.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(formatUtilization(visa!.utilization)),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(formatDate(card.statementPeriodEnd)),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(formatDate(card.paymentDueDate)),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(
        formatCurrency(card.minimumPayment, card.currency),
      ),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(paymentStatusLabel(card.paymentStatus)),
    ).toBeInTheDocument();
  });

  it("renders only transactions associated with the selected card", () => {
    renderCards({ selectedCardId: "card-visa" });

    const transactions = screen.getByRole("region", { name: "Card transactions" });

    expect(within(transactions).getByText("Payment — Thank you")).toBeInTheDocument();
    expect(within(transactions).getByText("Transit — Metro Card")).toBeInTheDocument();
    expect(within(transactions).getByText("Dinner — Riverview")).toBeInTheDocument();
    expect(within(transactions).getByText("Pharmacy — Riverside")).toBeInTheDocument();
    expect(within(transactions).getByText("Streaming — Northlight")).toBeInTheDocument();
    expect(
      within(transactions).queryByText("Groceries — Market Hall"),
    ).not.toBeInTheDocument();
    expect(
      within(transactions).queryByText("Whole Foods Market"),
    ).not.toBeInTheDocument();
    expect(
      within(transactions).queryByText("Payroll — Acme Corp"),
    ).not.toBeInTheDocument();
  });

  it("does not keep another card's transactions after selecting a different card", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [selectedCardId, setSelectedCardId] = useState("card-visa");

      return (
        <Cards
          cards={fixtureCards}
          transactions={fixtureTransactions}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
        />
      );
    }

    render(<Harness />);

    await user.click(cardSummary("Amex Everyday"));

    const transactions = screen.getByRole("region", { name: "Card transactions" });
    expect(within(transactions).getByText("Groceries — Market Hall")).toBeInTheDocument();
    expect(within(transactions).queryByText("Dinner — Riverview")).not.toBeInTheDocument();
    expect(within(transactions).queryByText("Payment — Thank you")).not.toBeInTheDocument();
  });
});

describe("Finora card management", () => {
  it("creates a valid card through the management form", async () => {
    const user = userEvent.setup();
    const onCreateCard = vi.fn((draft) => ({
      ok: true as const,
      value: {
        id: "card-1",
        name: String(draft.name),
        issuer: String(draft.issuer),
        creditLimit: Number(draft.creditLimit),
        outstandingBalance: Number(draft.outstandingBalance),
        availableCredit: 900,
        currency: "USD" as const,
        statementPeriodEnd: String(draft.statementPeriodEnd),
        paymentDueDate: String(draft.paymentDueDate),
        minimumPayment: Number(draft.minimumPayment),
        paymentStatus: "current" as const,
      },
    }));

    renderCards({ onCreateCard });

    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByLabelText("Card name"), "Store Card");
    await user.type(screen.getByLabelText("Card issuer"), "Northlake Bank");
    await user.type(screen.getByLabelText("Credit limit"), "1000");
    await user.type(screen.getByLabelText("Outstanding balance"), "100");
    await user.type(screen.getByLabelText("Statement end"), "2026-10-08");
    await user.type(screen.getByLabelText("Payment due date"), "2026-10-22");
    await user.type(screen.getByLabelText("Minimum payment"), "25");
    await user.click(screen.getByRole("button", { name: "Save new card" }));

    expect(onCreateCard).toHaveBeenCalledWith({
      name: "Store Card",
      issuer: "Northlake Bank",
      creditLimit: "1000",
      outstandingBalance: "100",
      statementPeriodEnd: "2026-10-08",
      paymentDueDate: "2026-10-22",
      minimumPayment: "25",
      paymentStatus: "current",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Card created.");
  });

  it("shows field validation when card creation is rejected", async () => {
    const user = userEvent.setup();
    renderCards({
      onCreateCard: () => ({
        ok: false,
        errors: { creditLimit: "Credit limit must be greater than 0." },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.click(screen.getByRole("button", { name: "Save new card" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Credit limit must be greater than 0.",
    );
    expect(screen.getByLabelText("Credit limit")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("edits the selected card while keeping its identifier", async () => {
    const user = userEvent.setup();
    const onUpdateCard = vi.fn((id, draft) => ({
      ok: true as const,
      value: {
        id,
        name: String(draft.name),
        issuer: String(draft.issuer),
        creditLimit: Number(draft.creditLimit),
        outstandingBalance: Number(draft.outstandingBalance),
        availableCredit: 3157.81,
        currency: "USD" as const,
        statementPeriodEnd: String(draft.statementPeriodEnd),
        paymentDueDate: String(draft.paymentDueDate),
        minimumPayment: Number(draft.minimumPayment),
        paymentStatus: "due" as const,
      },
    }));

    renderCards({ selectedCardId: "card-visa", onUpdateCard });

    await user.click(screen.getByRole("button", { name: "Edit this card" }));
    const limit = screen.getByLabelText("Credit limit");
    await user.clear(limit);
    await user.type(limit, "2500");
    await user.click(screen.getByRole("button", { name: "Save card changes" }));

    expect(onUpdateCard).toHaveBeenCalledWith(
      "card-visa",
      expect.objectContaining({
        name: "Visa Rewards",
        creditLimit: "2500",
        outstandingBalance: "1842.19",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Card updated.");
  });
});

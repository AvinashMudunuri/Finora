import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
import { Cards } from "./Cards.tsx";

function renderCards(
  overrides: {
    cards?: Card[];
    selectedCardId?: string;
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

  it("renders payment due date and payment status for each card", () => {
    renderCards();

    const list = screen.getByRole("region", { name: "Your cards" });

    for (const card of fixtureCards) {
      const summary = within(list).getByText(card.name).closest("button");
      expect(summary).not.toBeNull();
      expect(
        within(summary!).getByText(formatDate(card.paymentDueDate)),
      ).toBeInTheDocument();
      expect(
        within(summary!).getByText(paymentStatusLabel(card.paymentStatus)),
      ).toBeInTheDocument();
    }
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

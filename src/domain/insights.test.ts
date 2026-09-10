import { describe, expect, it } from "vitest";
import {
  cardsWithCurrentPaymentStatus,
  cardsWithHighVisaUtilization,
  cardsWithVisaOverduePaymentStatus,
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";
import {
  calculateCardPaymentAttention,
  calculateHighCardUtilization,
  calculateNetWorthChange,
  calculateSpendingChange,
} from "./calculations.ts";
import {
  ATTENTION_EMPTY_COPY,
  attentionTitle,
  listAttentionInsights,
} from "./insights.ts";

describe("listAttentionInsights", () => {
  it("orders default fixture insights as due payment, spending change, then net-worth change", () => {
    const insights = listAttentionInsights(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );

    expect(insights.map((insight) => insight.kind)).toEqual([
      "card-payment-due",
      "spending-change",
      "net-worth-change",
    ]);
    expect(calculateHighCardUtilization(fixtureCards)).toBeNull();
    expect(insights[0] && insights[0].kind === "card-payment-due" && insights[0].payment).toEqual(
      calculateCardPaymentAttention(fixtureCards),
    );
    expect(insights[1] && insights[1].kind === "spending-change" && insights[1].change).toEqual(
      calculateSpendingChange(fixtureTransactions),
    );
    expect(insights[2] && insights[2].kind === "net-worth-change" && insights[2].change).toEqual(
      calculateNetWorthChange(fixtureAccounts, fixtureCards, fixtureTransactions),
    );
  });

  it("ranks overdue payment attention above due payment attention", () => {
    const insights = listAttentionInsights(
      fixtureAccounts,
      cardsWithVisaOverduePaymentStatus(fixtureCards),
      fixtureTransactions,
    );

    expect(insights[0]?.kind).toBe("card-payment-overdue");
    expect(insights[0]?.priority).toBe(1);
    expect(
      insights[0] && insights[0].kind === "card-payment-overdue" && insights[0].payment.cardId,
    ).toBe("card-visa");
  });

  it("ranks high utilization after payment attention and before spending change", () => {
    const cards = cardsWithHighVisaUtilization(fixtureCards).map((card) =>
      card.id === "card-visa" ? { ...card, paymentStatus: "due" as const } : card,
    );
    const insights = listAttentionInsights(
      fixtureAccounts,
      cards,
      fixtureTransactions,
    );

    expect(insights.map((insight) => insight.kind)).toEqual([
      "card-payment-due",
      "high-card-utilization",
      "spending-change",
      "net-worth-change",
    ]);
    expect(insights.map((insight) => insight.priority)).toEqual([2, 3, 4, 5]);
  });

  it("omits spending and net-worth insights when there is no stored activity", () => {
    const insights = listAttentionInsights(fixtureAccounts, fixtureCards, []);

    expect(insights.map((insight) => insight.kind)).toEqual(["card-payment-due"]);
    expect(calculateSpendingChange([])).toBeNull();
    expect(calculateNetWorthChange(fixtureAccounts, fixtureCards, [])).toBeNull();
  });

  it("returns no attention insights when cards are current and there is no stored activity", () => {
    expect(
      listAttentionInsights(
        fixtureAccounts,
        cardsWithCurrentPaymentStatus(fixtureCards),
        [],
      ),
    ).toEqual([]);
  });

  it("reuses the existing high-utilization calculation without new math", () => {
    const cards = cardsWithHighVisaUtilization(fixtureCards);
    const insights = listAttentionInsights(fixtureAccounts, cards, []);
    const expected = calculateHighCardUtilization(cards);

    expect(insights).toHaveLength(1);
    expect(insights[0]?.kind).toBe("high-card-utilization");
    expect(
      insights[0] && insights[0].kind === "high-card-utilization" && insights[0].utilization,
    ).toEqual(expected);
  });

  it("names attention items from existing headlines without advice", () => {
    const defaultInsights = listAttentionInsights(
      fixtureAccounts,
      fixtureCards,
      fixtureTransactions,
    );
    const overdue = listAttentionInsights(
      fixtureAccounts,
      cardsWithVisaOverduePaymentStatus(fixtureCards),
      [],
    )[0]!;
    const highUtil = listAttentionInsights(
      fixtureAccounts,
      cardsWithHighVisaUtilization(fixtureCards),
      [],
    )[0]!;

    expect(defaultInsights.map(attentionTitle)).toEqual([
      "Card payment due",
      "Spending decreased",
      "Net worth increased",
    ]);
    expect(attentionTitle(overdue)).toBe("Card payment overdue");
    expect(attentionTitle(highUtil)).toBe("High card utilization");
    expect(ATTENTION_EMPTY_COPY).toMatch(/not a judgment/i);
    expect(ATTENTION_EMPTY_COPY).not.toMatch(/consider/i);
  });
});

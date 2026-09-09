import type { Account, Card, Transaction } from "./types.ts";
import {
  calculateCardPaymentAttention,
  calculateHighCardUtilization,
  calculateNetWorthChange,
  calculateSpendingChange,
  type CardPaymentAttentionResult,
  type HighCardUtilizationResult,
  type NetWorthChangeResult,
  type SpendingChangeResult,
} from "./calculations.ts";

export const INSIGHT_PRIORITY = {
  "card-payment-overdue": 1,
  "card-payment-due": 2,
  "high-card-utilization": 3,
  "spending-change": 4,
  "net-worth-change": 5,
} as const;

export type AttentionInsightKind = keyof typeof INSIGHT_PRIORITY;

export type CardPaymentInsight = {
  readonly kind: "card-payment-overdue" | "card-payment-due";
  readonly priority: 1 | 2;
  readonly payment: CardPaymentAttentionResult;
};

export type HighUtilizationInsight = {
  readonly kind: "high-card-utilization";
  readonly priority: 3;
  readonly utilization: HighCardUtilizationResult;
};

export type SpendingChangeInsight = {
  readonly kind: "spending-change";
  readonly priority: 4;
  readonly change: SpendingChangeResult;
};

export type NetWorthChangeInsight = {
  readonly kind: "net-worth-change";
  readonly priority: 5;
  readonly change: NetWorthChangeResult;
};

export type AttentionInsight =
  | CardPaymentInsight
  | HighUtilizationInsight
  | SpendingChangeInsight
  | NetWorthChangeInsight;

function isMeaningfulChange(
  change: { direction: "increased" | "decreased" | "unchanged" } | null,
): change is { direction: "increased" | "decreased" } {
  return change !== null && change.direction !== "unchanged";
}

export function listAttentionInsights(
  accounts: Account[],
  cards: Card[],
  transactions: Transaction[],
): AttentionInsight[] {
  const insights: AttentionInsight[] = [];

  const payment = calculateCardPaymentAttention(cards);
  if (payment?.paymentStatus === "overdue") {
    insights.push({
      kind: "card-payment-overdue",
      priority: INSIGHT_PRIORITY["card-payment-overdue"],
      payment,
    });
  } else if (payment?.paymentStatus === "due") {
    insights.push({
      kind: "card-payment-due",
      priority: INSIGHT_PRIORITY["card-payment-due"],
      payment,
    });
  }

  const utilization = calculateHighCardUtilization(cards);
  if (utilization) {
    insights.push({
      kind: "high-card-utilization",
      priority: INSIGHT_PRIORITY["high-card-utilization"],
      utilization,
    });
  }

  const spending = calculateSpendingChange(transactions);
  if (isMeaningfulChange(spending)) {
    insights.push({
      kind: "spending-change",
      priority: INSIGHT_PRIORITY["spending-change"],
      change: spending,
    });
  }

  const netWorth = calculateNetWorthChange(accounts, cards, transactions);
  if (isMeaningfulChange(netWorth)) {
    insights.push({
      kind: "net-worth-change",
      priority: INSIGHT_PRIORITY["net-worth-change"],
      change: netWorth,
    });
  }

  return insights;
}

export function spendingChangeHeadline(
  direction: SpendingChangeResult["direction"],
): string {
  if (direction === "increased") {
    return "Spending increased";
  }
  if (direction === "decreased") {
    return "Spending decreased";
  }
  return "Spending unchanged";
}

export function netWorthChangeHeadline(
  direction: NetWorthChangeResult["direction"],
): string {
  if (direction === "increased") {
    return "Net worth increased";
  }
  if (direction === "decreased") {
    return "Net worth decreased";
  }
  return "Net worth unchanged";
}

export function netWorthChangeDirectionLabel(
  direction: NetWorthChangeResult["direction"],
): string {
  if (direction === "increased") {
    return "Increased";
  }
  if (direction === "decreased") {
    return "Decreased";
  }
  return "Unchanged";
}

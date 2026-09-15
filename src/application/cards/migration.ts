import type { Card, CardDraft } from "../../domain/types.ts";
import type { CardGateway } from "./contract.ts";

export const CARD_BACKEND_MIGRATED_KEY = "finora.card-backend-migrated.v1";

export type CardMigrationDecision = "skip" | "push-local";

export function cardsEquivalent(
  left: readonly Card[],
  right: readonly Card[],
): boolean {
  return stableCards(left) === stableCards(right);
}

export function decideCardMigration(input: {
  backend: readonly Card[];
  local: readonly Card[] | null;
  fixtures: readonly Card[];
}): CardMigrationDecision {
  if (input.local === null || input.local.length === 0) {
    return "skip";
  }

  if (cardsEquivalent(input.local, input.fixtures)) {
    return "skip";
  }

  if (cardsEquivalent(input.backend, input.fixtures)) {
    return "push-local";
  }

  return "skip";
}

export function draftFromCard(card: Card): CardDraft {
  return {
    name: card.name,
    issuer: card.issuer,
    creditLimit: card.creditLimit,
    outstandingBalance: card.outstandingBalance,
    statementPeriodEnd: card.statementPeriodEnd,
    paymentDueDate: card.paymentDueDate,
    minimumPayment: card.minimumPayment,
    paymentStatus: card.paymentStatus,
  };
}

export async function migrateLocalCards(
  gateway: CardGateway,
  input: {
    backend: readonly Card[];
    local: readonly Card[] | null;
    fixtures: readonly Card[];
  },
): Promise<Card[]> {
  if (decideCardMigration(input) !== "push-local" || input.local === null) {
    return [...input.backend];
  }

  const backendIds = new Set(input.backend.map((card) => card.id));

  for (const card of input.local) {
    const draft = draftFromCard(card);
    const result = backendIds.has(card.id)
      ? await gateway.update(card.id, draft)
      : await gateway.create(draft);
    if (!result.ok) {
      return gateway.list();
    }
  }

  return gateway.list();
}

function stableCards(cards: readonly Card[]): string {
  return JSON.stringify(
    [...cards]
      .map((card) => ({
        id: card.id,
        name: card.name,
        issuer: card.issuer,
        creditLimit: card.creditLimit,
        outstandingBalance: card.outstandingBalance,
        availableCredit: card.availableCredit,
        currency: card.currency,
        statementPeriodEnd: card.statementPeriodEnd,
        paymentDueDate: card.paymentDueDate,
        minimumPayment: card.minimumPayment,
        paymentStatus: card.paymentStatus,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

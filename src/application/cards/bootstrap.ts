import type { Card } from "../../domain/types.ts";

export const CARD_BOOTSTRAP_ELEMENT_ID = "finora-card-bootstrap";

export function serializeCardBootstrap(cards: readonly Card[]): string {
  return JSON.stringify({ cards }).replace(/</g, "\\u003c");
}

export function parseCardBootstrap(raw: string): Card[] | null {
  try {
    const parsed = JSON.parse(raw) as { cards?: unknown };
    if (!Array.isArray(parsed.cards)) {
      return null;
    }
    return parsed.cards as Card[];
  } catch {
    return null;
  }
}

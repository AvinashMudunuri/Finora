import type { Card, CardDraft } from "../../domain/types.ts";
import type { EntityMutationResult, FieldErrors } from "../../domain/validate.ts";

export type CardListResponse = {
  cards: Card[];
};

export type CardMutationResponse = {
  card: Card;
};

export type CardValidationFailure = {
  kind: "validation";
  errors: FieldErrors;
};

export type CardNotFoundFailure = {
  kind: "not_found";
  error: string;
};

export type CardUnavailableFailure = {
  kind: "unavailable";
  error: string;
};

export const CARD_UNAVAILABLE_MESSAGE = "Cards are temporarily unavailable.";

export const CARD_NOT_FOUND_MESSAGE = "That card no longer exists.";

export function usesCardBackend(
  mode: string = String(import.meta.env.MODE),
): boolean {
  return !mode.startsWith("e2e-") && mode !== "test";
}

export type CardGateway = {
  list(): Promise<Card[]>;
  create(draft: CardDraft): Promise<EntityMutationResult<Card>>;
  update(id: string, draft: CardDraft): Promise<EntityMutationResult<Card>>;
};

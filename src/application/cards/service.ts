import type { Account, Card, CardDraft, Transaction } from "../../domain/types.ts";
import {
  createCard,
  updateCard,
  type EntityMutationResult,
} from "../../domain/validate.ts";
import { CARD_NOT_FOUND_MESSAGE } from "./contract.ts";
import type { CardStore } from "./port.ts";

export type CardServiceDependencies = {
  store: CardStore;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
};

export function listCards(store: CardStore): Card[] {
  return store.list().map(cloneCard);
}

export function createStoredCard(
  dependencies: CardServiceDependencies,
  draft: CardDraft,
): EntityMutationResult<Card> {
  const existing = dependencies.store.list();
  const created = createCard(draft, existing);
  if (!created.ok) {
    return created;
  }

  if (existing.some((card) => card.id === created.value.id)) {
    return { ok: false, errors: { form: "Card identifier is already in use." } };
  }

  dependencies.store.write([...existing, created.value]);
  return created;
}

export function updateStoredCard(
  dependencies: CardServiceDependencies,
  id: string,
  draft: CardDraft,
): EntityMutationResult<Card> {
  const existing = dependencies.store.list();
  if (!existing.some((card) => card.id === id)) {
    return { ok: false, errors: { form: CARD_NOT_FOUND_MESSAGE } };
  }

  const updated = updateCard(
    id,
    draft,
    existing,
    dependencies.transactions,
    dependencies.accounts,
  );
  if (!updated.ok) {
    return updated;
  }

  if (updated.value.id !== id) {
    return { ok: false, errors: { form: "Card identifier cannot change." } };
  }

  dependencies.store.write(
    existing.map((card) => (card.id === id ? updated.value : card)),
  );
  return updated;
}

function cloneCard(card: Card): Card {
  return { ...card };
}

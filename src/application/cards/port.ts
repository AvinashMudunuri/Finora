import type { Card } from "../../domain/types.ts";

export type CardStore = {
  list(): Card[];
  write(cards: readonly Card[]): void;
};

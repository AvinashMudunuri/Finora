import { describe, expect, it } from "vitest";
import { fixtureCards } from "../../data/fixtures.ts";
import type { Card } from "../../domain/types.ts";
import type { CardGateway } from "./contract.ts";
import { decideCardMigration, migrateLocalCards } from "./migration.ts";

const extra: Card = {
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
};

describe("card local-storage migration", () => {
  it("skips when local cards are missing or still the fixture seed", () => {
    expect(
      decideCardMigration({
        backend: fixtureCards,
        local: null,
        fixtures: fixtureCards,
      }),
    ).toBe("skip");
    expect(
      decideCardMigration({
        backend: fixtureCards,
        local: fixtureCards,
        fixtures: fixtureCards,
      }),
    ).toBe("skip");
  });

  it("pushes local card edits only onto a fixture-seeded backend", () => {
    expect(
      decideCardMigration({
        backend: fixtureCards,
        local: [...fixtureCards, extra],
        fixtures: fixtureCards,
      }),
    ).toBe("push-local");
    expect(
      decideCardMigration({
        backend: [...fixtureCards, extra],
        local: [...fixtureCards, extra],
        fixtures: fixtureCards,
      }),
    ).toBe("skip");
  });

  it("creates local-only cards through the backend contract", async () => {
    const created: Card[] = [];
    const gateway: CardGateway = {
      list: async () => [...fixtureCards, ...created],
      create: async (draft) => {
        const card: Card = {
          id: "card-1",
          name: String(draft.name),
          issuer: String(draft.issuer),
          creditLimit: Number(draft.creditLimit),
          outstandingBalance: Number(draft.outstandingBalance),
          availableCredit: Number(draft.creditLimit) - Number(draft.outstandingBalance),
          currency: "USD",
          statementPeriodEnd: String(draft.statementPeriodEnd),
          paymentDueDate: String(draft.paymentDueDate),
          minimumPayment: Number(draft.minimumPayment),
          paymentStatus: "current",
        };
        created.push(card);
        return { ok: true, value: card };
      },
      update: async (id, draft) => ({
        ok: true,
        value: {
          id,
          name: String(draft.name),
          issuer: String(draft.issuer),
          creditLimit: Number(draft.creditLimit),
          outstandingBalance: Number(draft.outstandingBalance),
          availableCredit: Number(draft.creditLimit) - Number(draft.outstandingBalance),
          currency: "USD",
          statementPeriodEnd: String(draft.statementPeriodEnd),
          paymentDueDate: String(draft.paymentDueDate),
          minimumPayment: Number(draft.minimumPayment),
          paymentStatus: "current",
        },
      }),
    };

    const result = await migrateLocalCards(gateway, {
      backend: fixtureCards,
      local: [...fixtureCards, extra],
      fixtures: fixtureCards,
    });

    expect(result.map((card) => card.name)).toContain("Store Card");
    expect(created).toHaveLength(1);
  });
});

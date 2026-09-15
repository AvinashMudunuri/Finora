/** @vitest-environment node */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStoredCard,
  listCards,
  updateStoredCard,
} from "../src/application/cards/service.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import { CardStoreError, JsonFileCardStore } from "./jsonFileCardStore.ts";

function tempStorePath(): string {
  return join(mkdtempSync(join(tmpdir(), "finora-card-store-")), "cards.json");
}

const validDraft = {
  name: "Store Card",
  issuer: "Northlake Bank",
  creditLimit: 1000,
  outstandingBalance: 100,
  statementPeriodEnd: "2026-10-08",
  paymentDueDate: "2026-10-22",
  minimumPayment: 25,
  paymentStatus: "current",
};

describe("json file card store", () => {
  it("seeds fixture cards when the file is missing", () => {
    const path = tempStorePath();
    const store = new JsonFileCardStore(path);

    expect(store.list().map((card) => card.id)).toEqual(
      fixtureCards.map((card) => card.id),
    );
    expect(JSON.parse(readFileSync(path, "utf8")).version).toBe(1);
  });

  it("persists across store instances", () => {
    const path = tempStorePath();
    const first = new JsonFileCardStore(path);
    const created = createStoredCard(
      { store: first, accounts: fixtureAccounts, transactions: fixtureTransactions },
      validDraft,
    );
    expect(created.ok).toBe(true);

    const second = new JsonFileCardStore(path);
    expect(listCards(second).map((card) => card.name)).toContain("Store Card");
    expect(
      listCards(second).find((card) => card.name === "Store Card")?.availableCredit,
    ).toBe(900);
  });

  it("rejects duplicate identities on write", () => {
    const store = new JsonFileCardStore(tempStorePath());
    const cards = store.list();
    expect(() => {
      store.write([...cards, cards[0]!]);
    }).toThrow(CardStoreError);
  });

  it("rejects a corrupt file without exposing the path", () => {
    const path = tempStorePath();
    writeFileSync(path, "{not-json", "utf8");
    const store = new JsonFileCardStore(path);
    expect(() => store.list()).toThrow(CardStoreError);
    try {
      store.list();
    } catch (error) {
      expect(String(error)).not.toContain(path);
    }
  });

  it("keeps identity when a card is updated on disk", () => {
    const store = new JsonFileCardStore(tempStorePath());
    const updated = updateStoredCard(
      { store, accounts: fixtureAccounts, transactions: fixtureTransactions },
      "card-visa",
      {
        name: "Primary Visa",
        issuer: "Northlake Bank",
        creditLimit: 5000,
        outstandingBalance: 2000,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 35,
        paymentStatus: "due",
      },
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.value.id).toBe("card-visa");
    expect(updated.value.availableCredit).toBe(3000);
    expect(store.list().find((card) => card.id === "card-visa")?.outstandingBalance).toBe(
      2000,
    );
  });
});

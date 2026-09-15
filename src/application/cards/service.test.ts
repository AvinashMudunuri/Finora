import { describe, expect, it } from "vitest";
import { fixtureAccounts, fixtureTransactions } from "../../data/fixtures.ts";
import {
  calculateCardUtilization,
  calculateHighCardUtilization,
  calculateNetWorth,
} from "../../domain/calculations.ts";
import type { Card } from "../../domain/types.ts";
import { createStoredCard, listCards, updateStoredCard } from "./service.ts";
import type { CardStore } from "./port.ts";

function memoryStore(initial: Card[] = []): CardStore {
  let cards = initial.map((card) => ({ ...card }));
  return {
    list: () => cards.map((card) => ({ ...card })),
    write: (next) => {
      const ids = next.map((card) => card.id);
      if (new Set(ids).size !== ids.length) {
        throw new Error("Duplicate card id");
      }
      cards = next.map((card) => ({ ...card }));
    },
  };
}

const seed: Card[] = [
  {
    id: "card-visa",
    name: "Visa Rewards",
    issuer: "Northlake Bank",
    creditLimit: 5000,
    outstandingBalance: 1842.19,
    availableCredit: 3157.81,
    currency: "USD",
    statementPeriodEnd: "2026-09-08",
    paymentDueDate: "2026-09-22",
    minimumPayment: 35,
    paymentStatus: "due",
  },
  {
    id: "card-amex",
    name: "Amex Everyday",
    issuer: "American Express",
    creditLimit: 2500,
    outstandingBalance: 326.4,
    availableCredit: 2173.6,
    currency: "USD",
    statementPeriodEnd: "2026-09-05",
    paymentDueDate: "2026-09-18",
    minimumPayment: 25,
    paymentStatus: "current",
  },
];

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

describe("card application service", () => {
  it("lists stored cards without exposing the store array", () => {
    const store = memoryStore(seed);
    const listed = listCards(store);
    listed[0]!.name = "Mutated";
    expect(store.list()[0]?.name).toBe("Visa Rewards");
  });

  it("creates a valid card with derived available credit", () => {
    const store = memoryStore(seed);
    const created = createStoredCard(
      { store, accounts: fixtureAccounts, transactions: fixtureTransactions },
      validDraft,
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value.id).toBe("card-1");
    expect(created.value.currency).toBe("USD");
    expect(created.value.availableCredit).toBe(900);
    expect(listCards(store).map((card) => card.name)).toContain("Store Card");
  });

  it("rejects an invalid create before writing", () => {
    const store = memoryStore(seed);
    const created = createStoredCard(
      { store, accounts: fixtureAccounts, transactions: fixtureTransactions },
      { ...validDraft, name: "   " },
    );

    expect(created).toEqual({
      ok: false,
      errors: { name: "Card name is required." },
    });
    expect(listCards(store)).toHaveLength(seed.length);
  });

  it("rejects outstanding above the credit limit", () => {
    const created = createStoredCard(
      {
        store: memoryStore(seed),
        accounts: fixtureAccounts,
        transactions: fixtureTransactions,
      },
      { ...validDraft, creditLimit: 100, outstandingBalance: 150 },
    );

    expect(created).toEqual({
      ok: false,
      errors: {
        outstandingBalance: "Outstanding balance cannot exceed the credit limit.",
      },
    });
  });

  it("rejects a non-domain payment status", () => {
    const created = createStoredCard(
      {
        store: memoryStore(seed),
        accounts: fixtureAccounts,
        transactions: fixtureTransactions,
      },
      { ...validDraft, paymentStatus: "late" },
    );

    expect(created).toEqual({
      ok: false,
      errors: { paymentStatus: "Payment status must be Current, Due, or Overdue." },
    });
  });

  it("updates a card while preserving identity and transaction links", () => {
    const store = memoryStore(seed);
    const updated = updateStoredCard(
      { store, accounts: fixtureAccounts, transactions: fixtureTransactions },
      "card-visa",
      {
        name: "Primary Visa",
        issuer: "Northlake Bank",
        creditLimit: 5000,
        outstandingBalance: 1842.19,
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
    expect(listCards(store).find((card) => card.id === "card-visa")?.name).toBe(
      "Primary Visa",
    );
    expect(
      fixtureTransactions.some((transaction) => transaction.cardId === "card-visa"),
    ).toBe(true);
  });

  it("rejects an unknown card update", () => {
    const updated = updateStoredCard(
      {
        store: memoryStore(seed),
        accounts: fixtureAccounts,
        transactions: fixtureTransactions,
      },
      "card-missing",
      validDraft,
    );

    expect(updated).toEqual({
      ok: false,
      errors: { form: "That card no longer exists." },
    });
  });

  it("keeps net worth and utilization on the existing calculation path", () => {
    const store = memoryStore(seed);
    const before = calculateNetWorth(fixtureAccounts, listCards(store));
    const updated = updateStoredCard(
      { store, accounts: fixtureAccounts, transactions: fixtureTransactions },
      "card-visa",
      {
        name: "Visa Rewards",
        issuer: "Northlake Bank",
        creditLimit: 2500,
        outstandingBalance: 1842.19,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 35,
        paymentStatus: "due",
      },
    );

    expect(updated.ok).toBe(true);
    const afterCards = listCards(store);
    const after = calculateNetWorth(fixtureAccounts, afterCards);
    expect(after.liabilities).toBeCloseTo(before.liabilities, 2);
    expect(after.netWorth).toBeCloseTo(before.netWorth, 2);
    expect(calculateHighCardUtilization(afterCards)?.cardId).toBe("card-visa");
    expect(calculateCardUtilization(afterCards)[0]?.utilization).toBeCloseTo(
      1842.19 / 2500,
      5,
    );
  });

  it("rejects writing duplicate identities through the store", () => {
    const store = memoryStore(seed);
    expect(() => {
      store.write([...seed, seed[0]!]);
    }).toThrow(/duplicate/i);
  });
});

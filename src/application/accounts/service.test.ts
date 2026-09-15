import { describe, expect, it } from "vitest";
import { fixtureCards, fixtureTransactions } from "../../data/fixtures.ts";
import type { Account } from "../../domain/types.ts";
import {
  createStoredAccount,
  listAccounts,
  updateStoredAccount,
} from "./service.ts";
import type { AccountStore } from "./port.ts";

function memoryStore(initial: Account[] = []): AccountStore {
  let accounts = initial.map((account) => ({ ...account }));
  return {
    list: () => accounts.map((account) => ({ ...account })),
    write: (next) => {
      const ids = next.map((account) => account.id);
      if (new Set(ids).size !== ids.length) {
        throw new Error("Duplicate account id");
      }
      accounts = next.map((account) => ({ ...account }));
    },
  };
}

const seed: Account[] = [
  {
    id: "acc-checking",
    name: "Everyday Checking",
    type: "bank",
    balance: 4286.47,
    currency: "USD",
  },
  {
    id: "acc-savings",
    name: "Emergency Savings",
    type: "bank",
    balance: 12450,
    currency: "USD",
  },
  {
    id: "acc-cash",
    name: "Cash",
    type: "cash",
    balance: 180,
    currency: "USD",
  },
  {
    id: "acc-investment",
    name: "Investment Account",
    type: "investment",
    balance: 8420.55,
    currency: "USD",
  },
];

describe("account application service", () => {
  it("lists stored accounts without exposing the store array", () => {
    const store = memoryStore(seed);
    const listed = listAccounts(store);
    listed[0]!.name = "Mutated";
    expect(store.list()[0]?.name).toBe("Everyday Checking");
  });

  it("creates a valid account and persists it", () => {
    const store = memoryStore(seed);
    const created = createStoredAccount(
      { store, cards: fixtureCards, transactions: fixtureTransactions },
      { name: "Travel Fund", type: "bank", balance: 500 },
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value.id).toBe("acc-1");
    expect(created.value.currency).toBe("USD");
    expect(listAccounts(store).map((account) => account.name)).toContain(
      "Travel Fund",
    );
  });

  it("rejects an invalid create before writing", () => {
    const store = memoryStore(seed);
    const created = createStoredAccount(
      { store, cards: fixtureCards, transactions: fixtureTransactions },
      { name: "   ", type: "bank", balance: 500 },
    );

    expect(created).toEqual({
      ok: false,
      errors: { name: "Account name is required." },
    });
    expect(listAccounts(store)).toHaveLength(seed.length);
  });

  it("rejects a non-domain account type", () => {
    const created = createStoredAccount(
      {
        store: memoryStore(seed),
        cards: fixtureCards,
        transactions: fixtureTransactions,
      },
      { name: "Secret", type: "credit", balance: 10 },
    );

    expect(created).toEqual({
      ok: false,
      errors: { type: "Account type must be Bank, Cash, or Investment." },
    });
  });

  it("rejects a non-finite balance", () => {
    const created = createStoredAccount(
      {
        store: memoryStore(seed),
        cards: fixtureCards,
        transactions: fixtureTransactions,
      },
      { name: "Broken", type: "bank", balance: Number.POSITIVE_INFINITY },
    );

    expect(created.ok).toBe(false);
    if (created.ok) {
      return;
    }
    expect(created.errors.balance).toMatch(/finite|number|balance/i);
  });

  it("updates an account while preserving identity", () => {
    const store = memoryStore(seed);
    const updated = updateStoredAccount(
      { store, cards: fixtureCards, transactions: fixtureTransactions },
      "acc-checking",
      { name: "Primary Checking", type: "bank", balance: 4286.47 },
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.value.id).toBe("acc-checking");
    expect(listAccounts(store).find((account) => account.id === "acc-checking")?.name).toBe(
      "Primary Checking",
    );
  });

  it("rejects an unknown account update", () => {
    const updated = updateStoredAccount(
      {
        store: memoryStore(seed),
        cards: fixtureCards,
        transactions: fixtureTransactions,
      },
      "acc-missing",
      { name: "Ghost", type: "bank", balance: 1 },
    );

    expect(updated).toEqual({
      ok: false,
      errors: { form: "That account no longer exists." },
    });
  });

  it("rejects an update that would break transaction relationships", () => {
    const updated = updateStoredAccount(
      {
        store: memoryStore(seed),
        cards: fixtureCards,
        transactions: fixtureTransactions,
      },
      "acc-investment",
      { name: "Investment Account", type: "bank", balance: 8420.55 },
    );

    expect(updated.ok).toBe(false);
    if (updated.ok) {
      return;
    }
    expect(updated.errors.type ?? updated.errors.form).toMatch(/investment/i);
  });

  it("rejects writing duplicate identities through the store", () => {
    const store = memoryStore(seed);
    expect(() => {
      store.write([...seed, seed[0]!]);
    }).toThrow(/duplicate/i);
  });
});

/** @vitest-environment node */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStoredAccount,
  listAccounts,
  updateStoredAccount,
} from "../src/application/accounts/service.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import { AccountStoreError, JsonFileAccountStore } from "./jsonFileAccountStore.ts";

function tempStorePath(): string {
  return join(mkdtempSync(join(tmpdir(), "finora-store-")), "accounts.json");
}

describe("json file account store", () => {
  it("seeds fixture accounts when the file is missing", () => {
    const path = tempStorePath();
    const store = new JsonFileAccountStore(path);

    expect(store.list().map((account) => account.id)).toEqual(
      fixtureAccounts.map((account) => account.id),
    );
    expect(JSON.parse(readFileSync(path, "utf8")).version).toBe(1);
  });

  it("persists across store instances", () => {
    const path = tempStorePath();
    const first = new JsonFileAccountStore(path);
    const created = createStoredAccount(
      { store: first, cards: fixtureCards, transactions: fixtureTransactions },
      { name: "Travel Fund", type: "bank", balance: 500 },
    );
    expect(created.ok).toBe(true);

    const second = new JsonFileAccountStore(path);
    expect(listAccounts(second).map((account) => account.name)).toContain("Travel Fund");
  });

  it("rejects duplicate identities on write", () => {
    const store = new JsonFileAccountStore(tempStorePath());
    const accounts = store.list();
    expect(() => {
      store.write([...accounts, accounts[0]!]);
    }).toThrow(AccountStoreError);
  });

  it("rejects a corrupt file without exposing the path", () => {
    const path = tempStorePath();
    writeFileSync(path, "{not-json", "utf8");
    const store = new JsonFileAccountStore(path);
    expect(() => store.list()).toThrow(AccountStoreError);
    try {
      store.list();
    } catch (error) {
      expect(String(error)).not.toContain(path);
    }
  });

  it("keeps identity when an account is updated on disk", () => {
    const store = new JsonFileAccountStore(tempStorePath());
    const updated = updateStoredAccount(
      { store, cards: fixtureCards, transactions: fixtureTransactions },
      "acc-checking",
      { name: "Primary Checking", type: "bank", balance: 100 },
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.value.id).toBe("acc-checking");
    expect(store.list().find((account) => account.id === "acc-checking")?.balance).toBe(100);
  });
});

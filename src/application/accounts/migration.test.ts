import { describe, expect, it } from "vitest";
import { fixtureAccounts } from "../../data/fixtures.ts";
import type { Account } from "../../domain/types.ts";
import type { AccountGateway } from "./contract.ts";
import {
  decideAccountMigration,
  migrateLocalAccounts,
} from "./migration.ts";

const extra: Account = {
  id: "acc-1",
  name: "Travel Fund",
  type: "bank",
  balance: 500,
  currency: "USD",
};

describe("account local-storage migration", () => {
  it("skips when local accounts are missing or still the fixture seed", () => {
    expect(
      decideAccountMigration({
        backend: fixtureAccounts,
        local: null,
        fixtures: fixtureAccounts,
      }),
    ).toBe("skip");
    expect(
      decideAccountMigration({
        backend: fixtureAccounts,
        local: fixtureAccounts,
        fixtures: fixtureAccounts,
      }),
    ).toBe("skip");
  });

  it("pushes local account edits only onto a fixture-seeded backend", () => {
    expect(
      decideAccountMigration({
        backend: fixtureAccounts,
        local: [...fixtureAccounts, extra],
        fixtures: fixtureAccounts,
      }),
    ).toBe("push-local");
    expect(
      decideAccountMigration({
        backend: [...fixtureAccounts, extra],
        local: [...fixtureAccounts, extra],
        fixtures: fixtureAccounts,
      }),
    ).toBe("skip");
  });

  it("creates local-only accounts through the backend contract", async () => {
    const created: Account[] = [];
    const gateway: AccountGateway = {
      list: async () => [...fixtureAccounts, ...created],
      create: async (draft) => {
        const account: Account = {
          id: "acc-1",
          name: String(draft.name),
          type: "bank",
          balance: Number(draft.balance),
          currency: "USD",
        };
        created.push(account);
        return { ok: true, value: account };
      },
      update: async (id, draft) => ({
        ok: true,
        value: {
          id,
          name: String(draft.name),
          type: "bank",
          balance: Number(draft.balance),
          currency: "USD",
        },
      }),
    };

    const result = await migrateLocalAccounts(gateway, {
      backend: fixtureAccounts,
      local: [...fixtureAccounts, extra],
      fixtures: fixtureAccounts,
    });

    expect(result.map((account) => account.name)).toContain("Travel Fund");
    expect(created).toHaveLength(1);
  });
});

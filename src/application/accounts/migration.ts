import type { Account, AccountDraft } from "../../domain/types.ts";
import type { AccountGateway } from "./contract.ts";

export const ACCOUNT_BACKEND_MIGRATED_KEY = "finora.account-backend-migrated.v1";

export type AccountMigrationDecision = "skip" | "push-local";

export function accountsEquivalent(
  left: readonly Account[],
  right: readonly Account[],
): boolean {
  return stableAccounts(left) === stableAccounts(right);
}

export function decideAccountMigration(input: {
  backend: readonly Account[];
  local: readonly Account[] | null;
  fixtures: readonly Account[];
}): AccountMigrationDecision {
  if (input.local === null || input.local.length === 0) {
    return "skip";
  }

  if (accountsEquivalent(input.local, input.fixtures)) {
    return "skip";
  }

  if (accountsEquivalent(input.backend, input.fixtures)) {
    return "push-local";
  }

  return "skip";
}

export function draftFromAccount(account: Account): AccountDraft {
  return {
    name: account.name,
    type: account.type,
    balance: account.balance,
  };
}

export async function migrateLocalAccounts(
  gateway: AccountGateway,
  input: {
    backend: readonly Account[];
    local: readonly Account[] | null;
    fixtures: readonly Account[];
  },
): Promise<Account[]> {
  if (decideAccountMigration(input) !== "push-local" || input.local === null) {
    return [...input.backend];
  }

  const backendIds = new Set(input.backend.map((account) => account.id));

  for (const account of input.local) {
    const draft = draftFromAccount(account);
    const result = backendIds.has(account.id)
      ? await gateway.update(account.id, draft)
      : await gateway.create(draft);
    if (!result.ok) {
      return gateway.list();
    }
  }

  return gateway.list();
}

function stableAccounts(accounts: readonly Account[]): string {
  return JSON.stringify(
    [...accounts]
      .map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

import type { Account, AccountDraft, Card, Transaction } from "../../domain/types.ts";
import {
  createAccount,
  updateAccount,
  type EntityMutationResult,
} from "../../domain/validate.ts";
import { ACCOUNT_NOT_FOUND_MESSAGE } from "./contract.ts";
import type { AccountStore } from "./port.ts";

export type AccountServiceDependencies = {
  store: AccountStore;
  cards: readonly Card[];
  transactions: readonly Transaction[];
};

export function listAccounts(store: AccountStore): Account[] {
  return store.list().map(cloneAccount);
}

export function createStoredAccount(
  dependencies: AccountServiceDependencies,
  draft: AccountDraft,
): EntityMutationResult<Account> {
  const existing = dependencies.store.list();
  const created = createAccount(draft, existing);
  if (!created.ok) {
    return created;
  }

  if (existing.some((account) => account.id === created.value.id)) {
    return { ok: false, errors: { form: "Account identifier is already in use." } };
  }

  dependencies.store.write([...existing, created.value]);
  return created;
}

export function updateStoredAccount(
  dependencies: AccountServiceDependencies,
  id: string,
  draft: AccountDraft,
): EntityMutationResult<Account> {
  const existing = dependencies.store.list();
  if (!existing.some((account) => account.id === id)) {
    return { ok: false, errors: { form: ACCOUNT_NOT_FOUND_MESSAGE } };
  }

  const updated = updateAccount(
    id,
    draft,
    existing,
    dependencies.transactions,
    dependencies.cards,
  );
  if (!updated.ok) {
    return updated;
  }

  if (updated.value.id !== id) {
    return { ok: false, errors: { form: "Account identifier cannot change." } };
  }

  dependencies.store.write(
    existing.map((account) => (account.id === id ? updated.value : account)),
  );
  return updated;
}

function cloneAccount(account: Account): Account {
  return { ...account };
}

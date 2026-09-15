import type { Account, AccountDraft } from "../../domain/types.ts";
import type { EntityMutationResult, FieldErrors } from "../../domain/validate.ts";

export type AccountListResponse = {
  accounts: Account[];
};

export type AccountMutationResponse = {
  account: Account;
};

export type AccountValidationFailure = {
  kind: "validation";
  errors: FieldErrors;
};

export type AccountNotFoundFailure = {
  kind: "not_found";
  error: string;
};

export type AccountUnavailableFailure = {
  kind: "unavailable";
  error: string;
};

export const ACCOUNT_UNAVAILABLE_MESSAGE =
  "Accounts are temporarily unavailable.";

export const ACCOUNT_NOT_FOUND_MESSAGE = "That account no longer exists.";

export function usesAccountBackend(
  mode: string = String(import.meta.env.MODE),
): boolean {
  return !mode.startsWith("e2e-") && mode !== "test";
}

export type AccountGateway = {
  list(): Promise<Account[]>;
  create(draft: AccountDraft): Promise<EntityMutationResult<Account>>;
  update(
    id: string,
    draft: AccountDraft,
  ): Promise<EntityMutationResult<Account>>;
};

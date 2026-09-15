import type { AccountGateway } from "../../application/accounts/contract.ts";
import {
  ACCOUNT_UNAVAILABLE_MESSAGE,
  type AccountListResponse,
  type AccountMutationResponse,
  type AccountValidationFailure,
} from "../../application/accounts/contract.ts";
import type { Account, AccountDraft } from "../../domain/types.ts";
import type { EntityMutationResult } from "../../domain/validate.ts";

export function createHttpAccountGateway(baseUrl = ""): AccountGateway {
  const prefix = baseUrl.replace(/\/$/, "");

  return {
    async list(): Promise<Account[]> {
      const response = await request(prefix, "/api/accounts");
      const body = (await readJson(response)) as AccountListResponse | null;
      if (response.ok && body && Array.isArray(body.accounts)) {
        return body.accounts;
      }
      throw new Error(ACCOUNT_UNAVAILABLE_MESSAGE);
    },

    async create(draft: AccountDraft): Promise<EntityMutationResult<Account>> {
      return mutate(prefix, "/api/accounts", "POST", draft);
    },

    async update(
      id: string,
      draft: AccountDraft,
    ): Promise<EntityMutationResult<Account>> {
      return mutate(prefix, `/api/accounts/${encodeURIComponent(id)}`, "PUT", draft);
    },
  };
}

async function mutate(
  prefix: string,
  path: string,
  method: "POST" | "PUT",
  draft: AccountDraft,
): Promise<EntityMutationResult<Account>> {
  try {
    const response = await request(prefix, path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: draft.name,
        type: draft.type,
        balance: draft.balance,
      }),
    });
    const body = await readJson(response);
    if (response.ok) {
      const payload = body as AccountMutationResponse | null;
      if (payload && isAccount(payload.account)) {
        return { ok: true, value: payload.account };
      }
      return { ok: false, errors: { form: ACCOUNT_UNAVAILABLE_MESSAGE } };
    }

    if (response.status === 400) {
      const failure = body as AccountValidationFailure | null;
      if (failure?.kind === "validation" && failure.errors) {
        return { ok: false, errors: failure.errors };
      }
    }

    if (response.status === 404) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String((body as { error?: unknown }).error ?? "")
          : "";
      return {
        ok: false,
        errors: {
          form: message.trim().length > 0 ? message : "That account no longer exists.",
        },
      };
    }

    return { ok: false, errors: { form: ACCOUNT_UNAVAILABLE_MESSAGE } };
  } catch {
    return { ok: false, errors: { form: ACCOUNT_UNAVAILABLE_MESSAGE } };
  }
}

async function request(
  prefix: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${prefix}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAccount(value: unknown): value is Account {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const account = value as Account;
  return (
    typeof account.id === "string" &&
    typeof account.name === "string" &&
    typeof account.type === "string" &&
    typeof account.balance === "number" &&
    account.currency === "USD"
  );
}

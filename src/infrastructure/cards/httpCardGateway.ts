import type { CardGateway } from "../../application/cards/contract.ts";
import {
  CARD_UNAVAILABLE_MESSAGE,
  type CardListResponse,
  type CardMutationResponse,
  type CardValidationFailure,
} from "../../application/cards/contract.ts";
import type { Card, CardDraft } from "../../domain/types.ts";
import { CARD_PAYMENT_STATUSES } from "../../domain/types.ts";
import type { EntityMutationResult } from "../../domain/validate.ts";

export function createHttpCardGateway(baseUrl = ""): CardGateway {
  const prefix = baseUrl.replace(/\/$/, "");

  return {
    async list(): Promise<Card[]> {
      const response = await request(prefix, "/api/cards");
      const body = (await readJson(response)) as CardListResponse | null;
      if (response.ok && body && Array.isArray(body.cards)) {
        return body.cards;
      }
      throw new Error(CARD_UNAVAILABLE_MESSAGE);
    },

    async create(draft: CardDraft): Promise<EntityMutationResult<Card>> {
      return mutate(prefix, "/api/cards", "POST", draft);
    },

    async update(
      id: string,
      draft: CardDraft,
    ): Promise<EntityMutationResult<Card>> {
      return mutate(prefix, `/api/cards/${encodeURIComponent(id)}`, "PUT", draft);
    },
  };
}

async function mutate(
  prefix: string,
  path: string,
  method: "POST" | "PUT",
  draft: CardDraft,
): Promise<EntityMutationResult<Card>> {
  try {
    const response = await request(prefix, path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: draft.name,
        issuer: draft.issuer,
        creditLimit: draft.creditLimit,
        outstandingBalance: draft.outstandingBalance,
        statementPeriodEnd: draft.statementPeriodEnd,
        paymentDueDate: draft.paymentDueDate,
        minimumPayment: draft.minimumPayment,
        paymentStatus: draft.paymentStatus,
      }),
    });
    const body = await readJson(response);
    if (response.ok) {
      const payload = body as CardMutationResponse | null;
      if (payload && isCard(payload.card)) {
        return { ok: true, value: payload.card };
      }
      return { ok: false, errors: { form: CARD_UNAVAILABLE_MESSAGE } };
    }

    if (response.status === 400) {
      const failure = body as CardValidationFailure | null;
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
          form: message.trim().length > 0 ? message : "That card no longer exists.",
        },
      };
    }

    return { ok: false, errors: { form: CARD_UNAVAILABLE_MESSAGE } };
  } catch {
    return { ok: false, errors: { form: CARD_UNAVAILABLE_MESSAGE } };
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

function isCard(value: unknown): value is Card {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const card = value as Card;
  return (
    typeof card.id === "string" &&
    typeof card.name === "string" &&
    typeof card.issuer === "string" &&
    typeof card.creditLimit === "number" &&
    typeof card.outstandingBalance === "number" &&
    typeof card.availableCredit === "number" &&
    card.currency === "USD" &&
    typeof card.statementPeriodEnd === "string" &&
    typeof card.paymentDueDate === "string" &&
    typeof card.minimumPayment === "number" &&
    CARD_PAYMENT_STATUSES.includes(card.paymentStatus)
  );
}

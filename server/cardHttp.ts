import type { IncomingMessage, ServerResponse } from "node:http";

import {
  CARD_NOT_FOUND_MESSAGE,
  CARD_UNAVAILABLE_MESSAGE,
} from "../src/application/cards/contract.ts";
import {
  CARD_BOOTSTRAP_ELEMENT_ID,
  serializeCardBootstrap,
} from "../src/application/cards/bootstrap.ts";
import {
  createStoredCard,
  listCards,
  updateStoredCard,
  type CardServiceDependencies,
} from "../src/application/cards/service.ts";
import type { Card, CardDraft } from "../src/domain/types.ts";
import { CardStoreError } from "./jsonFileCardStore.ts";

const MAX_BODY_BYTES = 64 * 1024;
const CARD_COLLECTION = /^\/api\/cards\/?$/;
const CARD_ITEM = /^\/api\/cards\/([^/]+)\/?$/;

export async function handleCardHttp(
  dependencies: CardServiceDependencies,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  const method = (request.method ?? "GET").toUpperCase();

  if (!pathname.startsWith("/api/cards")) {
    return false;
  }

  try {
    if (method === "GET" && CARD_COLLECTION.test(pathname)) {
      writeJson(response, 200, { cards: listCards(dependencies.store) });
      return true;
    }

    if (method === "POST" && CARD_COLLECTION.test(pathname)) {
      const draft = await readDraft(request);
      if (!draft.ok) {
        writeJson(response, 400, { kind: "validation", errors: draft.errors });
        return true;
      }
      const created = createStoredCard(dependencies, draft.value);
      if (!created.ok) {
        writeJson(response, 400, { kind: "validation", errors: created.errors });
        return true;
      }
      writeJson(response, 200, { card: created.value });
      return true;
    }

    const item = pathname.match(CARD_ITEM);
    if (method === "PUT" && item?.[1]) {
      const id = decodeURIComponent(item[1]);
      const draft = await readDraft(request);
      if (!draft.ok) {
        writeJson(response, 400, { kind: "validation", errors: draft.errors });
        return true;
      }
      const updated = updateStoredCard(dependencies, id, draft.value);
      if (!updated.ok) {
        const notFound = updated.errors.form === CARD_NOT_FOUND_MESSAGE;
        writeJson(
          response,
          notFound ? 404 : 400,
          notFound
            ? { kind: "not_found", error: CARD_NOT_FOUND_MESSAGE }
            : { kind: "validation", errors: updated.errors },
        );
        return true;
      }
      writeJson(response, 200, { card: updated.value });
      return true;
    }

    writeJson(response, 404, { kind: "not_found", error: "Unknown card operation." });
    return true;
  } catch (error) {
    if (error instanceof CardStoreError) {
      writeJson(response, 500, {
        kind: "unavailable",
        error: CARD_UNAVAILABLE_MESSAGE,
      });
      return true;
    }
    writeJson(response, 500, {
      kind: "unavailable",
      error: CARD_UNAVAILABLE_MESSAGE,
    });
    return true;
  }
}

export function injectCardBootstrap(
  html: string,
  cards: readonly Card[],
): string {
  const payload = serializeCardBootstrap(cards);
  const tag = `<script type="application/json" id="${CARD_BOOTSTRAP_ELEMENT_ID}">${payload}</script>`;
  if (html.includes(`id="${CARD_BOOTSTRAP_ELEMENT_ID}"`)) {
    return html.replace(
      new RegExp(
        `<script type="application/json" id="${CARD_BOOTSTRAP_ELEMENT_ID}">[\\s\\S]*?</script>`,
      ),
      tag,
    );
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${tag}\n  </head>`);
  }
  return `${tag}\n${html}`;
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(payload);
}

function readDraft(
  request: IncomingMessage,
): Promise<{ ok: true; value: CardDraft } | { ok: false; errors: { form: string } }> {
  return readBody(request).then((raw) => {
    if (raw === INVALID_JSON) {
      return { ok: false, errors: { form: "Request is not valid JSON." } };
    }

    if (raw === undefined || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, errors: { form: "Card details are required." } };
    }

    const record = raw as Record<string, unknown>;
    return {
      ok: true,
      value: {
        name: String(record.name ?? ""),
        issuer: String(record.issuer ?? ""),
        creditLimit: record.creditLimit as string | number,
        outstandingBalance: record.outstandingBalance as string | number,
        statementPeriodEnd: String(record.statementPeriodEnd ?? ""),
        paymentDueDate: String(record.paymentDueDate ?? ""),
        minimumPayment: record.minimumPayment as string | number,
        paymentStatus: String(record.paymentStatus ?? ""),
      },
    };
  });
}

const INVALID_JSON = Symbol("invalid-json");

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      return INVALID_JSON;
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return INVALID_JSON;
  }
}

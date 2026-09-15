import type { IncomingMessage, ServerResponse } from "node:http";

import {
  ACCOUNT_NOT_FOUND_MESSAGE,
  ACCOUNT_UNAVAILABLE_MESSAGE,
} from "../src/application/accounts/contract.ts";
import {
  ACCOUNT_BOOTSTRAP_ELEMENT_ID,
  serializeAccountBootstrap,
} from "../src/application/accounts/bootstrap.ts";
import {
  createStoredAccount,
  listAccounts,
  updateStoredAccount,
  type AccountServiceDependencies,
} from "../src/application/accounts/service.ts";
import type { Account, AccountDraft } from "../src/domain/types.ts";
import { AccountStoreError } from "./jsonFileAccountStore.ts";

const MAX_BODY_BYTES = 64 * 1024;
const ACCOUNT_COLLECTION = /^\/api\/accounts\/?$/;
const ACCOUNT_ITEM = /^\/api\/accounts\/([^/]+)\/?$/;

export async function handleAccountHttp(
  dependencies: AccountServiceDependencies,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  const method = (request.method ?? "GET").toUpperCase();

  if (!pathname.startsWith("/api/accounts")) {
    return false;
  }

  try {
    if (method === "GET" && ACCOUNT_COLLECTION.test(pathname)) {
      writeJson(response, 200, { accounts: listAccounts(dependencies.store) });
      return true;
    }

    if (method === "POST" && ACCOUNT_COLLECTION.test(pathname)) {
      const draft = await readDraft(request);
      if (!draft.ok) {
        writeJson(response, 400, { kind: "validation", errors: draft.errors });
        return true;
      }
      const created = createStoredAccount(dependencies, draft.value);
      if (!created.ok) {
        writeJson(response, 400, { kind: "validation", errors: created.errors });
        return true;
      }
      writeJson(response, 200, { account: created.value });
      return true;
    }

    const item = pathname.match(ACCOUNT_ITEM);
    if (method === "PUT" && item?.[1]) {
      const id = decodeURIComponent(item[1]);
      const draft = await readDraft(request);
      if (!draft.ok) {
        writeJson(response, 400, { kind: "validation", errors: draft.errors });
        return true;
      }
      const updated = updateStoredAccount(dependencies, id, draft.value);
      if (!updated.ok) {
        const notFound = updated.errors.form === ACCOUNT_NOT_FOUND_MESSAGE;
        writeJson(
          response,
          notFound ? 404 : 400,
          notFound
            ? { kind: "not_found", error: ACCOUNT_NOT_FOUND_MESSAGE }
            : { kind: "validation", errors: updated.errors },
        );
        return true;
      }
      writeJson(response, 200, { account: updated.value });
      return true;
    }

    writeJson(response, 404, { kind: "not_found", error: "Unknown account operation." });
    return true;
  } catch (error) {
    if (error instanceof AccountStoreError) {
      writeJson(response, 500, {
        kind: "unavailable",
        error: ACCOUNT_UNAVAILABLE_MESSAGE,
      });
      return true;
    }
    writeJson(response, 500, {
      kind: "unavailable",
      error: ACCOUNT_UNAVAILABLE_MESSAGE,
    });
    return true;
  }
}

export function injectAccountBootstrap(
  html: string,
  accounts: readonly Account[],
): string {
  const payload = serializeAccountBootstrap(accounts);
  const tag = `<script type="application/json" id="${ACCOUNT_BOOTSTRAP_ELEMENT_ID}">${payload}</script>`;
  if (html.includes(`id="${ACCOUNT_BOOTSTRAP_ELEMENT_ID}"`)) {
    return html.replace(
      new RegExp(
        `<script type="application/json" id="${ACCOUNT_BOOTSTRAP_ELEMENT_ID}">[\\s\\S]*?</script>`,
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

async function readDraft(
  request: IncomingMessage,
): Promise<{ ok: true; value: AccountDraft } | { ok: false; errors: { form: string } }> {
  const raw = await readBody(request);
  if (raw === INVALID_JSON) {
    return { ok: false, errors: { form: "Request is not valid JSON." } };
  }

  if (raw === undefined || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: { form: "Account details are required." } };
  }

  const record = raw as Record<string, unknown>;
  return {
    ok: true,
    value: {
      name: String(record.name ?? ""),
      type: String(record.type ?? ""),
      balance: record.balance as string | number,
    },
  };
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

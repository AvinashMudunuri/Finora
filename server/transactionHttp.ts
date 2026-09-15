import type { IncomingMessage, ServerResponse } from "node:http";

import {
  TRANSACTION_BOOTSTRAP_ELEMENT_ID,
  serializeTransactionBootstrap,
} from "../src/application/transactions/bootstrap.ts";
import {
  TRANSACTION_UNAVAILABLE_MESSAGE,
} from "../src/application/transactions/contract.ts";
import {
  listStoredTransactions,
  type TransactionServiceDependencies,
} from "../src/application/transactions/service.ts";
import type { Transaction } from "../src/domain/types.ts";
import { TransactionStoreError } from "./jsonFileTransactionStore.ts";

const TRANSACTION_COLLECTION = /^\/api\/transactions\/?$/;

export async function handleTransactionHttp(
  dependencies: TransactionServiceDependencies,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  const method = (request.method ?? "GET").toUpperCase();

  if (!pathname.startsWith("/api/transactions")) {
    return false;
  }

  try {
    if (method === "GET" && TRANSACTION_COLLECTION.test(pathname)) {
      writeJson(response, 200, {
        transactions: listStoredTransactions(dependencies.store),
      });
      return true;
    }

    writeJson(response, 404, {
      kind: "not_found",
      error: "Unknown transaction operation.",
    });
    return true;
  } catch (error) {
    if (error instanceof TransactionStoreError) {
      writeJson(response, 500, {
        kind: "unavailable",
        error: TRANSACTION_UNAVAILABLE_MESSAGE,
      });
      return true;
    }
    writeJson(response, 500, {
      kind: "unavailable",
      error: TRANSACTION_UNAVAILABLE_MESSAGE,
    });
    return true;
  }
}

export function injectTransactionBootstrap(
  html: string,
  transactions: readonly Transaction[],
): string {
  const payload = serializeTransactionBootstrap(transactions);
  const tag = `<script type="application/json" id="${TRANSACTION_BOOTSTRAP_ELEMENT_ID}">${payload}</script>`;
  if (html.includes(`id="${TRANSACTION_BOOTSTRAP_ELEMENT_ID}"`)) {
    return html.replace(
      new RegExp(
        `<script type="application/json" id="${TRANSACTION_BOOTSTRAP_ELEMENT_ID}">[\\s\\S]*?</script>`,
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

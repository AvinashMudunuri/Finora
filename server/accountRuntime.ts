import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";

import { fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import type { AccountServiceDependencies } from "../src/application/accounts/service.ts";
import { listAccounts } from "../src/application/accounts/service.ts";
import { handleAccountHttp, injectAccountBootstrap } from "./accountHttp.ts";
import { JsonFileAccountStore } from "./jsonFileAccountStore.ts";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

export function createAccountDependencies(storePath: string): AccountServiceDependencies {
  return {
    store: new JsonFileAccountStore(storePath),
    cards: fixtureCards,
    transactions: fixtureTransactions,
  };
}

export function createAccountRequestListener(options: {
  dependencies: AccountServiceDependencies;
  staticDir?: string;
}): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    void (async () => {
      const handled = await handleAccountHttp(options.dependencies, request, response);
      if (handled || response.writableEnded) {
        return;
      }

      if (options.staticDir === undefined) {
        response.statusCode = 404;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ kind: "not_found", error: "Unknown account operation." }));
        return;
      }

      serveStatic(options.staticDir, options.dependencies, request, response);
    })();
  };
}

export async function startAccountServer(options: {
  storePath: string;
  host?: string;
  port?: number;
  staticDir?: string;
}): Promise<{ port: number; close: () => Promise<void>; server: Server }> {
  const dependencies = createAccountDependencies(options.storePath);
  const server = createServer(
    createAccountRequestListener({
      dependencies,
      staticDir: options.staticDir,
    }),
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, options.host ?? "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Account server did not bind a TCP port.");
  }

  return {
    port: address.port,
    server,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

function serveStatic(
  staticDir: string,
  dependencies: AccountServiceDependencies,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = normalize(join(staticDir, requested));
  const root = normalize(staticDir + sep);
  if (!resolved.startsWith(root) && resolved !== normalize(staticDir)) {
    response.statusCode = 404;
    response.end();
    return;
  }

  const filePath =
    existsSync(resolved) && statSync(resolved).isFile()
      ? resolved
      : join(staticDir, "index.html");

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.statusCode = 404;
    response.end();
    return;
  }

  if (filePath.endsWith("index.html")) {
    const html = injectAccountBootstrap(
      readFileSync(filePath, "utf8"),
      listAccounts(dependencies.store),
    );
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream");
  createReadStream(filePath).pipe(response);
}

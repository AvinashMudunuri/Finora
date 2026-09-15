import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

import { listAccounts } from "../src/application/accounts/service.ts";
import { handleAccountHttp, injectAccountBootstrap } from "./accountHttp.ts";
import { createAccountDependencies } from "./accountRuntime.ts";
import { defaultAccountStorePath } from "./jsonFileAccountStore.ts";

export function finoraAccountApi(storePath: string = defaultAccountStorePath()): Plugin {
  const dependencies = createAccountDependencies(storePath);

  const middleware: Connect.NextHandleFunction = (
    request: IncomingMessage,
    response: ServerResponse,
    next: Connect.NextFunction,
  ) => {
    void handleAccountHttp(dependencies, request, response).then((handled) => {
      if (!handled && !response.writableEnded) {
        next();
      }
    });
  };

  return {
    name: "finora-account-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        try {
          return injectAccountBootstrap(html, listAccounts(dependencies.store));
        } catch {
          return html;
        }
      },
    },
  };
}

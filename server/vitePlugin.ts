import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

import { listAccounts } from "../src/application/accounts/service.ts";
import { listCards } from "../src/application/cards/service.ts";
import { listStoredTransactions } from "../src/application/transactions/service.ts";
import { handleAccountHttp, injectAccountBootstrap } from "./accountHttp.ts";
import { handleCardHttp, injectCardBootstrap } from "./cardHttp.ts";
import { handleTransactionHttp, injectTransactionBootstrap } from "./transactionHttp.ts";
import {
  createAccountDependencies,
  createCardDependencies,
  createTransactionDependencies,
} from "./accountRuntime.ts";
import { defaultAccountStorePath } from "./jsonFileAccountStore.ts";
import { defaultCardStorePath } from "./jsonFileCardStore.ts";
import { defaultTransactionStorePath } from "./jsonFileTransactionStore.ts";

export function finoraAccountApi(
  storePath: string = defaultAccountStorePath(),
  cardStorePath: string = defaultCardStorePath(),
  transactionStorePath: string = defaultTransactionStorePath(),
): Plugin {
  const dependencies = createAccountDependencies(storePath);
  const cardDependencies = createCardDependencies(cardStorePath);
  const transactionDependencies = createTransactionDependencies(transactionStorePath);

  const middleware: Connect.NextHandleFunction = (
    request: IncomingMessage,
    response: ServerResponse,
    next: Connect.NextFunction,
  ) => {
    void handleAccountHttp(dependencies, request, response).then((handledAccount) => {
      if (handledAccount || response.writableEnded) {
        return;
      }
      return handleCardHttp(cardDependencies, request, response).then((handledCard) => {
        if (handledCard || response.writableEnded) {
          return;
        }
        return handleTransactionHttp(
          transactionDependencies,
          request,
          response,
        ).then((handledTransaction) => {
          if (!handledTransaction && !response.writableEnded) {
            next();
          }
        });
      });
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
          return injectTransactionBootstrap(
            injectCardBootstrap(
              injectAccountBootstrap(html, listAccounts(dependencies.store)),
              listCards(cardDependencies.store),
            ),
            listStoredTransactions(transactionDependencies.store),
          );
        } catch {
          return html;
        }
      },
    },
  };
}

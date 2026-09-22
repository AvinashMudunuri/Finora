import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { usesAccountBackend } from "./application/accounts/contract.ts";
import { usesCardBackend } from "./application/cards/contract.ts";
import { usesTransactionBackend } from "./application/transactions/contract.ts";
import App from "./app/App.tsx";
import { AppErrorBoundary } from "./app/AppErrorBoundary.tsx";
import { createHttpAccountGateway } from "./infrastructure/accounts/httpAccountGateway.ts";
import { createHttpCardGateway } from "./infrastructure/cards/httpCardGateway.ts";
import { createHttpTransactionGateway } from "./infrastructure/transactions/httpTransactionGateway.ts";
import "./styles/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Finora could not find the root element.");
}

root.dataset.finoraMode = import.meta.env.MODE;

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App
        accountGateway={
          usesAccountBackend() ? createHttpAccountGateway() : undefined
        }
        cardGateway={usesCardBackend() ? createHttpCardGateway() : undefined}
        transactionGateway={
          usesTransactionBackend() ? createHttpTransactionGateway() : undefined
        }
      />
    </AppErrorBoundary>
  </StrictMode>,
);

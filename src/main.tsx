import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { usesAccountBackend } from "./application/accounts/contract.ts";
import App from "./app/App.tsx";
import { createHttpAccountGateway } from "./infrastructure/accounts/httpAccountGateway.ts";
import "./styles/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Finora could not find the root element.");
}

createRoot(root).render(
  <StrictMode>
    <App
      accountGateway={
        usesAccountBackend() ? createHttpAccountGateway() : undefined
      }
    />
  </StrictMode>,
);

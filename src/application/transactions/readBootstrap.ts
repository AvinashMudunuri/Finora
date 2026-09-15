import type { Transaction } from "../../domain/types.ts";
import {
  TRANSACTION_BOOTSTRAP_ELEMENT_ID,
  parseTransactionBootstrap,
} from "./bootstrap.ts";

export function readTransactionBootstrap(): Transaction[] | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(`#${TRANSACTION_BOOTSTRAP_ELEMENT_ID}`);
  if (element === null || element.textContent === null) {
    return null;
  }

  return parseTransactionBootstrap(element.textContent);
}

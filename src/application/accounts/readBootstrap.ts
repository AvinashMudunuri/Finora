import type { Account } from "../../domain/types.ts";
import {
  ACCOUNT_BOOTSTRAP_ELEMENT_ID,
  parseAccountBootstrap,
} from "./bootstrap.ts";

export function readAccountBootstrap(): Account[] | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(`#${ACCOUNT_BOOTSTRAP_ELEMENT_ID}`);
  if (element === null || element.textContent === null) {
    return null;
  }

  return parseAccountBootstrap(element.textContent);
}

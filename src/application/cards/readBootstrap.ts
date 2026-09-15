import type { Card } from "../../domain/types.ts";
import { CARD_BOOTSTRAP_ELEMENT_ID, parseCardBootstrap } from "./bootstrap.ts";

export function readCardBootstrap(): Card[] | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(`#${CARD_BOOTSTRAP_ELEMENT_ID}`);
  if (element === null || element.textContent === null) {
    return null;
  }

  return parseCardBootstrap(element.textContent);
}

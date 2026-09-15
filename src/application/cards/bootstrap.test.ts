import { describe, expect, it } from "vitest";
import { fixtureCards } from "../../data/fixtures.ts";
import {
  CARD_BOOTSTRAP_ELEMENT_ID,
  parseCardBootstrap,
  serializeCardBootstrap,
} from "./bootstrap.ts";
import { usesCardBackend } from "./contract.ts";
import { readCardBootstrap } from "./readBootstrap.ts";

describe("card bootstrap and backend mode", () => {
  it("enables the backend outside test and e2e modes", () => {
    expect(usesCardBackend("test")).toBe(false);
    expect(usesCardBackend("e2e-no-attention")).toBe(false);
    expect(usesCardBackend("e2e-high-util")).toBe(false);
    expect(usesCardBackend("production")).toBe(true);
    expect(usesCardBackend("development")).toBe(true);
  });

  it("reads injected card JSON without executing HTML", () => {
    const payload = serializeCardBootstrap(fixtureCards);
    expect(parseCardBootstrap(payload)).toEqual(fixtureCards);
    expect(serializeCardBootstrap([{ ...fixtureCards[0]!, name: "<x>" }])).toContain(
      "\\u003c",
    );

    const script = document.createElement("script");
    script.id = CARD_BOOTSTRAP_ELEMENT_ID;
    script.type = "application/json";
    script.textContent = payload;
    document.body.append(script);
    expect(readCardBootstrap()).toEqual(fixtureCards);
    script.remove();
  });
});

import { describe, expect, it } from "vitest";
import { fixtureAccounts } from "../../data/fixtures.ts";
import {
  ACCOUNT_BOOTSTRAP_ELEMENT_ID,
  parseAccountBootstrap,
  serializeAccountBootstrap,
} from "./bootstrap.ts";
import { usesAccountBackend } from "./contract.ts";
import { readAccountBootstrap } from "./readBootstrap.ts";

describe("account bootstrap and backend mode", () => {
  it("enables the backend outside test and e2e modes", () => {
    expect(usesAccountBackend("test")).toBe(false);
    expect(usesAccountBackend("e2e-no-attention")).toBe(false);
    expect(usesAccountBackend("production")).toBe(true);
    expect(usesAccountBackend("development")).toBe(true);
  });

  it("reads injected account JSON without executing HTML", () => {
    const payload = serializeAccountBootstrap(fixtureAccounts);
    expect(parseAccountBootstrap(payload)).toEqual(fixtureAccounts);
    expect(serializeAccountBootstrap([{ ...fixtureAccounts[0]!, name: "<x>" }])).toContain(
      "\\u003c",
    );

    const script = document.createElement("script");
    script.id = ACCOUNT_BOOTSTRAP_ELEMENT_ID;
    script.type = "application/json";
    script.textContent = payload;
    document.body.append(script);
    expect(readAccountBootstrap()).toEqual(fixtureAccounts);
    script.remove();
  });
});

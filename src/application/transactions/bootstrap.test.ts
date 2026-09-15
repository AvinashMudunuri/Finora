import { describe, expect, it } from "vitest";
import { fixtureTransactions } from "../../data/fixtures.ts";
import { listTransactions } from "../../domain/finance.ts";
import {
  TRANSACTION_BOOTSTRAP_ELEMENT_ID,
  parseTransactionBootstrap,
  serializeTransactionBootstrap,
} from "./bootstrap.ts";
import { usesTransactionBackend } from "./contract.ts";
import { readTransactionBootstrap } from "./readBootstrap.ts";

describe("transaction bootstrap and backend mode", () => {
  it("enables the backend outside test and e2e modes", () => {
    expect(usesTransactionBackend("test")).toBe(false);
    expect(usesTransactionBackend("e2e-no-attention")).toBe(false);
    expect(usesTransactionBackend("e2e-nw-decreased")).toBe(false);
    expect(usesTransactionBackend("production")).toBe(true);
    expect(usesTransactionBackend("development")).toBe(true);
  });

  it("reads injected transaction JSON without executing HTML", () => {
    const payload = serializeTransactionBootstrap(fixtureTransactions);
    expect(parseTransactionBootstrap(payload)).toEqual(fixtureTransactions);
    expect(
      serializeTransactionBootstrap([
        { ...fixtureTransactions[0]!, description: "<x>" },
      ]),
    ).toContain("\\u003c");

    const script = document.createElement("script");
    script.id = TRANSACTION_BOOTSTRAP_ELEMENT_ID;
    script.type = "application/json";
    script.textContent = payload;
    document.body.append(script);
    expect(readTransactionBootstrap()).toEqual(fixtureTransactions);
    script.remove();
  });

  it("keeps the existing newest-first ordering contract", () => {
    expect(listTransactions(fixtureTransactions, { kind: "all" }).map((item) => item.id)).toEqual(
      [...fixtureTransactions]
        .sort((left, right) => {
          if (left.date !== right.date) {
            return left.date < right.date ? 1 : -1;
          }
          return right.id.localeCompare(left.id);
        })
        .map((item) => item.id),
    );
  });
});

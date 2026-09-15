/** @vitest-environment node */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CARD_UNAVAILABLE_MESSAGE } from "../src/application/cards/contract.ts";
import { startAccountServer } from "./accountRuntime.ts";

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server) {
      await server.close();
    }
  }
});

async function start(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "finora-card-http-"));
  const started = await startAccountServer({
    storePath: join(dir, "accounts.json"),
    cardStorePath: join(dir, "cards.json"),
  });
  servers.push(started);
  return `http://127.0.0.1:${started.port}`;
}

const validBody = {
  name: "Store Card",
  issuer: "Northlake Bank",
  creditLimit: 1000,
  outstandingBalance: 100,
  availableCredit: 999999,
  statementPeriodEnd: "2026-10-08",
  paymentDueDate: "2026-10-22",
  minimumPayment: 25,
  paymentStatus: "current",
};

describe("card HTTP contract", () => {
  it("reads seeded cards", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards`);
    const body = (await response.json()) as { cards: Array<{ name: string }> };

    expect(response.status).toBe(200);
    expect(body.cards.map((card) => card.name)).toContain("Visa Rewards");
    expect(body.cards.map((card) => card.name)).toContain("Amex Everyday");
  });

  it("creates a valid card and derives available credit", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const body = (await response.json()) as {
      card: { id: string; name: string; availableCredit: number };
    };

    expect(response.status).toBe(200);
    expect(body.card.id).toBe("card-1");
    expect(body.card.name).toBe("Store Card");
    expect(body.card.availableCredit).toBe(900);

    const listed = await fetch(`${origin}/api/cards`);
    const payload = (await listed.json()) as { cards: Array<{ name: string }> };
    expect(payload.cards.map((card) => card.name)).toContain("Store Card");
  });

  it("rejects an invalid create with validation errors", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        issuer: "",
        creditLimit: 0,
        outstandingBalance: -1,
        statementPeriodEnd: "2026-13-40",
        paymentDueDate: "nope",
        minimumPayment: -4,
        paymentStatus: "late",
      }),
    });
    const body = (await response.json()) as {
      kind: string;
      errors: Record<string, string>;
    };

    expect(response.status).toBe(400);
    expect(body.kind).toBe("validation");
    expect(body.errors.name).toBe("Card name is required.");
    expect(body.errors.issuer).toBe("Issuer is required.");
    expect(body.errors.creditLimit).toMatch(/greater than 0/);
    expect(JSON.stringify(body)).not.toMatch(/cards\.json|stack|ENOENT/i);
  });

  it("updates a card without changing its identity", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards/card-visa`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Primary Visa",
        issuer: "Northlake Bank",
        creditLimit: 5000,
        outstandingBalance: 1842.19,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 35,
        paymentStatus: "due",
      }),
    });
    const body = (await response.json()) as { card: { id: string; name: string } };

    expect(response.status).toBe(200);
    expect(body.card.id).toBe("card-visa");
    expect(body.card.name).toBe("Primary Visa");
  });

  it("rejects an invalid update", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards/card-visa`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "   ",
        issuer: "Northlake Bank",
        creditLimit: 5000,
        outstandingBalance: 10,
        statementPeriodEnd: "2026-09-08",
        paymentDueDate: "2026-09-22",
        minimumPayment: 35,
        paymentStatus: "due",
      }),
    });
    const body = (await response.json()) as { kind: string; errors: { name?: string } };

    expect(response.status).toBe(400);
    expect(body.kind).toBe("validation");
    expect(body.errors.name).toBe("Card name is required.");
  });

  it("returns not_found for an unknown card without leaking infrastructure", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards/card-missing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const body = (await response.json()) as { kind: string; error: string };

    expect(response.status).toBe(404);
    expect(body.kind).toBe("not_found");
    expect(body.error).toBe("That card no longer exists.");
    expect(JSON.stringify(body)).not.toMatch(/FINORA_CARD_STORE|\\\\|stack/i);
  });

  it("rejects invalid JSON without exposing a parse stack", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const body = (await response.json()) as { kind: string; errors: { form?: string } };

    expect(response.status).toBe(400);
    expect(body.kind).toBe("validation");
    expect(body.errors.form).toBe("Request is not valid JSON.");
    expect(JSON.stringify(body)).not.toMatch(/SyntaxError|stack/i);
  });

  it("returns unavailable for malformed persisted data", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-card-bad-"));
    const cardStorePath = join(dir, "cards.json");
    writeFileSync(cardStorePath, "{not-json", "utf8");
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath,
    });
    servers.push(started);

    const response = await fetch(`http://127.0.0.1:${started.port}/api/cards`);
    const body = (await response.json()) as { kind: string; error: string };

    expect(response.status).toBe(500);
    expect(body.kind).toBe("unavailable");
    expect(body.error).toBe(CARD_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(body)).not.toMatch(/cards\.json|not-json|stack/i);
  });
});

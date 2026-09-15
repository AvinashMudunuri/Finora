/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CARD_UNAVAILABLE_MESSAGE } from "../src/application/cards/contract.ts";
import { createHttpCardGateway } from "../src/infrastructure/cards/httpCardGateway.ts";
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

const validDraft = {
  name: "Store Card",
  issuer: "Northlake Bank",
  creditLimit: "1000",
  outstandingBalance: "100",
  statementPeriodEnd: "2026-10-08",
  paymentDueDate: "2026-10-22",
  minimumPayment: "25",
  paymentStatus: "current",
};

describe("http card gateway", () => {
  it("round-trips create and update through the public contract", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-card-gw-"));
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath: join(dir, "cards.json"),
    });
    servers.push(started);
    const gateway = createHttpCardGateway(`http://127.0.0.1:${started.port}`);

    const listed = await gateway.list();
    expect(listed.some((card) => card.id === "card-visa")).toBe(true);

    const created = await gateway.create(validDraft);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value.id).toMatch(/^card-\d+$/);
    expect(created.value.availableCredit).toBe(900);

    const updated = await gateway.update("card-visa", {
      name: "Primary Visa",
      issuer: "Northlake Bank",
      creditLimit: 5000,
      outstandingBalance: 1842.19,
      statementPeriodEnd: "2026-09-08",
      paymentDueDate: "2026-09-22",
      minimumPayment: 35,
      paymentStatus: "due",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.value.id).toBe("card-visa");
    expect(updated.value.name).toBe("Primary Visa");
  });

  it("maps validation and missing-card failures without infrastructure text", async () => {
    const dir = mkdtempSync(join(tmpdir(), "finora-card-gw-"));
    const started = await startAccountServer({
      storePath: join(dir, "accounts.json"),
      cardStorePath: join(dir, "cards.json"),
    });
    servers.push(started);
    const gateway = createHttpCardGateway(`http://127.0.0.1:${started.port}`);

    const invalid = await gateway.create({
      ...validDraft,
      name: "",
    });
    expect(invalid).toEqual({
      ok: false,
      errors: { name: "Card name is required." },
    });

    const missing = await gateway.update("card-missing", validDraft);
    expect(missing.ok).toBe(false);
    if (missing.ok) {
      return;
    }
    expect(missing.errors.form).toBe("That card no longer exists.");
    expect(JSON.stringify(missing)).not.toMatch(/cards\.json|ECONN|stack/i);
  });

  it("maps a down backend to a user-facing unavailable error", async () => {
    const gateway = createHttpCardGateway("http://127.0.0.1:1");
    const result = await gateway.create(validDraft);
    expect(result).toEqual({
      ok: false,
      errors: { form: CARD_UNAVAILABLE_MESSAGE },
    });
  });
});

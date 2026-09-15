/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ACCOUNT_UNAVAILABLE_MESSAGE } from "../src/application/accounts/contract.ts";
import { createHttpAccountGateway } from "../src/infrastructure/accounts/httpAccountGateway.ts";
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

describe("http account gateway", () => {
  it("round-trips create and update through the public contract", async () => {
    const started = await startAccountServer({
      storePath: join(mkdtempSync(join(tmpdir(), "finora-gw-")), "accounts.json"),
    });
    servers.push(started);
    const gateway = createHttpAccountGateway(`http://127.0.0.1:${started.port}`);

    const listed = await gateway.list();
    expect(listed.some((account) => account.id === "acc-checking")).toBe(true);

    const created = await gateway.create({
      name: "Travel Fund",
      type: "bank",
      balance: "500",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value.id).toMatch(/^acc-\d+$/);

    const updated = await gateway.update("acc-checking", {
      name: "Primary Checking",
      type: "bank",
      balance: 4286.47,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.value.id).toBe("acc-checking");
    expect(updated.value.name).toBe("Primary Checking");
  });

  it("maps validation and missing-account failures without infrastructure text", async () => {
    const started = await startAccountServer({
      storePath: join(mkdtempSync(join(tmpdir(), "finora-gw-")), "accounts.json"),
    });
    servers.push(started);
    const gateway = createHttpAccountGateway(`http://127.0.0.1:${started.port}`);

    const invalid = await gateway.create({
      name: "",
      type: "bank",
      balance: 10,
    });
    expect(invalid).toEqual({
      ok: false,
      errors: { name: "Account name is required." },
    });

    const missing = await gateway.update("acc-missing", {
      name: "Ghost",
      type: "bank",
      balance: 1,
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) {
      return;
    }
    expect(missing.errors.form).toBe("That account no longer exists.");
    expect(JSON.stringify(missing)).not.toMatch(/accounts\.json|ECONN|stack/i);
  });

  it("maps a down backend to a user-facing unavailable error", async () => {
    const gateway = createHttpAccountGateway("http://127.0.0.1:1");
    const result = await gateway.create({
      name: "Travel Fund",
      type: "bank",
      balance: 1,
    });
    expect(result).toEqual({
      ok: false,
      errors: { form: ACCOUNT_UNAVAILABLE_MESSAGE },
    });
  });
});

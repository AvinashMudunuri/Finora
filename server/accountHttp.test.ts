/** @vitest-environment node */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
  const started = await startAccountServer({
    storePath: join(mkdtempSync(join(tmpdir(), "finora-http-")), "accounts.json"),
  });
  servers.push(started);
  return `http://127.0.0.1:${started.port}`;
}

describe("account HTTP contract", () => {
  it("reads seeded accounts", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts`);
    const body = (await response.json()) as { accounts: Array<{ name: string }> };

    expect(response.status).toBe(200);
    expect(body.accounts.map((account) => account.name)).toContain("Everyday Checking");
  });

  it("creates a valid account", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Travel Fund", type: "bank", balance: 500 }),
    });
    const body = (await response.json()) as { account: { id: string; name: string } };

    expect(response.status).toBe(200);
    expect(body.account.id).toBe("acc-1");
    expect(body.account.name).toBe("Travel Fund");

    const listed = await fetch(`${origin}/api/accounts`);
    const payload = (await listed.json()) as { accounts: Array<{ name: string }> };
    expect(payload.accounts.map((account) => account.name)).toContain("Travel Fund");
  });

  it("rejects an invalid create with validation errors", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", type: "credit", balance: "nope" }),
    });
    const body = (await response.json()) as {
      kind: string;
      errors: Record<string, string>;
    };

    expect(response.status).toBe(400);
    expect(body.kind).toBe("validation");
    expect(body.errors.name).toBe("Account name is required.");
    expect(body.errors.type).toMatch(/Bank, Cash, or Investment/);
    expect(JSON.stringify(body)).not.toMatch(/accounts\.json|stack|ENOENT/i);
  });

  it("updates an account without changing its identity", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts/acc-checking`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Primary Checking",
        type: "bank",
        balance: 4286.47,
      }),
    });
    const body = (await response.json()) as { account: { id: string; name: string } };

    expect(response.status).toBe(200);
    expect(body.account.id).toBe("acc-checking");
    expect(body.account.name).toBe("Primary Checking");
  });

  it("rejects an invalid update", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts/acc-checking`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   ", type: "bank", balance: 10 }),
    });
    const body = (await response.json()) as { kind: string; errors: { name?: string } };

    expect(response.status).toBe(400);
    expect(body.kind).toBe("validation");
    expect(body.errors.name).toBe("Account name is required.");
  });

  it("returns not_found for an unknown account without leaking infrastructure", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts/acc-missing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost", type: "bank", balance: 1 }),
    });
    const body = (await response.json()) as { kind: string; error: string };

    expect(response.status).toBe(404);
    expect(body.kind).toBe("not_found");
    expect(body.error).toBe("That account no longer exists.");
    expect(JSON.stringify(body)).not.toMatch(/FINORA_ACCOUNT_STORE|\\\\|stack/i);
  });

  it("rejects invalid JSON without exposing a parse stack", async () => {
    const origin = await start();
    const response = await fetch(`${origin}/api/accounts`, {
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
});

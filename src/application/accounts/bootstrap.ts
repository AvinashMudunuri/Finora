import type { Account } from "../../domain/types.ts";

export const ACCOUNT_BOOTSTRAP_ELEMENT_ID = "finora-account-bootstrap";

export function serializeAccountBootstrap(accounts: readonly Account[]): string {
  return JSON.stringify({ accounts }).replace(/</g, "\\u003c");
}

export function parseAccountBootstrap(raw: string): Account[] | null {
  try {
    const parsed = JSON.parse(raw) as { accounts?: unknown };
    if (!Array.isArray(parsed.accounts)) {
      return null;
    }
    return parsed.accounts as Account[];
  } catch {
    return null;
  }
}

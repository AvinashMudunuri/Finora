import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { CardStore } from "../src/application/cards/port.ts";
import { fixtureAccounts, fixtureCards, fixtureTransactions } from "../src/data/fixtures.ts";
import type { Card } from "../src/domain/types.ts";
import { CARD_PAYMENT_STATUSES } from "../src/domain/types.ts";
import { assertValidFinanceData } from "../src/domain/validate.ts";

export const CARD_STORE_VERSION = 1;

export class CardStoreError extends Error {
  readonly code = "card_store";

  constructor(message = "Card store is unavailable.") {
    super(message);
    this.name = "CardStoreError";
  }
}

export class JsonFileCardStore implements CardStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  list(): Card[] {
    this.ensureSeeded();
    return this.readCards().map((card) => ({ ...card }));
  }

  write(cards: readonly Card[]): void {
    assertUniqueCardIdentities(cards);
    assertValidFinanceData(
      [...fixtureAccounts],
      [...cards],
      [...fixtureTransactions],
    );
    this.persist(cards);
  }

  private ensureSeeded(): void {
    try {
      this.readCards();
    } catch (error) {
      if (error instanceof CardStoreError && error.message === "missing") {
        this.persist(fixtureCards);
        return;
      }
      throw error;
    }
  }

  private readCards(): Card[] {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch {
      throw new CardStoreError("missing");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CardStoreError();
    }

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as { version?: unknown }).version !== CARD_STORE_VERSION ||
      !Array.isArray((parsed as { cards?: unknown }).cards)
    ) {
      throw new CardStoreError();
    }

    const cards = (parsed as { cards: unknown[] }).cards.map(readStoredCard);
    assertUniqueCardIdentities(cards);
    assertValidFinanceData([...fixtureAccounts], cards, [...fixtureTransactions]);
    return cards;
  }

  private persist(cards: readonly Card[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(
      this.filePath,
      `${JSON.stringify(
        {
          version: CARD_STORE_VERSION,
          cards,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
}

function readStoredCard(value: unknown): Card {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CardStoreError();
  }

  const record = value as Record<string, unknown>;
  const paymentStatus = String(record.paymentStatus ?? "");
  if (
    typeof record.id !== "string" ||
    record.id.trim().length === 0 ||
    typeof record.name !== "string" ||
    record.name.trim().length === 0 ||
    typeof record.issuer !== "string" ||
    record.issuer.trim().length === 0 ||
    typeof record.creditLimit !== "number" ||
    !Number.isFinite(record.creditLimit) ||
    typeof record.outstandingBalance !== "number" ||
    !Number.isFinite(record.outstandingBalance) ||
    typeof record.availableCredit !== "number" ||
    !Number.isFinite(record.availableCredit) ||
    record.currency !== "USD" ||
    typeof record.statementPeriodEnd !== "string" ||
    typeof record.paymentDueDate !== "string" ||
    typeof record.minimumPayment !== "number" ||
    !Number.isFinite(record.minimumPayment) ||
    !CARD_PAYMENT_STATUSES.includes(paymentStatus as Card["paymentStatus"])
  ) {
    throw new CardStoreError();
  }

  return {
    id: record.id,
    name: record.name,
    issuer: record.issuer,
    creditLimit: record.creditLimit,
    outstandingBalance: record.outstandingBalance,
    availableCredit: record.availableCredit,
    currency: "USD",
    statementPeriodEnd: record.statementPeriodEnd,
    paymentDueDate: record.paymentDueDate,
    minimumPayment: record.minimumPayment,
    paymentStatus: paymentStatus as Card["paymentStatus"],
  };
}

function assertUniqueCardIdentities(cards: readonly Card[]): void {
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.id)) {
      throw new CardStoreError();
    }
    seen.add(card.id);
  }
}

export function defaultCardStorePath(
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.FINORA_CARD_STORE?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  return `${cwd.replace(/[\\/]$/, "")}/data/cards.json`;
}

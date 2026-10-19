import { describe, expect, it } from "vitest";
import type { Account, Card } from "../../domain/types.ts";
import { identifyParty } from "./identify.ts";
import type { ExtractedStatement } from "./types.ts";

const HDFC: Account = {
  id: "acc-hdfc",
  name: "HDFC Savings",
  type: "bank",
  balance: 50,
  currency: "USD",
};

const VISA_ONE: Card = {
  id: "card-1",
  name: "Visa Rewards",
  issuer: "Visa",
  creditLimit: 5000,
  outstandingBalance: 100,
  availableCredit: 4900,
  currency: "USD",
  statementPeriodEnd: "2026-08-31",
  paymentDueDate: "2026-09-22",
  minimumPayment: 35,
  paymentStatus: "current",
};

const VISA_TWO: Card = {
  ...VISA_ONE,
  id: "card-2",
  name: "Visa Signature",
};

const BANK: ExtractedStatement = {
  kind: "csv",
  institution: "HDFC Bank",
  partyName: "HDFC Savings",
  partyKind: "account",
  accountType: "bank",
  lines: [],
  warnings: [],
};

const CARD: ExtractedStatement = {
  kind: "pdf",
  institution: "Visa",
  partyName: "Visa Rewards",
  partyKind: "card",
  minimumPayment: 35,
  paymentDueDate: "2026-09-22",
  lines: [],
  warnings: [],
};

describe("identifyParty", () => {
  it("unique-matches a bank account by name", () => {
    const decision = identifyParty(BANK, [HDFC], []);
    expect(decision.kind).toBe("account");
    if (decision.kind === "account") {
      expect(decision.account.id).toBe("acc-hdfc");
    }
  });

  it("does not collapse two cards that share an issuer", () => {
    const decision = identifyParty(CARD, [], [VISA_ONE, VISA_TWO]);
    expect(decision.kind).toBe("ambiguous");
  });

  it("unique-matches a single card by issuer substring", () => {
    const decision = identifyParty(CARD, [], [VISA_ONE]);
    expect(decision.kind).toBe("card");
    if (decision.kind === "card") {
      expect(decision.card.id).toBe("card-1");
    }
  });
});

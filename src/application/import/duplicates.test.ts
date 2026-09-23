import { describe, expect, it } from "vitest";
import type { Transaction } from "../../domain/types.ts";
import { splitDuplicates } from "./duplicates.ts";
import type { ClassifiedLine } from "./types.ts";

const line: ClassifiedLine = {
  date: "2026-08-03",
  description: "Payroll — Acme Corp",
  amount: 3200,
  direction: "credit",
  eventType: "income",
  needsReview: false,
};

describe("duplicate protection", () => {
  it("treats the same imported line as a duplicate", () => {
    const existing: Transaction[] = [
      {
        id: "imp-1",
        date: "2026-08-03",
        description: "Payroll — Acme Corp",
        amount: 3200,
        currency: "USD",
        eventType: "income",
        accountId: "acc-1",
        counterpartyAccountId: null,
        cardId: null,
        source: "import",
        sourceFileId: "stmt-1",
      },
    ];
    const result = splitDuplicates([line], existing, "acc-1");
    expect(result.duplicateCount).toBe(1);
    expect(result.newCount).toBe(0);
  });

  it("keeps overlapping new rows", () => {
    const result = splitDuplicates(
      [
        line,
        { ...line, date: "2026-08-04", description: "Whole Foods Market", amount: 87.42, eventType: "expense", direction: "debit" },
      ],
      [],
      "acc-1",
    );
    expect(result.newCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
  });
});

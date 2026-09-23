import { describe, expect, it } from "vitest";
import { reconcileStatement } from "./reconcile.ts";

describe("statement reconciliation", () => {
  it("accepts opening + credits - debits = closing", () => {
    expect(
      reconcileStatement(
        [
          { date: "2026-08-01", description: "In", amount: 100, direction: "credit" },
          { date: "2026-08-02", description: "Out", amount: 40, direction: "debit" },
        ],
        200,
        260,
      ),
    ).toEqual({ kind: "ok" });
  });

  it("reports a mismatch without changing amounts", () => {
    const result = reconcileStatement(
      [{ date: "2026-08-01", description: "In", amount: 100, direction: "credit" }],
      200,
      250,
    );
    expect(result).toEqual({
      kind: "mismatch",
      expectedClosing: 250,
      calculatedClosing: 300,
    });
  });

  it("skips when opening or closing is missing", () => {
    expect(
      reconcileStatement(
        [{ date: "2026-08-01", description: "In", amount: 1, direction: "credit" }],
        undefined,
        10,
      ),
    ).toEqual({ kind: "skipped", reason: "missing-opening" });
    expect(
      reconcileStatement(
        [{ date: "2026-08-01", description: "In", amount: 1, direction: "credit" }],
        10,
        undefined,
      ),
    ).toEqual({ kind: "skipped", reason: "missing-closing" });
  });
});

import type { ExtractedLine, Reconciliation } from "./types.ts";

const EPSILON = 0.015;

export function reconcileStatement(
  lines: ExtractedLine[],
  openingBalance?: number,
  closingBalance?: number,
): Reconciliation {
  if (openingBalance === undefined) {
    return { kind: "skipped", reason: "missing-opening" };
  }
  if (closingBalance === undefined) {
    return { kind: "skipped", reason: "missing-closing" };
  }

  const calculated = lines.reduce((balance, line) => {
    return line.direction === "credit"
      ? balance + line.amount
      : balance - line.amount;
  }, openingBalance);

  if (Math.abs(calculated - closingBalance) < EPSILON) {
    return { kind: "ok" };
  }

  return {
    kind: "mismatch",
    expectedClosing: closingBalance,
    calculatedClosing: roundMoney(calculated),
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

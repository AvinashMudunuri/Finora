import type { Transaction } from "../../domain/types.ts";
import type { ClassifiedLine, DuplicateSummary } from "./types.ts";

export function statementFingerprint(input: {
  institution?: string;
  maskedNumber?: string;
  periodStart?: string;
  periodEnd?: string;
}): string {
  return [
    input.institution ?? "",
    input.maskedNumber ?? "",
    input.periodStart ?? "",
    input.periodEnd ?? "",
  ]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

export function lineFingerprint(
  line: Pick<ClassifiedLine, "date" | "amount" | "description">,
  partyId: string,
): string {
  return [
    partyId,
    line.date,
    line.amount.toFixed(2),
    line.description.trim().toLowerCase(),
  ].join("|");
}

export function splitDuplicates(
  lines: ClassifiedLine[],
  existing: readonly Transaction[],
  partyId: string,
): DuplicateSummary {
  const known = new Set(
    existing
      .filter((transaction) => transaction.source === "import")
      .map((transaction) =>
        lineFingerprint(
          {
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.description,
          },
          transaction.accountId ?? transaction.cardId ?? partyId,
        ),
      ),
  );

  const newLines: ClassifiedLine[] = [];
  const duplicateLines: ClassifiedLine[] = [];

  for (const line of lines) {
    const fingerprint = lineFingerprint(line, partyId);
    if (known.has(fingerprint)) {
      duplicateLines.push(line);
    } else {
      newLines.push(line);
      known.add(fingerprint);
    }
  }

  return {
    newCount: newLines.length,
    duplicateCount: duplicateLines.length,
    newLines,
    duplicateLines,
  };
}

export function sourceFileId(fileName: string, byteLength: number, fingerprint: string): string {
  return hashString(`${fileName}|${byteLength}|${fingerprint}`);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `stmt-${(hash >>> 0).toString(16)}`;
}

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

export function statementContentId(input: {
  institution?: string;
  maskedNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  lines: readonly { date: string; amount: number; description: string; direction: string }[];
}): string {
  const body = input.lines
    .map(
      (line) =>
        `${line.date}|${line.amount.toFixed(2)}|${line.description.trim().toLowerCase()}|${line.direction}`,
    )
    .join(";");
  return hashString(`${statementFingerprint(input)}|${body}`);
}

export function importedLineSetKey(
  lines: readonly { date: string; amount: number; description: string }[],
): string {
  return lines
    .map(
      (line) =>
        `${line.date}|${line.amount.toFixed(2)}|${line.description.trim().toLowerCase()}`,
    )
    .sort()
    .join(";");
}

// ponytail: full imported line-set equality, not a ledger-wide transaction identity store.
// Ceiling: two different statements with the same dates/amounts/descriptions collide.
// Upgrade: include masked number / period in the set key when extractors supply them.
export function hasImportedLineSet(
  existing: readonly Transaction[],
  lines: readonly { date: string; amount: number; description: string }[],
): boolean {
  if (lines.length === 0) {
    return false;
  }
  const incoming = importedLineSetKey(lines);
  const grouped = new Map<string, { date: string; amount: number; description: string }[]>();
  for (const transaction of existing) {
    if (transaction.source !== "import" || !transaction.sourceFileId) {
      continue;
    }
    const group = grouped.get(transaction.sourceFileId) ?? [];
    group.push(transaction);
    grouped.set(transaction.sourceFileId, group);
  }
  for (const group of grouped.values()) {
    if (importedLineSetKey(group) === incoming) {
      return true;
    }
  }
  return false;
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

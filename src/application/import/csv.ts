import type { ColumnMapping, ColumnRole, ExtractedLine, ExtractedStatement } from "./types.ts";

const ROLE_ALIASES: Record<ColumnRole, string[]> = {
  date: ["date", "transaction date", "txn date", "value date", "posted"],
  description: [
    "description",
    "narration",
    "particulars",
    "details",
    "remarks",
    "merchant",
  ],
  debit: ["debit", "withdrawal", "withdrawals", "dr"],
  credit: ["credit", "deposit", "deposits", "cr"],
  amount: ["amount", "transaction amount"],
  balance: ["balance", "running balance", "closing balance"],
  ignore: [],
};

export function detectColumnMapping(headers: string[]): {
  mapping: ColumnMapping;
  ambiguous: boolean;
  missing: ColumnRole[];
} {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const [role, aliases] of Object.entries(ROLE_ALIASES) as [
    ColumnRole,
    string[],
  ][]) {
    if (role === "ignore") {
      continue;
    }
    const match = headers.find((header) => {
      const normalized = normalizeHeader(header);
      return aliases.includes(normalized) && !used.has(header);
    });
    if (match) {
      mapping[role] = match;
      used.add(match);
    }
  }

  const hasSplit = Boolean(mapping.debit || mapping.credit);
  const hasAmount = Boolean(mapping.amount);
  const missing: ColumnRole[] = [];
  if (!mapping.date) {
    missing.push("date");
  }
  if (!mapping.description) {
    missing.push("description");
  }
  if (!hasSplit && !hasAmount) {
    missing.push("amount");
  }

  return {
    mapping,
    ambiguous: missing.length > 0,
    missing,
  };
}

export function mappingFingerprint(headers: string[]): string {
  return headers.map(normalizeHeader).join("|");
}

export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }
  return { headers: rows[0] ?? [], rows: rows.slice(1) };
}

export function extractCsvStatement(
  text: string,
  mapping: ColumnMapping,
): ExtractedStatement {
  const parsed = parseCsvText(text);
  if (parsed.headers.length === 0) {
    return {
      kind: "csv",
      lines: [],
      warnings: [],
      error: "We couldn't identify transaction dates and amounts in this file.",
    };
  }

  const lines: ExtractedLine[] = [];
  const warnings: string[] = [];

  for (const row of parsed.rows) {
    if (row.every((cell) => cell.trim() === "")) {
      continue;
    }
    const record = Object.fromEntries(
      parsed.headers.map((header, index) => [header, row[index] ?? ""]),
    );
    const line = lineFromRow(record, mapping);
    if (!line.ok) {
      warnings.push(line.reason);
      continue;
    }
    lines.push(line.value);
  }

  if (lines.length === 0) {
    return {
      kind: "csv",
      lines: [],
      warnings,
      error: "We couldn't identify transaction dates and amounts in this file.",
    };
  }

  const dates = lines.map((line) => line.date).sort();
  const lastBalance = lines[lines.length - 1]?.balance;
  return {
    kind: "csv",
    lines,
    warnings,
    currency: "USD",
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    ...(lastBalance === undefined ? {} : { closingBalance: lastBalance }),
  };
}

export function csvExtractorCanHandle(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || file.type === "text/csv";
}

function lineFromRow(
  record: Record<string, string>,
  mapping: ColumnMapping,
): { ok: true; value: ExtractedLine } | { ok: false; reason: string } {
  const dateRaw = mapping.date ? record[mapping.date] : "";
  const date = parseFlexibleDate(dateRaw ?? "");
  if (!date) {
    return { ok: false, reason: "A row is missing a usable date." };
  }

  const description = mapping.description
    ? (record[mapping.description] ?? "").trim()
    : "";
  if (!description) {
    return { ok: false, reason: "A row is missing a description." };
  }

  const debit = mapping.debit ? parseAmount(record[mapping.debit] ?? "") : null;
  const credit = mapping.credit ? parseAmount(record[mapping.credit] ?? "") : null;
  const amountOnly = mapping.amount ? parseAmount(record[mapping.amount] ?? "") : null;
  const parsedBalance = mapping.balance ? parseAmount(record[mapping.balance] ?? "") : null;
  const balance = parsedBalance === null ? undefined : parsedBalance;

  let amount = 0;
  let direction: ExtractedLine["direction"] = "debit";

  if (debit && debit > 0 && !(credit && credit > 0)) {
    amount = debit;
    direction = "debit";
  } else if (credit && credit > 0 && !(debit && debit > 0)) {
    amount = credit;
    direction = "credit";
  } else if (amountOnly && amountOnly !== 0) {
    amount = Math.abs(amountOnly);
    direction = amountOnly < 0 ? "debit" : "credit";
  } else {
    return { ok: false, reason: `“${description}” is missing a debit or credit amount.` };
  }

  return {
    ok: true,
    value: {
      date,
      description,
      amount,
      direction,
      ...(balance === undefined ? {} : { balance }),
    },
  };
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.replace(/[, ₹$]/g, "").trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function parseFlexibleDate(raw: string): string | null {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const slash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const year = slash[3];
    if (month > 12) {
      return isoDate(year, Number(slash[2]), Number(slash[1]));
    }
    return isoDate(year, month, day);
  }
  const named = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (named) {
    const month = monthIndex(named[2] ?? "");
    if (month === null) {
      return null;
    }
    return isoDate(named[3], month, Number(named[1]));
  }
  return null;
}

function isoDate(year: string | undefined, month: number, day: number): string | null {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthIndex(name: string): number | null {
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const index = months.findIndex((month) => name.toLowerCase().startsWith(month));
  return index === -1 ? null : index + 1;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_]+/g, " ");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        quoted = false;
        continue;
      }
      cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

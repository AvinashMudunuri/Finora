import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { persistImport } from "../application/import/service.ts";
import { emptyUserLedger } from "../application/import/store.ts";
import type { ExtractedStatement } from "../application/import/types.ts";
import { StatementImport } from "./StatementImport.tsx";

const COUNTERPARTY = {
  id: "acc-icici",
  name: "ICICI Savings",
  type: "bank" as const,
  balance: 0,
  currency: "USD",
};

const BANK: ExtractedStatement = {
  kind: "csv",
  institution: "HDFC Bank",
  partyName: "HDFC Savings",
  partyKind: "account",
  accountType: "bank",
  maskedNumber: "•••• 1234",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  currency: "USD",
  openingBalance: 10000,
  closingBalance: 13112.58,
  lines: [
    { date: "2026-08-03", description: "Payroll — Acme Corp", amount: 3200, direction: "credit" },
    { date: "2026-08-04", description: "Whole Foods Market", amount: 87.42, direction: "debit" },
    { date: "2026-08-05", description: "NEFT to ICICI Savings", amount: 31000, direction: "debit" },
  ],
  warnings: [],
};

const SAMPLE_CSV = `Transaction Date,Narration,Debit,Credit,Balance
2026-08-03,Payroll — Acme Corp,,3200,8000
2026-08-04,Whole Foods Market,87.42,,7912.58
2026-08-05,NEFT to ICICI Savings,31000,,-23087.42
`;

describe("StatementImport", () => {
  it("asks for column mapping when headers are ambiguous", async () => {
    const user = userEvent.setup();
    render(
      <StatementImport ledger={emptyUserLedger()} onLedgerChange={() => undefined} />,
    );

    const file = new File(["Foo,Bar\n1,2\n"], "mystery.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Statement file"), file);

    expect(await screen.findByText("Map columns")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("rejects a scanned-looking PDF without inventing transactions", async () => {
    const user = userEvent.setup();
    render(
      <StatementImport ledger={emptyUserLedger()} onLedgerChange={() => undefined} />,
    );

    const file = new File(["%PDF-1.4 /Image"], "scan.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Statement file"), file);

    expect(
      await screen.findByText(
        "This PDF appears to be scanned. Finora currently supports text-based statements.",
      ),
    ).toBeInTheDocument();
  });

  it("does not let a transfer confirm as a different type", async () => {
    const user = userEvent.setup();
    render(
      <StatementImport ledger={emptyUserLedger()} onLedgerChange={() => undefined} />,
    );

    const csv = `Transaction Date,Narration,Debit,Credit,Balance
2026-08-05,NEFT to ICICI Savings,31000,,0
`;
    await user.upload(
      screen.getByLabelText("Statement file"),
      new File([csv], "neft.csv", { type: "text/csv" }),
    );

    await user.click(await screen.findByRole("button", { name: "Review transactions" }));
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.queryByText("Transfer")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Import/ })).toBeDisabled();
    expect(
      screen.getByText(/Choose a funding or counterparty account/i),
    ).toBeInTheDocument();
  });

  it("blocks confirm of a renamed copy of an already imported statement", async () => {
    const user = userEvent.setup();
    const first = persistImport({
      ledger: { ...emptyUserLedger(), accounts: [COUNTERPARTY] },
      fileName: "hdfc.csv",
      fileSize: 120,
      statement: BANK,
      partyKind: "account",
      fundingAccountId: COUNTERPARTY.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    render(<StatementImport ledger={first.ledger} onLedgerChange={() => undefined} />);
    await user.upload(
      screen.getByLabelText("Statement file"),
      new File([SAMPLE_CSV], "hdfc-copy.csv", { type: "text/csv" }),
    );
    expect(await screen.findByText(/0 new · 3 already imported/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review transactions" }));
    expect(screen.getByRole("button", { name: /Import/ })).toBeDisabled();
  });
});

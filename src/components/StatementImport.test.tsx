import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { emptyUserLedger } from "../application/import/store.ts";
import { StatementImport } from "./StatementImport.tsx";

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
});

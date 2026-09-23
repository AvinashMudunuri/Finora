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
});

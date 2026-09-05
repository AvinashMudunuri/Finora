import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";

describe("Finora app navigation", () => {
  it("opens the cards experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cards" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your cards" })).toBeInTheDocument();
  });

  it("opens a selected card from the dashboard tile", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View Visa Rewards" }));

    const detail = screen.getByRole("region", { name: "Visa Rewards" });
    expect(within(detail).getByText("Northlake Bank")).toBeInTheDocument();
    expect(within(detail).getByText("Payment — Thank you")).toBeInTheDocument();
  });

  it("returns to the existing dashboard from cards", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cards" }));
    await user.click(screen.getByRole("button", { name: "Dashboard" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
  });

  it("opens the transactions experience from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Transactions" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Transaction list" })).toBeInTheDocument();
  });

  it("opens a selected transaction from the dashboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "View Payroll — Acme Corp" }),
    );

    const detail = screen.getByRole("region", { name: "Payroll — Acme Corp" });
    expect(within(detail).getByText("Income")).toBeInTheDocument();
    expect(within(detail).getByText("Everyday Checking")).toBeInTheDocument();
  });

  it("opens a card transaction in the transactions experience", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View Visa Rewards" }));
    await user.click(
      screen.getByRole("button", { name: "View Dinner — Riverview" }),
    );

    const detail = screen.getByRole("region", { name: "Dinner — Riverview" });
    expect(within(detail).getByText("Card purchase")).toBeInTheDocument();
    expect(within(detail).getByText("Visa Rewards")).toBeInTheDocument();
  });
});

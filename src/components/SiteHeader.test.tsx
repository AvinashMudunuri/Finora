import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_NAV_MEDIA_QUERY, PRIMARY_NAVIGATION } from "../navigation/primary.ts";
import { SiteHeader } from "./SiteHeader.tsx";

function mockNavPresentation(isMobile: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === MOBILE_NAV_MEDIA_QUERY ? isMobile : !isMobile,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function renderHeader(
  current: "dashboard" | "accounts" | "cards" | "transactions" | "spending" | "insights" = "dashboard",
) {
  const onShowDashboard = vi.fn();
  const onShowAccounts = vi.fn();
  const onShowCards = vi.fn();
  const onShowTransactions = vi.fn();
  const onShowSpending = vi.fn();
  const onShowInsights = vi.fn();

  render(
    <SiteHeader
      current={current}
      onShowDashboard={onShowDashboard}
      onShowAccounts={onShowAccounts}
      onShowCards={onShowCards}
      onShowTransactions={onShowTransactions}
      onShowSpending={onShowSpending}
      onShowInsights={onShowInsights}
    />,
  );

  return {
    onShowDashboard,
    onShowAccounts,
    onShowCards,
    onShowTransactions,
    onShowSpending,
    onShowInsights,
  };
}

describe("SiteHeader desktop", () => {
  it("renders the six primary destinations from the shared configuration", () => {
    mockNavPresentation(false);
    renderHeader();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getAllByRole("button").map((button) => button.textContent),
    ).toEqual(PRIMARY_NAVIGATION.map((item) => item.label));
    expect(screen.getByText("Your financial life, clearly connected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Finora" }).getAttribute("src")).toBe(
      "/brand/finora-wordmark.png",
    );
  });

  it("marks the current destination without only relying on a class", () => {
    mockNavPresentation(false);
    renderHeader("cards");

    expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("SiteHeader mobile", () => {
  it("uses a compact header without the tagline or inline destinations", () => {
    mockNavPresentation(true);
    renderHeader();

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(
      screen.queryByText("Your financial life, clearly connected"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(document.querySelector(".brand-mark")?.getAttribute("src")).toBe(
      "/brand/finora-f-mark.png",
    );
  });

  it("opens the shared destinations and marks the active route", async () => {
    mockNavPresentation(true);
    const user = userEvent.setup();
    renderHeader("spending");

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getAllByRole("button").map((button) => button.textContent),
    ).toEqual(PRIMARY_NAVIGATION.map((item) => item.label));
    expect(within(nav).getByRole("button", { name: "Spending" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("button", { name: "Spending" })).toHaveClass(
      "is-active",
    );
  });

  it("closes on destination select, Close, Escape, and backdrop", async () => {
    mockNavPresentation(true);
    const user = userEvent.setup();
    const handlers = renderHeader();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("button", { name: "Accounts" }));
    expect(handlers.onShowAccounts).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = document.querySelector("dialog");
    expect(dialog).not.toBeNull();
    await user.click(dialog!);
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
  });
});

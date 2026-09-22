import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary.tsx";

function BrokenView(): React.ReactElement {
  throw new Error("render failed");
}

describe("AppErrorBoundary", () => {
  it("shows a reload path instead of an empty page when rendering fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "Finora could not display this page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByText(/Stored financial records were not changed/)).toBeInTheDocument();

    spy.mockRestore();
  });
});

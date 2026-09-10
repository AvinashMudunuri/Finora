import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinoraLogo } from "./FinoraLogo.tsx";

describe("FinoraLogo", () => {
  it("exposes the Finora name from the full wordmark", () => {
    render(<FinoraLogo />);
    expect(screen.getByText("Finora")).toBeInTheDocument();
    expect(document.querySelector(".brand-wordmark")?.getAttribute("src")).toBe(
      "/brand/finora-wordmark.png",
    );
    expect(document.querySelector(".brand-lockup.is-compact")).toBeNull();
  });

  it("keeps the compact mark derived from the same brand lockup", () => {
    render(<FinoraLogo variant="mark" />);
    expect(screen.getByText("Finora")).toBeInTheDocument();
    expect(document.querySelector(".brand-lockup.is-compact")).toBeTruthy();
    expect(document.querySelector(".brand-mark")?.getAttribute("src")).toBe(
      "/brand/finora-f-mark.png",
    );
  });
});

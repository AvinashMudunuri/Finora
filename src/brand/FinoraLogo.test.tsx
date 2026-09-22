import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinoraLogo } from "./FinoraLogo.tsx";

describe("FinoraLogo", () => {
  it("renders the full wordmark as a single image", () => {
    render(<FinoraLogo />);
    const wordmark = screen.getByRole("img", { name: "Finora" });
    expect(wordmark.getAttribute("src")).toBe("/brand/finora-wordmark.png");
    expect(document.querySelector(".brand-mark")).toBeNull();
  });

  it("reuses the approved F mark and wordmark when compact", () => {
    render(<FinoraLogo compact />);
    const wordmark = screen.getByRole("img", { name: "Finora" });
    expect(wordmark.getAttribute("src")).toBe("/brand/finora-wordmark.png");
    const mark = document.querySelector(".brand-mark");
    expect(mark?.getAttribute("src")).toBe("/brand/finora-f-mark.png");
    expect(mark?.getAttribute("alt")).toBe("");
  });
});

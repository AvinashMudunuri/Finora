import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { finoraWebManifest } from "./manifest.ts";

describe("Finora web app manifest", () => {
  it("includes the fields required for an installable PWA", () => {
    expect(finoraWebManifest.name).toBe("Finora");
    expect(finoraWebManifest.short_name).toBe("Finora");
    expect(finoraWebManifest.start_url).toBe("/");
    expect(finoraWebManifest.scope).toBe("/");
    expect(finoraWebManifest.display).toBe("standalone");
    expect(finoraWebManifest.theme_color).toBe("#1f5c45");
    expect(finoraWebManifest.background_color).toBe("#f3efe6");
    expect(finoraWebManifest.icons.some((icon) => icon.sizes === "192x192")).toBe(
      true,
    );
    expect(finoraWebManifest.icons.some((icon) => icon.sizes === "512x512")).toBe(
      true,
    );
  });

  it("points at PNG icons that exist in public/", () => {
    for (const icon of finoraWebManifest.icons) {
      expect(existsSync(resolve("public", icon.src))).toBe(true);
    }
  });

  it("exposes theme color and an Apple touch icon in the document head", () => {
    const html = readFileSync(resolve("index.html"), "utf8");

    expect(html).toContain('name="theme-color"');
    expect(html).toContain(finoraWebManifest.theme_color);
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain("/apple-touch-icon.png");
  });
});

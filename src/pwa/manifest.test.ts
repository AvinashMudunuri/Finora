import { describe, expect, it } from "vitest";
import { finoraWebManifest } from "./manifest.ts";

describe("Finora web app manifest", () => {
  it("includes the fields required for an installable PWA", () => {
    expect(finoraWebManifest.name).toBe("Finora");
    expect(finoraWebManifest.short_name).toBe("Finora");
    expect(finoraWebManifest.start_url).toBe("/");
    expect(finoraWebManifest.scope).toBe("/");
    expect(finoraWebManifest.display).toBe("standalone");
    expect(finoraWebManifest.theme_color).toBe("#0B1B34");
    expect(finoraWebManifest.background_color).toBe("#FFFFFF");
    expect(
      finoraWebManifest.icons.some((icon) => icon.sizes === "192x192"),
    ).toBe(true);
    expect(
      finoraWebManifest.icons.some((icon) => icon.sizes === "512x512"),
    ).toBe(true);
  });

  it("uses PNG icons with installable sizes", () => {
    expect(finoraWebManifest.icons.map((icon) => icon.src)).toEqual([
      "finora-icon-192.png",
      "finora-icon-512.png",
      "finora-maskable-512.png",
    ]);
    expect(
      finoraWebManifest.icons.every((icon) => icon.type === "image/png"),
    ).toBe(true);
  });
});

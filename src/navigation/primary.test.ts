import { describe, expect, it } from "vitest";
import { MOBILE_NAV_MEDIA_QUERY, PRIMARY_NAVIGATION } from "./primary.ts";

describe("primary navigation", () => {
  it("is the single ordered list of Finora destinations", () => {
    expect(PRIMARY_NAVIGATION.map((item) => item.label)).toEqual([
      "Dashboard",
      "Accounts",
      "Cards",
      "Transactions",
      "Spending",
      "Insights",
    ]);
    expect(MOBILE_NAV_MEDIA_QUERY).toBe("(max-width: 719px)");
  });
});

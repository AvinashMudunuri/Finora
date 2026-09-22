export const PRIMARY_NAVIGATION = [
  { view: "dashboard", label: "Dashboard" },
  { view: "accounts", label: "Accounts" },
  { view: "cards", label: "Cards" },
  { view: "transactions", label: "Transactions" },
  { view: "spending", label: "Spending" },
  { view: "insights", label: "Insights" },
] as const;

export type AppView = (typeof PRIMARY_NAVIGATION)[number]["view"];

/** Matches existing stylesheet: mobile below 720px, desktop from 720px. */
export const MOBILE_NAV_MEDIA_QUERY = "(max-width: 719px)";

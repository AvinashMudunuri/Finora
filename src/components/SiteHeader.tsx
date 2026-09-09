export type AppView =
  | "dashboard"
  | "accounts"
  | "cards"
  | "transactions"
  | "spending"
  | "insights";

type SiteHeaderProps = {
  current: AppView;
  onShowDashboard: () => void;
  onShowAccounts?: () => void;
  onShowCards: () => void;
  onShowTransactions: () => void;
  onShowSpending?: () => void;
  onShowInsights?: () => void;
};

export function SiteHeader({
  current,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onShowInsights,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="brand">
        <p className="brand-name">Finora</p>
        <p className="brand-tagline">Your financial life, clearly connected</p>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <button
          type="button"
          className={
            current === "dashboard" ? "filter-chip is-active" : "filter-chip"
          }
          aria-current={current === "dashboard" ? "page" : undefined}
          onClick={onShowDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={
            current === "accounts" ? "filter-chip is-active" : "filter-chip"
          }
          aria-current={current === "accounts" ? "page" : undefined}
          onClick={() => {
            onShowAccounts?.();
          }}
        >
          Accounts
        </button>
        <button
          type="button"
          className={current === "cards" ? "filter-chip is-active" : "filter-chip"}
          aria-current={current === "cards" ? "page" : undefined}
          onClick={onShowCards}
        >
          Cards
        </button>
        <button
          type="button"
          className={
            current === "transactions" ? "filter-chip is-active" : "filter-chip"
          }
          aria-current={current === "transactions" ? "page" : undefined}
          onClick={onShowTransactions}
        >
          Transactions
        </button>
        <button
          type="button"
          className={
            current === "spending" ? "filter-chip is-active" : "filter-chip"
          }
          aria-current={current === "spending" ? "page" : undefined}
          onClick={() => {
            onShowSpending?.();
          }}
        >
          Spending
        </button>
        <button
          type="button"
          className={
            current === "insights" ? "filter-chip is-active" : "filter-chip"
          }
          aria-current={current === "insights" ? "page" : undefined}
          onClick={() => {
            onShowInsights?.();
          }}
        >
          Insights
        </button>
      </nav>
    </header>
  );
}

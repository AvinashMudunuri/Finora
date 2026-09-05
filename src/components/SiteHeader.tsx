type SiteHeaderProps = {
  current: "dashboard" | "cards";
  onShowDashboard: () => void;
  onShowCards: () => void;
};

export function SiteHeader({
  current,
  onShowDashboard,
  onShowCards,
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
          className={current === "cards" ? "filter-chip is-active" : "filter-chip"}
          aria-current={current === "cards" ? "page" : undefined}
          onClick={onShowCards}
        >
          Cards
        </button>
      </nav>
    </header>
  );
}

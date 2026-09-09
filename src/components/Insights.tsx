import { AttentionInsights } from "./AttentionInsights.tsx";
import type { Account, Card, Transaction } from "../domain/types.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type InsightsProps = {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onShowDashboard?: () => void;
  onShowAccounts?: () => void;
  onShowCards?: () => void;
  onShowTransactions?: () => void;
  onShowSpending?: () => void;
  onOpenCard?: (cardId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
};

export function Insights({
  accounts,
  cards,
  transactions,
  onShowDashboard,
  onShowAccounts,
  onShowCards,
  onShowTransactions,
  onShowSpending,
  onOpenCard,
  onOpenTransaction,
}: InsightsProps) {
  return (
    <div className="app-shell">
      <SiteHeader
        current="insights"
        onShowDashboard={() => {
          onShowDashboard?.();
        }}
        onShowAccounts={() => {
          onShowAccounts?.();
        }}
        onShowCards={() => {
          onShowCards?.();
        }}
        onShowTransactions={() => {
          onShowTransactions?.();
        }}
        onShowSpending={() => {
          onShowSpending?.();
        }}
        onShowInsights={() => undefined}
      />

      <main className="page">
        <div className="page-intro">
          <h1>Insights</h1>
          <p className="page-lede">
            What deserves attention from stored records, with the evidence and
            the next inspection. No recommendations are invented.
          </p>
        </div>

        <section className="panel" aria-labelledby="attention-heading">
          <div className="panel-header">
            <h2 id="attention-heading">Attention</h2>
            <p className="panel-copy">
              Ordered by stored payment risk, utilization, then meaningful
              monthly change.
            </p>
          </div>
          <AttentionInsights
            accounts={accounts}
            cards={cards}
            transactions={transactions}
            onOpenCard={onOpenCard}
            onOpenTransaction={onOpenTransaction}
            onShowSpending={onShowSpending}
            onShowDashboard={onShowDashboard}
          />
        </section>
      </main>
    </div>
  );
}

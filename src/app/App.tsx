import { useState } from "react";
import { Cards } from "../components/Cards.tsx";
import { Dashboard } from "../components/Dashboard.tsx";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";

export default function App() {
  const [view, setView] = useState<"dashboard" | "cards">("dashboard");
  const [selectedCardId, setSelectedCardId] = useState(
    fixtureCards[0]?.id ?? "",
  );

  if (view === "cards") {
    return (
      <Cards
        cards={fixtureCards}
        transactions={fixtureTransactions}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
        onShowDashboard={() => {
          setView("dashboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      accounts={fixtureAccounts}
      cards={fixtureCards}
      transactions={fixtureTransactions}
      onShowCards={() => {
        setView("cards");
      }}
      onOpenCard={(cardId) => {
        setSelectedCardId(cardId);
        setView("cards");
      }}
    />
  );
}

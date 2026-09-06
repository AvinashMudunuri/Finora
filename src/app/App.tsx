import { useState } from "react";
import { Cards } from "../components/Cards.tsx";
import { Dashboard } from "../components/Dashboard.tsx";
import { Spending } from "../components/Spending.tsx";
import { Transactions } from "../components/Transactions.tsx";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";

type AppView = "dashboard" | "cards" | "transactions" | "spending";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedCardId, setSelectedCardId] = useState(
    fixtureCards[0]?.id ?? "",
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    fixtureTransactions[0]?.id ?? "",
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
        onShowTransactions={() => {
          setView("transactions");
        }}
        onShowSpending={() => {
          setView("spending");
        }}
        onOpenTransaction={(transactionId) => {
          setSelectedTransactionId(transactionId);
          setView("transactions");
        }}
      />
    );
  }

  if (view === "transactions") {
    return (
      <Transactions
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        selectedTransactionId={selectedTransactionId}
        onSelectTransaction={setSelectedTransactionId}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowCards={() => {
          setView("cards");
        }}
        onShowSpending={() => {
          setView("spending");
        }}
      />
    );
  }

  if (view === "spending") {
    return (
      <Spending
        accounts={fixtureAccounts}
        cards={fixtureCards}
        transactions={fixtureTransactions}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowCards={() => {
          setView("cards");
        }}
        onShowTransactions={() => {
          setView("transactions");
        }}
        onOpenTransaction={(transactionId) => {
          setSelectedTransactionId(transactionId);
          setView("transactions");
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
      onShowTransactions={() => {
        setView("transactions");
      }}
      onShowSpending={() => {
        setView("spending");
      }}
      onOpenCard={(cardId) => {
        setSelectedCardId(cardId);
        setView("cards");
      }}
      onOpenTransaction={(transactionId) => {
        setSelectedTransactionId(transactionId);
        setView("transactions");
      }}
    />
  );
}

import { useState } from "react";
import { Accounts } from "../components/Accounts.tsx";
import { Cards } from "../components/Cards.tsx";
import { Dashboard } from "../components/Dashboard.tsx";
import { Spending } from "../components/Spending.tsx";
import { Transactions } from "../components/Transactions.tsx";
import {
  fixtureAccounts,
  fixtureTransactions,
  loadAppCards,
} from "../data/fixtures.ts";

const appCards = loadAppCards();

type AppView = "dashboard" | "accounts" | "cards" | "transactions" | "spending";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedAccountId, setSelectedAccountId] = useState(
    fixtureAccounts[0]?.id ?? "",
  );
  const [selectedCardId, setSelectedCardId] = useState(
    appCards[0]?.id ?? "",
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    fixtureTransactions[0]?.id ?? "",
  );

  if (view === "accounts") {
    return (
      <Accounts
        accounts={fixtureAccounts}
        cards={appCards}
        transactions={fixtureTransactions}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowCards={() => {
          setView("cards");
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

  if (view === "cards") {
    return (
      <Cards
        cards={appCards}
        transactions={fixtureTransactions}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowAccounts={() => {
          setView("accounts");
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
        cards={appCards}
        transactions={fixtureTransactions}
        selectedTransactionId={selectedTransactionId}
        onSelectTransaction={setSelectedTransactionId}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowAccounts={() => {
          setView("accounts");
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
        cards={appCards}
        transactions={fixtureTransactions}
        onShowDashboard={() => {
          setView("dashboard");
        }}
        onShowAccounts={() => {
          setView("accounts");
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
      cards={appCards}
      transactions={fixtureTransactions}
      onShowAccounts={() => {
        setView("accounts");
      }}
      onShowCards={() => {
        setView("cards");
      }}
      onShowTransactions={() => {
        setView("transactions");
      }}
      onShowSpending={() => {
        setView("spending");
      }}
      onOpenAccount={(accountId) => {
        setSelectedAccountId(accountId);
        setView("accounts");
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

import { useState } from "react";
import { Accounts } from "../components/Accounts.tsx";
import { Cards } from "../components/Cards.tsx";
import { Dashboard } from "../components/Dashboard.tsx";
import { Insights } from "../components/Insights.tsx";
import { Spending } from "../components/Spending.tsx";
import { Transactions } from "../components/Transactions.tsx";
import {
  fixtureAccounts,
  loadAppCards,
  loadAppTransactions,
} from "../data/fixtures.ts";

const appCards = loadAppCards();
const appTransactions = loadAppTransactions();

type AppView =
  | "dashboard"
  | "accounts"
  | "cards"
  | "transactions"
  | "spending"
  | "insights";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedAccountId, setSelectedAccountId] = useState(
    fixtureAccounts[0]?.id ?? "",
  );
  const [selectedCardId, setSelectedCardId] = useState(appCards[0]?.id ?? "");
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    appTransactions[0]?.id ?? "",
  );

  const openInsights = () => {
    setView("insights");
  };

  if (view === "accounts") {
    return (
      <Accounts
        accounts={fixtureAccounts}
        cards={appCards}
        transactions={appTransactions}
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
        onShowInsights={openInsights}
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
        transactions={appTransactions}
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
        onShowInsights={openInsights}
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
        transactions={appTransactions}
        selectedTransactionId={selectedTransactionId}
        onSelectTransaction={setSelectedTransactionId}
        onOpenAccount={(accountId) => {
          setSelectedAccountId(accountId);
          setView("accounts");
        }}
        onOpenCard={(cardId) => {
          setSelectedCardId(cardId);
          setView("cards");
        }}
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
        onShowInsights={openInsights}
      />
    );
  }

  if (view === "spending") {
    return (
      <Spending
        accounts={fixtureAccounts}
        cards={appCards}
        transactions={appTransactions}
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
        onShowInsights={openInsights}
        onOpenTransaction={(transactionId) => {
          setSelectedTransactionId(transactionId);
          setView("transactions");
        }}
      />
    );
  }

  if (view === "insights") {
    return (
      <Insights
        accounts={fixtureAccounts}
        cards={appCards}
        transactions={appTransactions}
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

  return (
    <Dashboard
      accounts={fixtureAccounts}
      cards={appCards}
      transactions={appTransactions}
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
      onShowInsights={openInsights}
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

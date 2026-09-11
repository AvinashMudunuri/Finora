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
  loadManagedLedger,
  saveManagedLedger,
  usesManagedLedger,
  type ManagedLedgerSnapshot,
} from "../data/fixtures.ts";
import type { Account, AccountDraft, Card, CardDraft } from "../domain/types.ts";
import {
  createAccount,
  createCard,
  updateAccount,
  updateCard,
  type EntityMutationResult,
} from "../domain/validate.ts";

const appCards = loadAppCards();
const appTransactions = loadAppTransactions();

function managedStorage(): Storage | null {
  if (!usesManagedLedger() || typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function initialLedger(): ManagedLedgerSnapshot {
  return loadManagedLedger(appTransactions, managedStorage(), {
    accounts: fixtureAccounts,
    cards: appCards,
  });
}

type AppView =
  | "dashboard"
  | "accounts"
  | "cards"
  | "transactions"
  | "spending"
  | "insights";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [ledger, setLedger] = useState<ManagedLedgerSnapshot>(initialLedger);
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => initialLedger().accounts[0]?.id ?? "",
  );
  const [selectedCardId, setSelectedCardId] = useState(
    () => initialLedger().cards[0]?.id ?? "",
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    appTransactions[0]?.id ?? "",
  );

  const accounts = ledger.accounts;
  const cards = ledger.cards;

  const persist = (next: ManagedLedgerSnapshot): EntityMutationResult<true> => {
    try {
      saveManagedLedger(managedStorage(), next, appTransactions);
    } catch (error) {
      return {
        ok: false,
        errors: {
          form:
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : "The change would produce an invalid financial model.",
        },
      };
    }

    setLedger(next);
    return { ok: true, value: true };
  };

  const handleCreateAccount = (
    draft: AccountDraft,
  ): EntityMutationResult<Account> => {
    const created = createAccount(draft, accounts);
    if (!created.ok) {
      return created;
    }

    const saved = persist({
      accounts: [...accounts, created.value],
      cards,
    });
    if (!saved.ok) {
      return saved;
    }

    setSelectedAccountId(created.value.id);
    return created;
  };

  const handleUpdateAccount = (
    id: string,
    draft: AccountDraft,
  ): EntityMutationResult<Account> => {
    const updated = updateAccount(id, draft, accounts, appTransactions, cards);
    if (!updated.ok) {
      return updated;
    }

    const saved = persist({
      accounts: accounts.map((account) =>
        account.id === id ? updated.value : account,
      ),
      cards,
    });
    if (!saved.ok) {
      return saved;
    }

    return updated;
  };

  const handleCreateCard = (draft: CardDraft): EntityMutationResult<Card> => {
    const created = createCard(draft, cards);
    if (!created.ok) {
      return created;
    }

    const saved = persist({
      accounts,
      cards: [...cards, created.value],
    });
    if (!saved.ok) {
      return saved;
    }

    setSelectedCardId(created.value.id);
    return created;
  };

  const handleUpdateCard = (
    id: string,
    draft: CardDraft,
  ): EntityMutationResult<Card> => {
    const updated = updateCard(id, draft, cards, appTransactions, accounts);
    if (!updated.ok) {
      return updated;
    }

    const saved = persist({
      accounts,
      cards: cards.map((card) => (card.id === id ? updated.value : card)),
    });
    if (!saved.ok) {
      return saved;
    }

    return updated;
  };

  const openInsights = () => {
    setView("insights");
  };

  if (view === "accounts") {
    return (
      <Accounts
        accounts={accounts}
        cards={cards}
        transactions={appTransactions}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onCreateAccount={handleCreateAccount}
        onUpdateAccount={handleUpdateAccount}
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
        cards={cards}
        transactions={appTransactions}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
        onCreateCard={handleCreateCard}
        onUpdateCard={handleUpdateCard}
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
        accounts={accounts}
        cards={cards}
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
        accounts={accounts}
        cards={cards}
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
        accounts={accounts}
        cards={cards}
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
      accounts={accounts}
      cards={cards}
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

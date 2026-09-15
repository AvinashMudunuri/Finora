import { useEffect, useState } from "react";
import { readAccountBootstrap } from "../application/accounts/readBootstrap.ts";
import {
  ACCOUNT_UNAVAILABLE_MESSAGE,
  type AccountGateway,
} from "../application/accounts/contract.ts";
import {
  ACCOUNT_BACKEND_MIGRATED_KEY,
  migrateLocalAccounts,
} from "../application/accounts/migration.ts";
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
  loadManagedCards,
  loadManagedLedger,
  peekManagedLedgerAccounts,
  retireManagedLedgerAccounts,
  saveManagedCards,
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

export type AppProps = {
  accountGateway?: AccountGateway;
};

function managedStorage(): Storage | null {
  if (!usesManagedLedger() || typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function initialLocalLedger(): ManagedLedgerSnapshot {
  return loadManagedLedger(appTransactions, managedStorage(), {
    accounts: fixtureAccounts,
    cards: appCards,
  });
}

function initialCards(): Card[] {
  return loadManagedCards(
    appTransactions,
    fixtureAccounts,
    managedStorage(),
    appCards,
  );
}

type AppView =
  | "dashboard"
  | "accounts"
  | "cards"
  | "transactions"
  | "spending"
  | "insights";

export default function App({ accountGateway }: AppProps) {
  const [view, setView] = useState<AppView>("dashboard");
  const [accounts, setAccounts] = useState<Account[]>(() =>
    accountGateway
      ? (readAccountBootstrap() ?? fixtureAccounts)
      : initialLocalLedger().accounts,
  );
  const [cards, setCards] = useState<Card[]>(() =>
    accountGateway ? initialCards() : initialLocalLedger().cards,
  );
  const [accountLoadError, setAccountLoadError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => accounts[0]?.id ?? "",
  );
  const [selectedCardId, setSelectedCardId] = useState(
    () => cards[0]?.id ?? "",
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    appTransactions[0]?.id ?? "",
  );

  useEffect(() => {
    if (!accountGateway || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const storage = window.localStorage;
        const alreadyMigrated = storage.getItem(ACCOUNT_BACKEND_MIGRATED_KEY) === "1";
        const backendAccounts = await accountGateway.list();
        const local = alreadyMigrated
          ? null
          : peekManagedLedgerAccounts(storage, appTransactions);
        const nextAccounts = alreadyMigrated
          ? backendAccounts
          : await migrateLocalAccounts(accountGateway, {
              backend: backendAccounts,
              local,
              fixtures: fixtureAccounts,
            });

        if (!alreadyMigrated) {
          const nextCards = loadManagedCards(
            appTransactions,
            fixtureAccounts,
            storage,
            appCards,
          );
          saveManagedCards(
            storage,
            nextCards,
            appTransactions,
            fixtureAccounts,
          );
          retireManagedLedgerAccounts(storage);
          storage.setItem(ACCOUNT_BACKEND_MIGRATED_KEY, "1");
          if (!cancelled) {
            setCards(nextCards);
          }
        }

        if (!cancelled) {
          setAccounts(nextAccounts);
          setAccountLoadError("");
          setSelectedAccountId((current) =>
            nextAccounts.some((account) => account.id === current)
              ? current
              : (nextAccounts[0]?.id ?? ""),
          );
        }
      } catch {
        if (!cancelled) {
          setAccountLoadError(ACCOUNT_UNAVAILABLE_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountGateway]);

  const persistLocalLedger = (
    next: ManagedLedgerSnapshot,
  ): EntityMutationResult<true> => {
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

    setAccounts(next.accounts);
    setCards(next.cards);
    return { ok: true, value: true };
  };

  const persistCards = (nextCards: Card[]): EntityMutationResult<true> => {
    try {
      saveManagedCards(
        managedStorage(),
        nextCards,
        appTransactions,
        fixtureAccounts,
      );
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

    setCards(nextCards);
    return { ok: true, value: true };
  };

  const handleCreateAccount = async (
    draft: AccountDraft,
  ): Promise<EntityMutationResult<Account>> => {
    if (accountGateway) {
      const created = await accountGateway.create(draft);
      if (!created.ok) {
        return created;
      }
      setAccounts((current) => [...current, created.value]);
      setSelectedAccountId(created.value.id);
      return created;
    }

    const created = createAccount(draft, accounts);
    if (!created.ok) {
      return created;
    }

    const saved = persistLocalLedger({
      accounts: [...accounts, created.value],
      cards,
    });
    if (!saved.ok) {
      return saved;
    }

    setSelectedAccountId(created.value.id);
    return created;
  };

  const handleUpdateAccount = async (
    id: string,
    draft: AccountDraft,
  ): Promise<EntityMutationResult<Account>> => {
    if (accountGateway) {
      const updated = await accountGateway.update(id, draft);
      if (!updated.ok) {
        return updated;
      }
      setAccounts((current) =>
        current.map((account) => (account.id === id ? updated.value : account)),
      );
      return updated;
    }

    const updated = updateAccount(id, draft, accounts, appTransactions, cards);
    if (!updated.ok) {
      return updated;
    }

    const saved = persistLocalLedger({
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

    const saved = accountGateway
      ? persistCards([...cards, created.value])
      : persistLocalLedger({
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

    const saved = accountGateway
      ? persistCards(
          cards.map((card) => (card.id === id ? updated.value : card)),
        )
      : persistLocalLedger({
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

  const systemNotice = accountLoadError;

  if (view === "accounts") {
    return (
      <Accounts
        accounts={accounts}
        cards={cards}
        transactions={appTransactions}
        selectedAccountId={selectedAccountId}
        systemNotice={systemNotice}
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
        systemNotice={systemNotice}
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
        systemNotice={systemNotice}
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
        systemNotice={systemNotice}
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
        systemNotice={systemNotice}
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
      systemNotice={systemNotice}
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

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
import { readCardBootstrap } from "../application/cards/readBootstrap.ts";
import {
  CARD_UNAVAILABLE_MESSAGE,
  type CardGateway,
} from "../application/cards/contract.ts";
import {
  CARD_BACKEND_MIGRATED_KEY,
  migrateLocalCards,
} from "../application/cards/migration.ts";
import { readTransactionBootstrap } from "../application/transactions/readBootstrap.ts";
import {
  TRANSACTION_UNAVAILABLE_MESSAGE,
  type TransactionGateway,
} from "../application/transactions/contract.ts";
import { Accounts } from "../components/Accounts.tsx";
import { Cards } from "../components/Cards.tsx";
import { Dashboard } from "../components/Dashboard.tsx";
import { Insights } from "../components/Insights.tsx";
import { Spending } from "../components/Spending.tsx";
import { Transactions } from "../components/Transactions.tsx";
import type { AppView } from "../navigation/primary.ts";
import {
  fixtureAccounts,
  fixtureCards,
  loadAppCards,
  loadAppTransactions,
  loadManagedCards,
  loadManagedLedger,
  peekManagedCards,
  peekManagedLedgerAccounts,
  retireManagedCards,
  retireManagedLedgerAccounts,
  saveManagedCards,
  saveManagedLedger,
  usesManagedLedger,
  type ManagedLedgerSnapshot,
} from "../data/fixtures.ts";
import type {
  Account,
  AccountDraft,
  Card,
  CardDraft,
  Transaction,
} from "../domain/types.ts";
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
  cardGateway?: CardGateway;
  transactionGateway?: TransactionGateway;
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

export default function App({
  accountGateway,
  cardGateway,
  transactionGateway,
}: AppProps) {
  const [view, setView] = useState<AppView>("dashboard");
  const [accounts, setAccounts] = useState<Account[]>(() =>
    accountGateway
      ? (readAccountBootstrap() ?? fixtureAccounts)
      : initialLocalLedger().accounts,
  );
  const [cards, setCards] = useState<Card[]>(() =>
    cardGateway
      ? (readCardBootstrap() ?? appCards)
      : accountGateway
        ? initialCards()
        : initialLocalLedger().cards,
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    transactionGateway
      ? (readTransactionBootstrap() ?? appTransactions)
      : appTransactions,
  );
  const [accountLoadError, setAccountLoadError] = useState("");
  const [cardLoadError, setCardLoadError] = useState("");
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => accounts[0]?.id ?? "",
  );
  const [selectedCardId, setSelectedCardId] = useState(
    () => cards[0]?.id ?? "",
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState(
    () => transactions[0]?.id ?? "",
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
          if (!cardGateway) {
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
            if (!cancelled) {
              setCards(nextCards);
            }
          } else if (storage.getItem(CARD_BACKEND_MIGRATED_KEY) !== "1") {
            const leftoverCards = peekManagedCards(
              storage,
              appTransactions,
              fixtureAccounts,
            );
            if (leftoverCards && leftoverCards.length > 0) {
              saveManagedCards(
                storage,
                leftoverCards,
                appTransactions,
                fixtureAccounts,
              );
            }
          }
          retireManagedLedgerAccounts(storage);
          storage.setItem(ACCOUNT_BACKEND_MIGRATED_KEY, "1");
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
  }, [accountGateway, cardGateway]);

  useEffect(() => {
    if (!cardGateway || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const storage = window.localStorage;
        const alreadyMigrated = storage.getItem(CARD_BACKEND_MIGRATED_KEY) === "1";
        const backendCards = await cardGateway.list();
        const local = alreadyMigrated
          ? null
          : peekManagedCards(storage, appTransactions, fixtureAccounts);
        const nextCards = alreadyMigrated
          ? backendCards
          : await migrateLocalCards(cardGateway, {
              backend: backendCards,
              local,
              fixtures: fixtureCards,
            });

        if (!alreadyMigrated) {
          retireManagedCards(storage);
          storage.setItem(CARD_BACKEND_MIGRATED_KEY, "1");
        }

        if (!cancelled) {
          setCards(nextCards);
          setCardLoadError("");
          setSelectedCardId((current) =>
            nextCards.some((card) => card.id === current)
              ? current
              : (nextCards[0]?.id ?? ""),
          );
        }
      } catch {
        if (!cancelled) {
          setCardLoadError(CARD_UNAVAILABLE_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardGateway]);

  useEffect(() => {
    if (!transactionGateway || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextTransactions = await transactionGateway.list();
        if (!cancelled) {
          setTransactions(nextTransactions);
          setTransactionLoadError("");
          setSelectedTransactionId((current) =>
            nextTransactions.some((transaction) => transaction.id === current)
              ? current
              : (nextTransactions[0]?.id ?? ""),
          );
        }
      } catch {
        if (!cancelled) {
          setTransactionLoadError(TRANSACTION_UNAVAILABLE_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transactionGateway]);

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

  const persistRemoteCard = (
    operation: Promise<EntityMutationResult<Card>>,
    onSuccess: (card: Card) => void,
  ): void => {
    void operation.then((remote) => {
      if (!remote.ok) {
        setCardLoadError(remote.errors.form ?? CARD_UNAVAILABLE_MESSAGE);
        return;
      }
      onSuccess(remote.value);
    });
  };

  const persistRemoteAccount = (
    operation: Promise<EntityMutationResult<Account>>,
    onSuccess: (account: Account) => void,
  ): void => {
    void operation.then((remote) => {
      if (!remote.ok) {
        setAccountLoadError(
          remote.errors.form ?? ACCOUNT_UNAVAILABLE_MESSAGE,
        );
        return;
      }
      onSuccess(remote.value);
    });
  };

  const handleCreateAccount = (
    draft: AccountDraft,
  ): EntityMutationResult<Account> => {
    const created = createAccount(draft, accounts);
    if (!created.ok) {
      return created;
    }

    if (accountGateway) {
      persistRemoteAccount(accountGateway.create(draft), (account) => {
        setAccounts((current) => {
          if (current.some((item) => item.id === account.id)) {
            return current.map((item) =>
              item.id === account.id ? account : item,
            );
          }
          return [...current, account];
        });
        setSelectedAccountId(account.id);
      });
      setAccounts([...accounts, created.value]);
      setSelectedAccountId(created.value.id);
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

  const handleUpdateAccount = (
    id: string,
    draft: AccountDraft,
  ): EntityMutationResult<Account> => {
    const updated = updateAccount(id, draft, accounts, transactions, cards);
    if (!updated.ok) {
      return updated;
    }

    if (accountGateway) {
      persistRemoteAccount(accountGateway.update(id, draft), (account) => {
        setAccounts((current) =>
          current.map((item) => (item.id === id ? account : item)),
        );
      });
      setAccounts(
        accounts.map((account) => (account.id === id ? updated.value : account)),
      );
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

    if (cardGateway) {
      persistRemoteCard(cardGateway.create(draft), (card) => {
        setCards((current) => {
          if (current.some((item) => item.id === card.id)) {
            return current.map((item) => (item.id === card.id ? card : item));
          }
          return [...current, card];
        });
        setSelectedCardId(card.id);
      });
      setCards([...cards, created.value]);
      setSelectedCardId(created.value.id);
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
    const updated = updateCard(id, draft, cards, transactions, accounts);
    if (!updated.ok) {
      return updated;
    }

    if (cardGateway) {
      persistRemoteCard(cardGateway.update(id, draft), (card) => {
        setCards((current) =>
          current.map((item) => (item.id === id ? card : item)),
        );
      });
      setCards(cards.map((card) => (card.id === id ? updated.value : card)));
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

  const systemNotice = accountLoadError || cardLoadError || transactionLoadError;

  if (view === "accounts") {
    return (
      <Accounts
        accounts={accounts}
        cards={cards}
        transactions={transactions}
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
        transactions={transactions}
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
        transactions={transactions}
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
        transactions={transactions}
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
        transactions={transactions}
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
      transactions={transactions}
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

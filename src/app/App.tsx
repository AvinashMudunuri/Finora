import { Dashboard } from "../components/Dashboard.tsx";
import {
  fixtureAccounts,
  fixtureCards,
  fixtureTransactions,
} from "../data/fixtures.ts";

export default function App() {
  return (
    <Dashboard
      accounts={fixtureAccounts}
      cards={fixtureCards}
      transactions={fixtureTransactions}
    />
  );
}

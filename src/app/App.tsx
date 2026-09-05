import { Dashboard } from "../components/Dashboard.tsx";
import { fixtureAccounts, fixtureTransactions } from "../data/fixtures.ts";

export default function App() {
  return (
    <Dashboard
      accounts={fixtureAccounts}
      transactions={fixtureTransactions}
    />
  );
}

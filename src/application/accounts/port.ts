import type { Account } from "../../domain/types.ts";

export type AccountStore = {
  list(): Account[];
  write(accounts: readonly Account[]): void;
};

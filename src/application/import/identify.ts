import type { Account, Card } from "../../domain/types.ts";
import type { ExtractedStatement, ImportPartyKind } from "./types.ts";

export type IdentityDecision =
  | { kind: "account"; account: Account }
  | { kind: "card"; card: Card }
  | { kind: "create"; partyKind: ImportPartyKind }
  | { kind: "ambiguous"; accounts: Account[]; cards: Card[] };

export function identifyParty(
  statement: ExtractedStatement,
  accounts: readonly Account[],
  cards: readonly Card[],
): IdentityDecision {
  const partyKind = statement.partyKind;
  if (partyKind === "card" || (!partyKind && (statement.minimumPayment !== undefined || statement.paymentDueDate))) {
    const matches = cards.filter((card) => matchesCard(card, statement));
    if (matches.length === 1 && matches[0]) {
      return { kind: "card", card: matches[0] };
    }
    if (matches.length > 1) {
      return { kind: "ambiguous", accounts: [], cards: matches };
    }
    return { kind: "create", partyKind: "card" };
  }

  const matches = accounts.filter((account) => matchesAccount(account, statement));
  if (matches.length === 1 && matches[0]) {
    return { kind: "account", account: matches[0] };
  }
  if (matches.length > 1) {
    return { kind: "ambiguous", accounts: matches, cards: [] };
  }
  return { kind: "create", partyKind: partyKind ?? "account" };
}

function matchesAccount(account: Account, statement: ExtractedStatement): boolean {
  const tail = statement.maskedNumber?.replace(/\D/g, "");
  const name = statement.partyName?.toLowerCase();
  const byName = name ? account.name.toLowerCase().includes(name) || name.includes(account.name.toLowerCase()) : false;
  const byType = statement.accountType ? account.type === statement.accountType : true;
  return Boolean((byName || (tail && account.id.endsWith(tail))) && byType);
}

function matchesCard(card: Card, statement: ExtractedStatement): boolean {
  const name = statement.partyName?.toLowerCase();
  const institution = statement.institution?.toLowerCase();
  const byName = name
    ? card.name.toLowerCase().includes(name) || name.includes(card.name.toLowerCase())
    : false;
  const byIssuer = institution
    ? card.issuer.toLowerCase().includes(institution) || institution.includes(card.issuer.toLowerCase())
    : false;
  return byName || byIssuer;
}

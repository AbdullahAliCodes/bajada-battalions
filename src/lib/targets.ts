import { baseValue } from "@/lib/constants";
import type {
  AuctionState,
  Player,
  TargetBracket,
  TargetKind,
  TargetStatus,
} from "@/types/auction";

const LOWER_BRACKET_SORT = 1_000;
const UNSET_BRACKET_SORT = 2_000;

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const NAME_ALIASES: Record<string, string[]> = {
  "salmaan beg": ["saloobeg"],
  "saloobeg": ["salmaan beg"],
};

function aliasKeys(name: string): string[] {
  const key = normalizeName(name);
  return [key, ...(NAME_ALIASES[key] ?? [])];
}

function tokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((token) => token.length > 2);
}

export function identityMatch(left: string, right: string): boolean {
  const leftKeys = new Set(aliasKeys(left));
  const rightKeys = new Set(aliasKeys(right));
  return [...leftKeys].some((key) => rightKeys.has(key));
}

export function namesMatch(left: string, right: string): boolean {
  if (identityMatch(left, right)) return true;

  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  return shared.length >= 2;
}

export function findPlayer(players: Player[], name: string): Player | undefined {
  return (
    players.find((player) => identityMatch(player.name, name)) ??
    players.find((player) => namesMatch(player.name, name))
  );
}

// Wishlist order is stored in players.target_sort: 0–999 upper, 1000–1999 lower, 2000+ unset.
export function wishlistSort(index: number, bracket: TargetBracket | undefined): number {
  if (bracket === "lower") return LOWER_BRACKET_SORT + index;
  if (bracket === "upper") return index;
  return UNSET_BRACKET_SORT + index;
}

export function bracketFromWishlistSort(
  sort: number | null | undefined,
): TargetBracket | undefined {
  if (sort == null || sort >= UNSET_BRACKET_SORT) return undefined;
  if (sort >= LOWER_BRACKET_SORT) return "lower";
  return "upper";
}

export function lookupBracket(
  name: string,
  brackets: Record<string, TargetBracket> | undefined,
): TargetBracket | undefined {
  if (!brackets) return undefined;
  const match = Object.entries(brackets).find(([key]) => identityMatch(key, name));
  return match?.[1];
}

export function bracketLabel(bracket: TargetBracket | undefined): string {
  if (bracket === "upper") return "Upper bracket";
  if (bracket === "lower") return "Lower bracket";
  return "Bracket not set";
}

export function targetStatus(name: string, state: AuctionState): TargetStatus {
  const userTeam = state.teams.find((team) => team.isUser);
  if (userTeam?.roster.some((player) => namesMatch(player.name, name))) {
    return "acquired";
  }
  if (state.teams.some((team) => !team.isUser && team.roster.some((player) => namesMatch(player.name, name)))) {
    return "lost";
  }
  if (state.soldPlayers.some((sold) => namesMatch(sold, name))) {
    return "lost";
  }
  return "pending";
}

export function pendingTargets(names: string[], state: AuctionState): string[] {
  return names.filter((name) => targetStatus(name, state) === "pending");
}

export function playerBaseValue(name: string, players: Player[]): number | null {
  const player = findPlayer(players, name);
  return player ? baseValue(player.level) : null;
}

export function listForPlayer(
  name: string,
  mustBuy: string[],
  wishlist: string[],
): TargetKind | null {
  if (mustBuy.some((item) => namesMatch(item, name))) return "must_buy";
  if (wishlist.some((item) => namesMatch(item, name))) return "wishlist";
  return null;
}

export function reservedMustBuyBudget(
  mustBuy: string[],
  state: AuctionState,
  players: Player[],
  excludeName?: string,
): { reserved: number; pending: string[]; missingLevels: string[] } {
  const pending = pendingTargets(mustBuy, state).filter(
    (name) => !excludeName || !namesMatch(name, excludeName),
  );
  const missingLevels: string[] = [];
  const reserved = pending.reduce((sum, name) => {
    const value = playerBaseValue(name, players);
    if (value == null) {
      missingLevels.push(name);
      return sum;
    }
    return sum + value;
  }, 0);
  return { reserved, pending, missingLevels };
}

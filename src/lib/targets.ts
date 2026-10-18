import { baseValue } from "@/lib/constants";
import type { AuctionState, Player, TargetKind, TargetStatus } from "@/types/auction";

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

export function namesMatch(left: string, right: string): boolean {
  const leftKeys = new Set(aliasKeys(left));
  const rightKeys = new Set(aliasKeys(right));
  if ([...leftKeys].some((key) => rightKeys.has(key))) return true;

  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  return shared.length >= 2;
}

export function findPlayer(players: Player[], name: string): Player | undefined {
  return players.find((player) => namesMatch(player.name, name));
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

export const TOTAL_BUDGET = 650_000;
export const ROSTER_SIZE = 12;
export const AUCTION_SPOTS = 7;
export const BASE_PRICE_MULTIPLIER = 10_000;
export const USER_TEAM_ID = "bajada-batallions";
export const USER_TEAM_NAME = "Bajada Batallions";

export function baseValue(level: number): number {
  return Math.round(level * BASE_PRICE_MULTIPLIER);
}

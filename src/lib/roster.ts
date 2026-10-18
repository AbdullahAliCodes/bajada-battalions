import { ROSTER_SIZE, TOTAL_BUDGET } from "@/lib/constants";
import { namesMatch } from "@/lib/targets";
import type { AuctionState, PlayerSide, RosterPlayer, Team } from "@/types/auction";

export class RosterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterError";
  }
}

export function recomputeTeam(team: Team): Team {
  const spent = team.roster.reduce((sum, player) => sum + player.price, 0);
  return {
    ...team,
    spent,
    remaining: TOTAL_BUDGET - spent,
    spotsLeft: ROSTER_SIZE - team.roster.length,
  };
}

export function rosterOwner(
  state: AuctionState,
  name: string,
): { team: Team; player: RosterPlayer } | null {
  for (const team of state.teams) {
    const player = team.roster.find((item) => namesMatch(item.name, name));
    if (player) return { team, player };
  }
  return null;
}

export function isInPool(name: string, state: AuctionState): boolean {
  if (rosterOwner(state, name)) return false;
  return !(state.passedPlayers ?? []).some((passed) => namesMatch(passed, name));
}

export function assignRosterPlayer(
  state: AuctionState,
  teamId: string,
  player: { name: string; level?: number; side?: PlayerSide },
  price: number,
): AuctionState {
  if (!Number.isInteger(price) || price <= 0) {
    throw new RosterError("Enter a price above zero");
  }
  const owned = rosterOwner(state, player.name);
  if (owned) {
    throw new RosterError(`${player.name} is already on ${owned.team.name}`);
  }
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) throw new RosterError("Team not found");
  if (team.roster.length >= ROSTER_SIZE) {
    throw new RosterError(`${team.name} has no spots left`);
  }
  const spent = team.roster.reduce((sum, item) => sum + item.price, 0);
  if (spent + price > TOTAL_BUDGET) {
    throw new RosterError(`${team.name} cannot afford that`);
  }

  return {
    ...state,
    passedPlayers: (state.passedPlayers ?? []).filter((passed) => !namesMatch(passed, player.name)),
    soldPlayers: [
      ...state.soldPlayers.filter((sold) => !namesMatch(sold, player.name)),
      player.name,
    ],
    teams: state.teams.map((item) =>
      item.id === teamId
        ? recomputeTeam({
            ...item,
            roster: [
              ...item.roster,
              {
                name: player.name,
                level: player.level,
                price,
                retained: false,
                side: player.side,
              },
            ],
          })
        : item,
    ),
  };
}

export function passPlayer(state: AuctionState, name: string): AuctionState {
  const trimmed = name.trim();
  if (!trimmed) throw new RosterError("Player name is missing");
  const owned = rosterOwner(state, trimmed);
  if (owned) throw new RosterError(`${trimmed} is already on ${owned.team.name}`);
  if ((state.passedPlayers ?? []).some((passed) => namesMatch(passed, trimmed))) return state;
  return {
    ...state,
    passedPlayers: [...(state.passedPlayers ?? []), trimmed],
  };
}

export function restorePassedPlayer(state: AuctionState, name: string): AuctionState {
  return {
    ...state,
    passedPlayers: (state.passedPlayers ?? []).filter((passed) => !namesMatch(passed, name)),
  };
}

export function releaseRosterPlayer(
  state: AuctionState,
  teamId: string,
  name: string,
): AuctionState {
  return {
    ...state,
    soldPlayers: state.soldPlayers.filter((sold) => !namesMatch(sold, name)),
    passedPlayers: (state.passedPlayers ?? []).filter((passed) => !namesMatch(passed, name)),
    teams: state.teams.map((team) =>
      team.id === teamId
        ? recomputeTeam({
            ...team,
            roster: team.roster.filter((player) => !namesMatch(player.name, name)),
          })
        : team,
    ),
  };
}

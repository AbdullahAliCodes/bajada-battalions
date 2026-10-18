import { ROSTER_SIZE, TOTAL_BUDGET } from "@/lib/constants";
import { namesMatch } from "@/lib/targets";
import type { AuctionState, Team } from "@/types/auction";

export function recomputeTeam(team: Team): Team {
  const spent = team.roster.reduce((sum, player) => sum + player.price, 0);
  return {
    ...team,
    spent,
    remaining: TOTAL_BUDGET - spent,
    spotsLeft: Math.max(0, ROSTER_SIZE - team.roster.length),
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

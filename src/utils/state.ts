import { ROSTER_SIZE, TOTAL_BUDGET, USER_TEAM_ID } from "@/lib/constants";
import {
  DEFAULT_FORMATION,
  PAIR_KEYS,
  applyUserFormation,
  dropLostFromFormation,
  emptyFormation,
  lookupSide,
  mergePlayerSides,
  normalizeFormation,
  placeInFormation,
  setPlayerSide,
} from "@/lib/formation";
import { recomputeTeam } from "@/lib/roster";
import {
  bracketFromWishlistSort,
  identityMatch,
  lookupBracket,
  namesMatch,
  wishlistSort,
} from "@/lib/targets";
import { createServerSupabase } from "@/utils/supabase";
import type {
  AuctionState,
  PairKey,
  PlayerSide,
  RosterPlayer,
  TargetBracket,
  Team,
} from "@/types/auction";
import poolPlayers from "../../data/players.json";

type DbTeam = {
  id: string;
  name: string;
  is_user: boolean;
  spent: number;
  remaining_budget: number;
  spots_left: number;
  sort_order: number;
};

type DbPlayer = {
  id: string;
  name: string;
  level: number | string | null;
  side: PlayerSide | null;
  status: "available" | "Acquired" | "Lost";
  team_id: string | null;
  price: number | null;
  retained: boolean;
  target_list: "must_buy" | "wishlist" | null;
  target_sort: number | null;
};

type DbFormation = {
  team_id: string;
  pair_key: PairKey;
  bracket: "upper" | "lower" | "bench";
  right_player_id: string | null;
  left_player_id: string | null;
  right_player: { name: string } | { name: string }[] | null;
  left_player: { name: string } | { name: string }[] | null;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function relatedName(
  value: { name: string } | { name: string }[] | null,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name ?? null;
}

function toLevel(value: number | string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const level = typeof value === "number" ? value : Number(value);
  return Number.isFinite(level) ? level : undefined;
}

export function findNamed<T extends { name: string }>(
  rows: T[],
  name: string,
): T | undefined {
  return rows.find((row) => identityMatch(row.name, name));
}

function poolLevel(name: string): number | null {
  const row = (poolPlayers as { name: string; level: number }[]).find((player) =>
    identityMatch(player.name, name),
  );
  return row && Number.isFinite(row.level) ? row.level : null;
}

function normalizeBrackets(
  wishlist: string[],
  brackets: Record<string, TargetBracket> | undefined,
): Record<string, TargetBracket> {
  const next: Record<string, TargetBracket> = {};
  for (const name of wishlist) {
    const bracket = lookupBracket(name, brackets);
    if (bracket) next[name] = bracket;
  }
  return next;
}

function bracketForPair(pair: PairKey): "upper" | "lower" | "bench" {
  if (pair === "pair1" || pair === "pair2") return "upper";
  if (pair === "pair3" || pair === "pair4") return "lower";
  return "bench";
}

function pairNumber(pair: PairKey): number {
  return Number(pair.replace("pair", ""));
}

function playerBaseValue(level: number | null): number | null {
  return level == null ? null : Math.round(level * 10_000);
}

function uniqueNames(names: string[] | undefined): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const name of names ?? []) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

function normalizeTeam(team: Team, playerSides: Record<string, PlayerSide> = {}): Team {
  return recomputeTeam({
    ...team,
    formation: team.isUser
      ? normalizeFormation(team.formation ?? DEFAULT_FORMATION)
      : team.formation,
    roster: team.isUser
      ? team.roster.map((player) => ({
          ...player,
          side: lookupSide(player.name, playerSides) ?? player.side ?? "Unknown",
        }))
      : team.roster,
  });
}

function uniqueByMatch(names: string[] | undefined): string[] {
  const next: string[] = [];
  for (const name of names ?? []) {
    const trimmed = name.trim();
    if (!trimmed || next.some((item) => namesMatch(item, trimmed))) continue;
    next.push(trimmed);
  }
  return next;
}

function isPassedRow(player: DbPlayer): boolean {
  return player.status === "Lost" && !player.team_id && !player.retained;
}

export function normalizeState(state: AuctionState): AuctionState {
  const rosterNames = state.teams.flatMap((team) =>
    team.roster.map((player) => player.name),
  );
  const mustBuy = uniqueNames(state.must_buy);
  const wishlist = uniqueNames(state.wishlist).filter(
    (name) => !mustBuy.some((item) => item.toLowerCase() === name.toLowerCase()),
  );
  const draft: AuctionState = {
    teams: state.teams.map((team) => ({
      ...team,
      formation: team.isUser
        ? normalizeFormation(team.formation ?? DEFAULT_FORMATION)
        : team.formation,
    })),
    must_buy: mustBuy,
    wishlist,
    soldPlayers: uniqueByMatch(rosterNames),
    passedPlayers: uniqueByMatch(state.passedPlayers).filter(
      (name) => !rosterNames.some((rosterName) => namesMatch(rosterName, name)),
    ),
    playerSides: state.playerSides ?? {},
    targetBrackets: normalizeBrackets(wishlist, state.targetBrackets),
  };
  const formation = dropLostFromFormation(draft);
  const playerSides = mergePlayerSides(state.playerSides, formation);
  return {
    ...draft,
    playerSides,
    teams: draft.teams.map((team) =>
      team.isUser
        ? normalizeTeam({ ...team, formation }, playerSides)
        : normalizeTeam(team, playerSides),
    ),
  };
}

export function isAuctionState(value: unknown): value is AuctionState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuctionState>;
  return (
    Array.isArray(candidate.teams) &&
    Array.isArray(candidate.soldPlayers) &&
    (candidate.must_buy === undefined || Array.isArray(candidate.must_buy)) &&
    (candidate.wishlist === undefined || Array.isArray(candidate.wishlist)) &&
    (candidate.passedPlayers === undefined || Array.isArray(candidate.passedPlayers)) &&
    (candidate.playerSides === undefined ||
      (typeof candidate.playerSides === "object" && candidate.playerSides !== null)) &&
    (candidate.targetBrackets === undefined ||
      (typeof candidate.targetBrackets === "object" &&
        candidate.targetBrackets !== null &&
        !Array.isArray(candidate.targetBrackets)))
  );
}

function assembleState(
  dbTeams: DbTeam[],
  dbPlayers: DbPlayer[],
  dbFormations: DbFormation[],
): AuctionState {
  const playerSides: Record<string, PlayerSide> = {};
  for (const player of dbPlayers) {
    if (player.side && player.side !== "Unknown") {
      playerSides[player.name] = player.side;
    }
  }

  const formationRows = dbFormations.filter((row) => row.team_id === USER_TEAM_ID);
  const formation = normalizeFormation(
    Object.fromEntries(
      PAIR_KEYS.map((pair) => {
        const row = formationRows.find((item) => item.pair_key === pair);
        return [
          pair,
          {
            right: relatedName(row?.right_player ?? null),
            left: relatedName(row?.left_player ?? null),
          },
        ];
      }),
    ),
  );

  const teams: Team[] = [...dbTeams]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((team) => {
      const roster: RosterPlayer[] = dbPlayers
        .filter((player) => player.team_id === team.id)
        .map((player) => ({
          name: player.name,
          level: toLevel(player.level),
          price: player.price ?? 0,
          retained: player.retained,
          side: player.side ?? "Unknown",
        }));
      return {
        id: team.id,
        name: team.name,
        isUser: team.is_user,
        spent: team.spent,
        remaining: team.remaining_budget,
        spotsLeft: team.spots_left,
        roster,
        formation: team.is_user ? formation : undefined,
      };
    });

  const must_buy = dbPlayers
    .filter((player) => player.target_list === "must_buy")
    .sort((a, b) => (a.target_sort ?? 0) - (b.target_sort ?? 0))
    .map((player) => player.name);
  const wishlistRows = dbPlayers
    .filter((player) => player.target_list === "wishlist")
    .sort((a, b) => (a.target_sort ?? 0) - (b.target_sort ?? 0));
  const wishlist = wishlistRows.map((player) => player.name);
  const targetBrackets: Record<string, TargetBracket> = {};
  for (const player of wishlistRows) {
    const bracket = bracketFromWishlistSort(player.target_sort);
    if (bracket) targetBrackets[player.name] = bracket;
  }
  const passedPlayers = dbPlayers.filter(isPassedRow).map((player) => player.name);
  const soldPlayers = dbPlayers
    .filter((player) => !isPassedRow(player) && (player.status !== "available" || player.team_id))
    .map((player) => player.name);

  return normalizeState({
    teams,
    must_buy,
    wishlist,
    soldPlayers,
    passedPlayers,
    playerSides,
    targetBrackets,
  });
}

async function fetchDbSnapshot() {
  const supabase = createServerSupabase();
  const [teamsRes, playersRes, formationsRes] = await Promise.all([
    supabase.from("teams").select("*").order("sort_order"),
    supabase.from("players").select("*").order("name"),
    supabase
      .from("formations")
      .select("*, right_player:right_player_id(name), left_player:left_player_id(name)"),
  ]);
  throwIfError(teamsRes.error, "Failed to fetch teams");
  throwIfError(playersRes.error, "Failed to fetch players");
  throwIfError(formationsRes.error, "Failed to fetch formations");
  return {
    supabase,
    teams: (teamsRes.data ?? []) as DbTeam[],
    players: (playersRes.data ?? []) as DbPlayer[],
    formations: (formationsRes.data ?? []) as DbFormation[],
  };
}

export async function readState(): Promise<AuctionState> {
  const { teams, players, formations } = await fetchDbSnapshot();
  if (teams.length === 0) {
    throw new Error(
      "No teams in Supabase. Run scripts/migrate-existing.sql (or schema.sql) then npm run seed.",
    );
  }
  return assembleState(teams, players, formations);
}

function assertRosterBudgets(state: AuctionState) {
  const owners: { name: string; team: string }[] = [];
  for (const team of state.teams) {
    if (team.roster.length > ROSTER_SIZE) {
      throw new Error(`${team.name} has more than ${ROSTER_SIZE} players`);
    }
    let spent = 0;
    for (const player of team.roster) {
      if (!Number.isInteger(player.price) || player.price <= 0) {
        throw new Error(`${player.name} needs a price above zero`);
      }
      const clash = owners.find((owner) => namesMatch(owner.name, player.name));
      if (clash) throw new Error(`${player.name} is already on ${clash.team}`);
      owners.push({ name: player.name, team: team.name });
      spent += player.price;
    }
    if (spent > TOTAL_BUDGET || team.remaining !== TOTAL_BUDGET - spent || team.spent !== spent) {
      throw new Error(`${team.name} would go over budget`);
    }
    if (team.spotsLeft !== ROSTER_SIZE - team.roster.length) {
      throw new Error(`Spot count mismatch for ${team.name}`);
    }
  }
}

export async function writeState(state: AuctionState): Promise<AuctionState> {
  const next = normalizeState(state);
  assertRosterBudgets(next);
  const { supabase, players: currentPlayers } = await fetchDbSnapshot();

  const teamRows = next.teams.map((team, index) => ({
    id: team.id,
    name: team.name,
    is_user: team.isUser,
    spent: team.spent,
    remaining_budget: team.remaining,
    spots_left: team.spotsLeft,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));
  const teamWrite = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
  throwIfError(teamWrite.error, "Failed to update teams");

  type DesiredPlayer = {
    name: string;
    level: number | null;
    side: PlayerSide;
    status: DbPlayer["status"];
    team_id: string | null;
    price: number | null;
    retained: boolean;
    target_list: "must_buy" | "wishlist" | null;
    target_sort: number | null;
  };

  const desired = new Map<string, DesiredPlayer>();

  function remember(name: string, patch: Partial<DesiredPlayer>) {
    const existingRow = findNamed(currentPlayers, name);
    const key = existingRow?.name ?? name;
    const prev = desired.get(key) ?? {
      name: key,
      level: toLevel(existingRow?.level) ?? poolLevel(key) ?? null,
      side: (existingRow?.side as PlayerSide | undefined) ?? "Unknown",
      status: existingRow?.status ?? "available",
      team_id: null,
      price: null,
      retained: false,
      target_list: null,
      target_sort: null,
    };
    desired.set(key, { ...prev, ...patch, name: key });
  }

  for (const player of currentPlayers) {
    remember(player.name, {
      level: toLevel(player.level) ?? null,
      side: player.side ?? "Unknown",
      status: "available",
      team_id: null,
      price: null,
      retained: false,
      target_list: null,
      target_sort: null,
    });
  }

  for (const team of next.teams) {
    for (const player of team.roster) {
      remember(player.name, {
        level: player.level ?? toLevel(findNamed(currentPlayers, player.name)?.level) ?? null,
        side: player.side ?? lookupSide(player.name, next.playerSides) ?? "Unknown",
        status: team.isUser ? "Acquired" : "Lost",
        team_id: team.id,
        price: player.price,
        retained: player.retained,
      });
    }
  }

  next.must_buy.forEach((name, index) => {
    remember(name, { target_list: "must_buy", target_sort: index });
  });
  next.wishlist.forEach((name, index) => {
    remember(name, {
      target_list: "wishlist",
      target_sort: wishlistSort(index, lookupBracket(name, next.targetBrackets)),
    });
  });

  for (const [name, side] of Object.entries(next.playerSides)) {
    remember(name, { side });
  }

  for (const name of next.passedPlayers) {
    const existingRow = findNamed(currentPlayers, name);
    const key = existingRow?.name ?? name;
    if (desired.get(key)?.team_id) continue;
    remember(name, {
      status: "Lost",
      team_id: null,
      price: null,
      retained: false,
    });
  }

  const playerRows = [...desired.values()].map((row) => ({
    ...row,
    level: row.level,
    base_value: playerBaseValue(row.level),
    updated_at: new Date().toISOString(),
  }));
  const playerWrite = await supabase.from("players").upsert(playerRows, { onConflict: "name" });
  throwIfError(playerWrite.error, "Failed to update players");

  const refreshed = await supabase.from("players").select("*");
  throwIfError(refreshed.error, "Failed to reload players");
  const players = (refreshed.data ?? []) as DbPlayer[];

  const userTeam = next.teams.find((team) => team.isUser);
  const formation = userTeam?.formation ?? DEFAULT_FORMATION;
  const formationRows = PAIR_KEYS.map((pair) => ({
    team_id: USER_TEAM_ID,
    pair_key: pair,
    pair_number: pairNumber(pair),
    bracket: bracketForPair(pair),
    right_player_id: formation[pair].right
      ? findNamed(players, formation[pair].right!)?.id ?? null
      : null,
    left_player_id: formation[pair].left
      ? findNamed(players, formation[pair].left!)?.id ?? null
      : null,
    updated_at: new Date().toISOString(),
  }));
  const formationWrite = await supabase
    .from("formations")
    .upsert(formationRows, { onConflict: "team_id,pair_key" });
  throwIfError(formationWrite.error, "Failed to update formations");

  return readState();
}

export async function readPlayers() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("name, level")
    .order("level", { ascending: false, nullsFirst: false });
  throwIfError(error, "Failed to read players");
  return (data ?? [])
    .filter((player) => player.level != null)
    .map((player) => ({
      name: player.name as string,
      level: Number(player.level),
    }));
}

export async function updatePlayerSide(name: string, side: PlayerSide) {
  const supabase = createServerSupabase();
  const { data: rows, error: loadError } = await supabase.from("players").select("id, name");
  throwIfError(loadError, "Failed to load players for side update");
  const match = findNamed((rows ?? []) as { id: string; name: string }[], name);
  if (!match) throw new Error(`Player not found: ${name}`);

  const { error } = await supabase.from("players").update({ side }).eq("name", match.name);
  throwIfError(error, "Failed to update player side");

  const current = await readState();
  return writeState(setPlayerSide(current, name, side));
}

export async function updateFormationSlot(
  pair: PairKey,
  side: "Right" | "Left",
  name: string | null,
) {
  const current = await readState();
  const formation = placeInFormation(
    current.teams.find((team) => team.isUser)?.formation ?? emptyFormation(),
    pair,
    side,
    name,
  );
  return writeState(applyUserFormation(current, formation, name ? { [name]: side } : {}));
}

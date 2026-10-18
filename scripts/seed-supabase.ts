import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PAIR_KEYS } from "../src/lib/formation";
import { namesMatch } from "../src/lib/targets";
import type { AuctionState, PairKey, Player, PlayerSide } from "../src/types/auction";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function throwIfError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function bracketForPair(pair: PairKey): "upper" | "lower" | "bench" {
  if (pair === "pair1" || pair === "pair2") return "upper";
  if (pair === "pair3" || pair === "pair4") return "lower";
  return "bench";
}

function pairNumber(pair: PairKey): number {
  return Number(pair.replace("pair", ""));
}

function findNamed<T extends { name: string }>(rows: T[], name: string): T | undefined {
  return rows.find((row) => namesMatch(row.name, name));
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pool = JSON.parse(
    readFileSync(path.join(ROOT, "data/players.json"), "utf-8"),
  ) as Player[];
  const state = JSON.parse(
    readFileSync(path.join(ROOT, "data/state.json"), "utf-8"),
  ) as AuctionState;

  const teamRows = state.teams.map((team, index) => ({
    id: team.id,
    name: team.name,
    is_user: team.isUser,
    spent: team.spent,
    remaining_budget: team.remaining,
    spots_left: team.spotsLeft,
    sort_order: index,
  }));
  const teamsWrite = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
  throwIfError(teamsWrite.error, "teams upsert");
  console.log(`Upserted ${teamRows.length} teams`);

  type PlayerRow = {
    name: string;
    level: number | null;
    side: PlayerSide;
    status: "available" | "Acquired" | "Lost";
    team_id: string | null;
    price: number | null;
    retained: boolean;
    target_list: "must_buy" | "wishlist" | null;
    target_sort: number | null;
  };

  const byName = new Map<string, PlayerRow>();
  function remember(name: string, patch: Partial<PlayerRow>) {
    const existing = [...byName.values()].find((row) => namesMatch(row.name, name));
    const key = existing?.name ?? name;
    const prev = byName.get(key) ?? {
      name: key,
      level: null,
      side: "Unknown",
      status: "available",
      team_id: null,
      price: null,
      retained: false,
      target_list: null,
      target_sort: null,
    };
    byName.set(key, { ...prev, ...patch, name: key });
  }

  for (const player of pool) {
    remember(player.name, { level: player.level });
  }

  for (const team of state.teams) {
    for (const player of team.roster) {
      remember(player.name, {
        level: player.level ?? null,
        side: player.side ?? "Unknown",
        status: team.isUser ? "Acquired" : "Lost",
        team_id: team.id,
        price: player.price,
        retained: player.retained,
      });
    }
  }

  (state.must_buy ?? []).forEach((name, index) => {
    remember(name, { target_list: "must_buy", target_sort: index });
  });
  (state.wishlist ?? []).forEach((name, index) => {
    remember(name, { target_list: "wishlist", target_sort: index });
  });
  for (const [name, side] of Object.entries(state.playerSides ?? {})) {
    remember(name, { side });
  }
  for (const name of state.passedPlayers ?? []) {
    const existing = [...byName.values()].find((row) => namesMatch(row.name, name));
    if (existing?.team_id) continue;
    remember(name, {
      status: "Lost",
      team_id: null,
      price: null,
      retained: false,
    });
  }

  const playerWrite = await supabase.from("players").upsert(
    [...byName.values()].map((row) => ({
      ...row,
      base_value: row.level == null ? 0 : Math.round(row.level * 10_000),
    })),
    { onConflict: "name" },
  );
  throwIfError(playerWrite.error, "players upsert");
  console.log(`Upserted ${byName.size} players`);

  const { data: dbPlayers, error: loadPlayersError } = await supabase
    .from("players")
    .select("id, name");
  throwIfError(loadPlayersError, "reload players");
  const playerIds = (dbPlayers ?? []) as { id: string; name: string }[];

  const userTeam = state.teams.find((team) => team.isUser);
  const formation = userTeam?.formation;
  if (formation) {
    const formationRows = PAIR_KEYS.map((pair) => ({
      team_id: userTeam.id,
      pair_key: pair,
      pair_number: pairNumber(pair),
      bracket: bracketForPair(pair),
      right_player_id: formation[pair].right
        ? findNamed(playerIds, formation[pair].right!)?.id ?? null
        : null,
      left_player_id: formation[pair].left
        ? findNamed(playerIds, formation[pair].left!)?.id ?? null
        : null,
    }));
    const formationWrite = await supabase
      .from("formations")
      .upsert(formationRows, { onConflict: "team_id,pair_key" });
    throwIfError(formationWrite.error, "formations upsert");
    console.log(`Upserted ${formationRows.length} formation pairs`);
  }

  console.log("Seed complete.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuctionActionCard } from "@/components/AuctionActionCard";
import { Header } from "@/components/Header";
import { PlayerSearch } from "@/components/PlayerSearch";
import { TargetList } from "@/components/TargetList";
import { TeamGrid } from "@/components/TeamGrid";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { USER_TEAM_ID, baseValue } from "@/lib/constants";
import {
  applyUserFormation,
  clearNameFromFormation,
  emptyFormation,
  getPlayerSide,
  placeInFormation,
  setPlayerSide,
} from "@/lib/formation";
import {
  listForPlayer,
  namesMatch,
  pendingTargets,
  playerBaseValue,
  reservedMustBuyBudget,
} from "@/lib/targets";
import type { AuctionState, PairKey, Player, PlayerSide, TargetKind } from "@/types/auction";

type Tab = "floor" | "targets";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

export function AuctionApp() {
  const [state, setState] = useState<AuctionState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tab, setTab] = useState<Tab>("floor");
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const userTeam = state?.teams.find((team) => team.id === USER_TEAM_ID);
  const opponents = useMemo(
    () => state?.teams.filter((team) => !team.isUser) ?? [],
    [state],
  );
  const maxOpponentBudget = useMemo(
    () => opponents.reduce((max, team) => Math.max(max, team.remaining), 0),
    [opponents],
  );

  const persist = useCallback(async (next: AuctionState) => {
    const saved = await readJson<AuctionState>(
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }),
    );
    setState(saved);
    return saved;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextState, nextPlayers] = await Promise.all([
          readJson<AuctionState>(await fetch("/api/state", { cache: "no-store" })),
          readJson<Player[]>(await fetch("/api/players", { cache: "no-store" })),
        ]);
        if (!cancelled) {
          setState(nextState);
          setPlayers(nextPlayers);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activePlayer || !userTeam || !state) return;

    const controller = new AbortController();
    setAdviceLoading(true);
    setAdvice("");

    const mustBuy = state?.must_buy ?? [];
    const wishlist = state?.wishlist ?? [];
    const listStatus = listForPlayer(activePlayer.name, mustBuy, wishlist) ?? "none";
    const excludeFromReserve = listStatus === "must_buy" ? activePlayer.name : undefined;
    const reserve = reservedMustBuyBudget(mustBuy, state, players, excludeFromReserve);
    const pendingMust = pendingTargets(mustBuy, state);
    const pendingWish = pendingTargets(wishlist, state);

    void fetch("/api/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        playerName: activePlayer.name,
        remainingBudget: userTeam.remaining,
        spotsLeft: userTeam.spotsLeft,
        baseValue: baseValue(activePlayer.level),
        maxOpponentBudget,
        listStatus,
        mustBuyRemaining: pendingMust.map((name) => ({
          name,
          baseValue: playerBaseValue(name, players) ?? 0,
        })),
        wishlistRemaining: pendingWish.map((name) => ({
          name,
          baseValue: playerBaseValue(name, players) ?? 0,
        })),
        mustBuyReserve: reserve.reserved,
      }),
    })
      .then((response) => readJson<{ advice: string }>(response))
      .then((payload) => setAdvice(payload.advice))
      .catch((adviceError: unknown) => {
        if (adviceError instanceof DOMException && adviceError.name === "AbortError") {
          return;
        }
        setAdvice("Could not load AI advice. Use remaining budget / spots as your ceiling.");
      })
      .finally(() => setAdviceLoading(false));

    return () => controller.abort();
  }, [activePlayer, maxOpponentBudget, players, state, userTeam]);

  async function assignPlayer(teamId: string, price: number) {
    if (!state || !activePlayer) return;
    setBusy(true);
    setError("");
    try {
      const boughtByUs = teamId === USER_TEAM_ID;
      const userFormation = state.teams.find((team) => team.isUser)?.formation ?? emptyFormation();
      const formation = boughtByUs
        ? userFormation
        : clearNameFromFormation(userFormation, activePlayer.name);
      const next: AuctionState = applyUserFormation(
        {
          ...state,
          soldPlayers: [...state.soldPlayers, activePlayer.name],
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  roster: [
                    ...team.roster,
                    {
                      name: activePlayer.name,
                      level: activePlayer.level,
                      price,
                      retained: false,
                      side: getPlayerSide(activePlayer.name, state),
                    },
                  ],
                }
              : team,
          ),
        },
        formation,
      );
      await persist(next);
      setActivePlayer(null);
      setAdvice("");
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function addTarget(name: string, list: TargetKind) {
    if (!state) return;
    const alreadyOn = [...state.must_buy, ...state.wishlist].some((item) =>
      namesMatch(item, name),
    );
    if (alreadyOn) return;
    try {
      await persist({
        ...state,
        must_buy: list === "must_buy" ? [...state.must_buy, name] : state.must_buy,
        wishlist: list === "wishlist" ? [...state.wishlist, name] : state.wishlist,
      });
    } catch (targetError) {
      setError(targetError instanceof Error ? targetError.message : "Could not save");
    }
  }

  async function changeSide(name: string, side: PlayerSide) {
    if (!state) return;
    try {
      await persist(setPlayerSide(state, name, side));
    } catch (sideError) {
      setError(sideError instanceof Error ? sideError.message : "Could not save");
    }
  }

  async function placeOnGrid(pair: PairKey, side: "Right" | "Left", name: string | null) {
    if (!state) return;
    const formation = placeInFormation(
      state.teams.find((team) => team.isUser)?.formation ?? emptyFormation(),
      pair,
      side,
      name,
    );
    try {
      await persist(
        applyUserFormation(state, formation, name ? { [name]: side } : {}),
      );
    } catch (placeError) {
      setError(placeError instanceof Error ? placeError.message : "Could not save");
    }
  }

  async function removeTarget(name: string, list: TargetKind) {
    if (!state) return;
    try {
      await persist({
        ...state,
        must_buy:
          list === "must_buy"
            ? state.must_buy.filter((item) => !namesMatch(item, name))
            : state.must_buy,
        wishlist:
          list === "wishlist"
            ? state.wishlist.filter((item) => !namesMatch(item, name))
            : state.wishlist,
      });
    } catch (targetError) {
      setError(targetError instanceof Error ? targetError.message : "Could not save");
    }
  }

  if (!state || !userTeam) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6 text-sm text-zinc-500 dark:bg-black dark:text-zinc-400">
        {error || "Loading auction desk…"}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <Header
        remaining={userTeam.remaining}
        spotsLeft={userTeam.spotsLeft}
        tab={tab}
        onTabChange={setTab}
        grid={<TeamGrid state={state} onPlace={(pair, side, name) => void placeOnGrid(pair, side, name)} />}
      />

      <main className="space-y-5 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            {error}
          </p>
        )}

        {tab === "floor" ? (
          <>
            <PlayerSearch
              players={players}
              soldPlayers={state.soldPlayers}
              onSelect={setActivePlayer}
            />
            {activePlayer ? (
              <AuctionActionCard
                player={activePlayer}
                userTeam={userTeam}
                opponents={opponents}
                listStatus={listForPlayer(activePlayer.name, state.must_buy, state.wishlist)}
                side={getPlayerSide(activePlayer.name, state)}
                onSideChange={(side) => void changeSide(activePlayer.name, side)}
                advice={advice}
                adviceLoading={adviceLoading}
                busy={busy}
                onBoughtByUs={(price) => assignPlayer(USER_TEAM_ID, price)}
                onBoughtByOpponent={(teamId, price) => assignPlayer(teamId, price)}
                onPassed={() => {
                  setActivePlayer(null);
                  setAdvice("");
                }}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                Search the player currently on auction.
              </p>
            )}
            <TeamLeaderboard teams={state.teams} />
          </>
        ) : (
          <TargetList
            players={players}
            state={state}
            onAdd={(name, list) => void addTarget(name, list)}
            onRemove={(name, list) => void removeTarget(name, list)}
            onSideChange={(name, side) => void changeSide(name, side)}
          />
        )}
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuctionActionCard } from "@/components/AuctionActionCard";
import { AuctionTabs, Header, type AuctionTab } from "@/components/Header";
import { PassedList } from "@/components/PassedList";
import { PlayerSearch } from "@/components/PlayerSearch";
import { AuctionSkeleton } from "@/components/Skeleton";
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
  RosterError,
  assignRosterPlayer,
  isInPool,
  passPlayer,
  releaseRosterPlayer,
  restorePassedPlayer,
} from "@/lib/roster";
import {
  listForPlayer,
  namesMatch,
  pendingTargets,
  playerBaseValue,
  reservedMustBuyBudget,
} from "@/lib/targets";
import type { AuctionState, PairKey, Player, PlayerSide, TargetKind } from "@/types/auction";

type Tab = AuctionTab;

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function saveErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : "";
  if (!detail || detail === "Failed to save changes") return "Failed to save changes";
  return `Failed to save changes. ${detail}`;
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
  const [isLoading, setIsLoading] = useState(true);

  const stateRef = useRef<AuctionState | null>(null);
  const confirmedRef = useRef<AuctionState | null>(null);
  const pendingRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const userTeam = state?.teams.find((team) => team.id === USER_TEAM_ID);
  const opponents = useMemo(
    () => state?.teams.filter((team) => !team.isUser) ?? [],
    [state],
  );
  const maxOpponentBudget = useMemo(
    () => opponents.reduce((max, team) => Math.max(max, team.remaining), 0),
    [opponents],
  );

  const showState = useCallback((next: AuctionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const commit = useCallback(
    (next: AuctionState, save: () => Promise<AuctionState>) => {
      showState(next);
      setError("");
      pendingRef.current += 1;

      const run = queueRef.current.then(async () => {
        try {
          const saved = await save();
          confirmedRef.current = saved;
          pendingRef.current -= 1;
          if (pendingRef.current === 0) {
            showState(saved);
            setError("");
          }
          return saved;
        } catch (saveError) {
          pendingRef.current -= 1;
          if (pendingRef.current === 0 && confirmedRef.current) {
            showState(confirmedRef.current);
          }
          setError(saveErrorMessage(saveError));
          throw saveError;
        }
      });

      queueRef.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    [showState],
  );

  const postState = useCallback(async (next: AuctionState) => {
    return readJson<AuctionState>(
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }),
    );
  }, []);

  const persist = useCallback(
    (next: AuctionState) => commit(next, () => postState(next)),
    [commit, postState],
  );

  const loadDesk = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [nextState, nextPlayers] = await Promise.all([
        readJson<AuctionState>(await fetch("/api/state", { cache: "no-store" })),
        readJson<Player[]>(await fetch("/api/players", { cache: "no-store" })),
      ]);
      confirmedRef.current = nextState;
      showState(nextState);
      setPlayers(nextPlayers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [showState]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [nextState, nextPlayers] = await Promise.all([
          readJson<AuctionState>(await fetch("/api/state", { cache: "no-store" })),
          readJson<Player[]>(await fetch("/api/players", { cache: "no-store" })),
        ]);
        if (cancelled) return;
        confirmedRef.current = nextState;
        showState(nextState);
        setPlayers(nextPlayers);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [showState]);

  useEffect(() => {
    if (!activePlayer || !userTeam || !state) return;

    const controller = new AbortController();
    let active = true;
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
      .then((payload) => {
        if (active) setAdvice(payload.advice);
      })
      .catch((adviceError: unknown) => {
        if (!active) return;
        if (adviceError instanceof DOMException && adviceError.name === "AbortError") {
          return;
        }
        setAdvice("Could not load AI advice. Use remaining budget / spots as your ceiling.");
      })
      .finally(() => {
        if (active) setAdviceLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activePlayer, maxOpponentBudget, players, state, userTeam]);

  async function assignPlayer(teamId: string, price: number) {
    const current = stateRef.current;
    if (!current || !activePlayer) return;
    setBusy(true);
    try {
      const boughtByUs = teamId === USER_TEAM_ID;
      const userFormation = current.teams.find((team) => team.isUser)?.formation ?? emptyFormation();
      const formation = boughtByUs
        ? userFormation
        : clearNameFromFormation(userFormation, activePlayer.name);
      const next = applyUserFormation(
        assignRosterPlayer(
          current,
          teamId,
          {
            name: activePlayer.name,
            level: activePlayer.level,
            side: getPlayerSide(activePlayer.name, current),
          },
          price,
        ),
        formation,
      );
      await persist(next);
      setActivePlayer(null);
      setAdvice("");
    } catch (assignError) {
      if (assignError instanceof RosterError) setError(assignError.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPassed() {
    const current = stateRef.current;
    if (!current || !activePlayer) return;
    setBusy(true);
    try {
      await persist(passPlayer(current, activePlayer.name));
      setActivePlayer(null);
      setAdvice("");
    } catch (passError) {
      if (passError instanceof RosterError) setError(passError.message);
    } finally {
      setBusy(false);
    }
  }

  async function restorePassed(name: string) {
    const current = stateRef.current;
    if (!current) return;
    try {
      await persist(restorePassedPlayer(current, name));
    } catch {
      // rolled back in commit
    }
  }

  async function addTarget(name: string, list: TargetKind) {
    const current = stateRef.current;
    if (!current) return;
    const alreadyOn = [...current.must_buy, ...current.wishlist].some((item) =>
      namesMatch(item, name),
    );
    if (alreadyOn) return;
    try {
      await persist({
        ...current,
        must_buy: list === "must_buy" ? [...current.must_buy, name] : current.must_buy,
        wishlist: list === "wishlist" ? [...current.wishlist, name] : current.wishlist,
      });
    } catch {
      // rolled back in commit
    }
  }

  async function changeSide(name: string, side: PlayerSide) {
    const current = stateRef.current;
    if (!current) return;
    try {
      await commit(setPlayerSide(current, name, side), async () =>
        readJson<AuctionState>(
          await fetch("/api/players/side", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, side }),
          }),
        ),
      );
    } catch {
      // rolled back in commit
    }
  }

  async function placeOnGrid(pair: PairKey, side: "Right" | "Left", name: string | null) {
    const current = stateRef.current;
    if (!current) return;
    const formation = placeInFormation(
      current.teams.find((team) => team.isUser)?.formation ?? emptyFormation(),
      pair,
      side,
      name,
    );
    const next = applyUserFormation(current, formation, name ? { [name]: side } : {});
    try {
      await commit(next, async () =>
        readJson<AuctionState>(
          await fetch("/api/formations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pair, side, name }),
          }),
        ),
      );
    } catch {
      // rolled back in commit
    }
  }

  async function removeTarget(name: string, list: TargetKind) {
    const current = stateRef.current;
    if (!current) return;
    try {
      await persist({
        ...current,
        must_buy:
          list === "must_buy"
            ? current.must_buy.filter((item) => !namesMatch(item, name))
            : current.must_buy,
        wishlist:
          list === "wishlist"
            ? current.wishlist.filter((item) => !namesMatch(item, name))
            : current.wishlist,
      });
    } catch {
      // rolled back in commit
    }
  }

  async function releasePlayer(teamId: string, name: string) {
    const current = stateRef.current;
    if (!current) return;
    try {
      await persist(releaseRosterPlayer(current, teamId, name));
    } catch {
      // rolled back in commit
    }
  }

  if (isLoading && !state) {
    return <AuctionSkeleton />;
  }

  if (!state || !userTeam) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {error || "Could not load the auction desk."}
        </p>
        <button
          type="button"
          onClick={() => void loadDesk()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <Header remaining={userTeam.remaining} spotsLeft={userTeam.spotsLeft} />

      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        <TeamGrid
          state={state}
          onPlace={(pair, side, name) => void placeOnGrid(pair, side, name)}
        />
        <AuctionTabs tab={tab} onTabChange={setTab} />

        <main>
        {error && (
          <p
            role="alert"
            className="mb-8 rounded-xl border border-zinc-200/80 bg-white px-5 py-4 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {error}
          </p>
        )}

        {tab === "floor" ? (
          <div className="space-y-12">
            <PlayerSearch
              players={players}
              isAvailable={(name) => isInPool(name, state)}
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
                onPassed={() => void markPassed()}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-white/60 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                Search the player currently on auction.
              </p>
            )}
            <TeamLeaderboard teams={state.teams} onRelease={(teamId, name) => void releasePlayer(teamId, name)} />
          </div>
        ) : tab === "targets" ? (
          <TargetList
            players={players}
            state={state}
            onAdd={(name, list) => void addTarget(name, list)}
            onRemove={(name, list) => void removeTarget(name, list)}
            onSideChange={(name, side) => void changeSide(name, side)}
          />
        ) : (
          <PassedList
            names={state.passedPlayers ?? []}
            players={players}
            onRestore={(name) => void restorePassed(name)}
          />
        )}
        </main>
      </div>
    </div>
  );
}

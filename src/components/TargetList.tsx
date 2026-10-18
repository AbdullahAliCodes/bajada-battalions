"use client";

import { useMemo, useState } from "react";
import { baseValue } from "@/lib/constants";
import { formatRand } from "@/lib/format";
import {
  findPlayer,
  pendingTargets,
  playerBaseValue,
  reservedMustBuyBudget,
  targetStatus,
} from "@/lib/targets";
import { SideToggle } from "@/components/SideToggle";
import { getPlayerSide } from "@/lib/formation";
import type { AuctionState, Player, PlayerSide, TargetKind, TargetStatus } from "@/types/auction";

type TargetListProps = {
  players: Player[];
  state: AuctionState;
  onAdd: (name: string, list: TargetKind) => void;
  onRemove: (name: string, list: TargetKind) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
};

const STATUS_META: Record<TargetStatus, { label: string; className: string }> = {
  acquired: { label: "Acquired", className: "text-zinc-900 dark:text-zinc-50" },
  lost: { label: "Lost", className: "text-zinc-400" },
  pending: { label: "Pending", className: "text-zinc-500 dark:text-zinc-400" },
};

const fieldClassName =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-base text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100";

export function TargetList({ players, state, onAdd, onRemove, onSideChange }: TargetListProps) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<TargetKind>("must_buy");

  const listed = useMemo(
    () => [...state.must_buy, ...state.wishlist],
    [state.must_buy, state.wishlist],
  );

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) return [];
    return players
      .filter((player) => {
        const already = listed.some((name) => name.toLowerCase() === player.name.toLowerCase());
        return !already && player.name.toLowerCase().includes(needle);
      })
      .slice(0, 6);
  }, [listed, players, query]);

  const pendingMust = pendingTargets(state.must_buy, state);
  const pendingWish = pendingTargets(state.wishlist, state);
  const reserve = reservedMustBuyBudget(state.must_buy, state, players);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Target List
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {pendingMust.length} Must Buy still available · {pendingWish.length} Wishlist still
          available
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Reserved for Must Buys: {formatRand(reserve.reserved)}
          {reserve.missingLevels.length > 0
            ? ` · missing pool level for ${reserve.missingLevels.join(", ")}`
            : ""}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add a name from the pool"
          className={fieldClassName}
        />
        <select
          value={list}
          onChange={(event) => setList(event.target.value as TargetKind)}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-100"
        >
          <option value="must_buy">Must Buy</option>
          <option value="wishlist">Wishlist</option>
        </select>
      </div>

      {suggestions.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {suggestions.map((player) => (
            <li key={player.name} className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  onAdd(player.name, list);
                  setQuery("");
                }}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span>
                  <span className="block text-zinc-900 dark:text-zinc-50">{player.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    L{player.level} · {formatRand(baseValue(player.level))}
                  </span>
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Add to {list === "must_buy" ? "Must Buy" : "Wishlist"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TargetSection
        title="Must Buy"
        priority="Priority 1"
        names={state.must_buy}
        players={players}
        auctionState={state}
        onRemove={(name) => onRemove(name, "must_buy")}
        onSideChange={onSideChange}
      />
      <TargetSection
        title="Wishlist"
        priority="Priority 2"
        names={state.wishlist}
        players={players}
        auctionState={state}
        onRemove={(name) => onRemove(name, "wishlist")}
        onSideChange={onSideChange}
      />
    </section>
  );
}

function TargetSection({
  title,
  priority,
  names,
  players,
  auctionState,
  onRemove,
  onSideChange,
}: {
  title: string;
  priority: string;
  names: string[];
  players: Player[];
  auctionState: AuctionState;
  onRemove: (name: string) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {priority}
        </p>
      </div>
      <ul className="space-y-2">
        {names.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No {title.toLowerCase()} names yet.
          </li>
        )}
        {names.map((name) => {
          const player = findPlayer(players, name);
          const status = targetStatus(name, auctionState);
          const meta = STATUS_META[status];
          const value = playerBaseValue(name, players);
          return (
            <li
              key={name}
              className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {player ? `L${player.level} · ${formatRand(value ?? 0)}` : "Not in player pool"}
                  </span>
                  <span className={`mt-1 block text-xs font-medium ${meta.className}`}>
                    {meta.label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(name)}
                  className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Side</p>
                <SideToggle
                  value={getPlayerSide(name, auctionState)}
                  onChange={(side) => onSideChange(name, side)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

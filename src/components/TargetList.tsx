"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { baseValue } from "@/lib/constants";
import { formatRand } from "@/lib/format";
import {
  findPlayer,
  pendingTargets,
  playerBaseValue,
  reservedMustBuyBudget,
  targetStatus,
} from "@/lib/targets";
import { BracketToggle, SideToggle } from "@/components/SideToggle";
import { getPlayerSide } from "@/lib/formation";
import { bracketLabel, lookupBracket } from "@/lib/targets";
import type {
  AuctionState,
  Player,
  PlayerSide,
  TargetBracket,
  TargetKind,
  TargetStatus,
} from "@/types/auction";

type TargetListProps = {
  players: Player[];
  state: AuctionState;
  onAdd: (name: string, list: TargetKind, bracket?: TargetBracket) => void;
  onRemove: (name: string, list: TargetKind) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
  onBracketChange: (name: string, bracket: TargetBracket) => void;
};

const STATUS_META: Record<TargetStatus, { label: string; className: string }> = {
  acquired: { label: "Acquired", className: "text-zinc-900 dark:text-zinc-50" },
  lost: { label: "Lost", className: "text-zinc-400" },
  pending: { label: "Pending", className: "text-zinc-500 dark:text-zinc-400" },
};

const fieldClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100";

const cardClassName =
  "rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700";

export function TargetList({
  players,
  state,
  onAdd,
  onRemove,
  onSideChange,
  onBracketChange,
}: TargetListProps) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<TargetKind>("must_buy");
  const [bracket, setBracket] = useState<TargetBracket>("upper");

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
    <section className="space-y-12">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add a name from the pool"
          className={fieldClassName}
        />
        <div className="flex gap-2">
          <select
            value={list}
            onChange={(event) => setList(event.target.value as TargetKind)}
            className="rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-100"
          >
            <option value="must_buy">Must Buy</option>
            <option value="wishlist">Wishlist</option>
          </select>
          {list === "wishlist" && (
            <select
              value={bracket}
              onChange={(event) => setBracket(event.target.value as TargetBracket)}
              aria-label="Bracket for the player being added"
              className="rounded-lg border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-100"
            >
              <option value="upper">Upper bracket</option>
              <option value="lower">Lower bracket</option>
            </select>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="space-y-4">
          {suggestions.map((player) => (
            <li key={player.name}>
              <button
                type="button"
                onClick={() => {
                  onAdd(player.name, list, list === "wishlist" ? bracket : undefined);
                  setQuery("");
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-4 text-left ${cardClassName}`}
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
      <WishlistSection
        names={state.wishlist}
        players={players}
        auctionState={state}
        onRemove={(name) => onRemove(name, "wishlist")}
        onSideChange={onSideChange}
        onBracketChange={onBracketChange}
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
  showBracket = false,
  onBracketChange,
  emptyLabel,
}: {
  title: string;
  priority?: string;
  names: string[];
  players: Player[];
  auctionState: AuctionState;
  onRemove: (name: string) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
  showBracket?: boolean;
  onBracketChange?: (name: string, bracket: TargetBracket) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        {priority && (
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {priority}
          </p>
        )}
      </div>
      <ul className="space-y-4">
        {names.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
            {emptyLabel ?? `No ${title.toLowerCase()} names yet.`}
          </li>
        )}
        {names.map((name) => (
          <TargetCard
            key={name}
            name={name}
            players={players}
            auctionState={auctionState}
            onRemove={onRemove}
            onSideChange={onSideChange}
            showBracket={showBracket}
            onBracketChange={onBracketChange}
          />
        ))}
      </ul>
    </div>
  );
}

function WishlistSection({
  names,
  players,
  auctionState,
  onRemove,
  onSideChange,
  onBracketChange,
}: {
  names: string[];
  players: Player[];
  auctionState: AuctionState;
  onRemove: (name: string) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
  onBracketChange: (name: string, bracket: TargetBracket) => void;
}) {
  const groups: { title: string; names: string[] }[] = [
    {
      title: "Upper bracket",
      names: names.filter((name) => lookupBracket(name, auctionState.targetBrackets) === "upper"),
    },
    {
      title: "Lower bracket",
      names: names.filter((name) => lookupBracket(name, auctionState.targetBrackets) === "lower"),
    },
    {
      title: "Bracket not set",
      names: names.filter((name) => !lookupBracket(name, auctionState.targetBrackets)),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Wishlist</h3>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Priority 2
        </p>
      </div>
      {names.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
          No wishlist names yet.
        </p>
      ) : (
        <div className="space-y-8">
          {groups
            .filter((group) => group.names.length > 0)
            .map((group) => (
              <div key={group.title}>
                <h4 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {group.title}
                </h4>
                <ul className="space-y-4">
                  {group.names.map((name) => (
                    <TargetCard
                      key={name}
                      name={name}
                      players={players}
                      auctionState={auctionState}
                      onRemove={onRemove}
                      onSideChange={onSideChange}
                      showBracket
                      onBracketChange={onBracketChange}
                    />
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TargetCard({
  name,
  players,
  auctionState,
  onRemove,
  onSideChange,
  showBracket,
  onBracketChange,
}: {
  name: string;
  players: Player[];
  auctionState: AuctionState;
  onRemove: (name: string) => void;
  onSideChange: (name: string, side: PlayerSide) => void;
  showBracket: boolean;
  onBracketChange?: (name: string, bracket: TargetBracket) => void;
}) {
  const player = findPlayer(players, name);
  const status = targetStatus(name, auctionState);
  const meta = STATUS_META[status];
  const value = playerBaseValue(name, players);
  const side = getPlayerSide(name, auctionState);
  const bracket = lookupBracket(name, auctionState.targetBrackets);

  return (
    <li className={cardClassName}>
      <div className="flex items-start justify-between gap-4">
        <span>
          <span className="block font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {player ? `L${player.level} · ${formatRand(value ?? 0)}` : "Not in player pool"}
            {side !== "Unknown" ? ` · ${side} side` : ""}
          </span>
          {showBracket && (
            <span className="mt-1 block text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {bracketLabel(bracket)}
            </span>
          )}
          <span className={`mt-1 block text-xs font-medium ${meta.className}`}>{meta.label}</span>
        </span>
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={() => onRemove(name)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          <X size={16} />
        </button>
      </div>
      {showBracket && onBracketChange && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bracket</p>
          <BracketToggle value={bracket} onChange={(next) => onBracketChange(name, next)} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Side</p>
        <SideToggle value={side} onChange={(next) => onSideChange(name, next)} />
      </div>
    </li>
  );
}

"use client";

import { useMemo, useState } from "react";
import { baseValue } from "@/lib/constants";
import { formatRand } from "@/lib/format";
import type { Player } from "@/types/auction";

type PlayerSearchProps = {
  players: Player[];
  soldPlayers: string[];
  onSelect: (player: Player) => void;
};

export function PlayerSearch({ players, soldPlayers, onSelect }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const sold = useMemo(
    () => new Set(soldPlayers.map((name) => name.toLowerCase())),
    [soldPlayers],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) return [];
    return players
      .filter(
        (player) =>
          !sold.has(player.name.toLowerCase()) &&
          player.name.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [players, query, sold]);

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Player on the block
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search player name"
        autoComplete="off"
        autoCorrect="off"
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-lg text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {matches.map((player) => (
            <li key={player.name} className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  onSelect(player);
                  setQuery("");
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span>
                  <span className="block font-medium text-zinc-900 dark:text-zinc-50">
                    {player.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Level {player.level}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatRand(baseValue(player.level))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
      <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Player on the block
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search player name"
        autoComplete="off"
        autoCorrect="off"
        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-3 max-h-80 w-full space-y-3 overflow-auto">
          {matches.map((player) => (
            <li key={player.name}>
              <button
                type="button"
                onClick={() => {
                  onSelect(player);
                  setQuery("");
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
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

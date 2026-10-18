"use client";

import { baseValue } from "@/lib/constants";
import { formatRand } from "@/lib/format";
import { namesMatch } from "@/lib/targets";
import type { Player } from "@/types/auction";

type PassedListProps = {
  names: string[];
  players: Player[];
  onRestore: (name: string) => void;
};

export function PassedList({ names, players, onRestore }: PassedListProps) {
  const ordered = [...names].reverse();

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Passed
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {ordered.length === 0
          ? "Nobody has been passed. Passing on the auction floor takes a player out of the pool."
          : `${ordered.length} out of the pool. Put one back when they are up for auction again.`}
      </p>

      {ordered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          The passed list is empty.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {ordered.map((name) => {
            const player = players.find((item) => namesMatch(item.name, name));
            return (
              <li
                key={name}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                  {player && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Level {player.level} · {formatRand(baseValue(player.level))}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onRestore(name)}
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-950"
                >
                  Return to pool
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { formatRand } from "@/lib/format";
import type { Team } from "@/types/auction";

type TeamLeaderboardProps = {
  teams: Team[];
};

export function TeamLeaderboard({ teams }: TeamLeaderboardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opponents = [...teams]
    .filter((team) => !team.isUser)
    .sort((a, b) => b.remaining - a.remaining);

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Opponent budgets
      </h2>
      <ul className="-mx-2 mt-2">
        {opponents.map((team) => {
          const open = openId === team.id;
          return (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : team.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span>
                  <span className="block font-medium text-zinc-900 dark:text-zinc-50">
                    {team.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {team.spotsLeft} spots open
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatRand(team.remaining)}
                </span>
              </button>
              {open && (
                <ul className="mb-2 space-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                  {team.roster.map((player, index) => (
                    <li key={`${player.name}-${index}`} className="flex justify-between gap-3">
                      <span>
                        {player.name}
                        {player.level != null && (
                          <span className="ml-1 text-zinc-400">L{player.level}</span>
                        )}
                        {player.retained ? (
                          <span className="ml-1 text-[10px] uppercase text-zinc-400">retained</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatRand(player.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

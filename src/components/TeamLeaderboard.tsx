"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { formatRand } from "@/lib/format";
import type { Team } from "@/types/auction";

type TeamLeaderboardProps = {
  teams: Team[];
  onRelease: (teamId: string, playerName: string) => void;
};

export function TeamLeaderboard({ teams, onRelease }: TeamLeaderboardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const userTeam = teams.find((team) => team.isUser);
  const opponents = [...teams]
    .filter((team) => !team.isUser)
    .sort((a, b) => b.remaining - a.remaining);

  return (
    <div className="space-y-4">
      {userTeam && (
        <section className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Our roster
          </h2>
          <RosterList team={userTeam} onRelease={onRelease} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Opponent budgets
        </h2>
        <ul className="space-y-4">
          {opponents.map((team) => {
            const open = openId === team.id;
            return (
              <li
                key={team.id}
                className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : team.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
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
                {open && <RosterList team={team} onRelease={onRelease} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function RosterList({
  team,
  onRelease,
}: {
  team: Team;
  onRelease: (teamId: string, playerName: string) => void;
}) {
  if (team.roster.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No players assigned.</p>
    );
  }

  return (
    <ul className="mt-4 space-y-2 rounded-lg bg-zinc-50 px-3 py-3 text-sm text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
      {team.roster.map((player, index) => (
        <li key={`${player.name}-${index}`} className="flex items-start justify-between gap-3 py-1">
          <span className="min-w-0 flex-1">
            <span className="block text-zinc-900 dark:text-zinc-50">{player.name}</span>
            {(player.level != null || player.retained) && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-400">
                {player.level != null && <span>L{player.level}</span>}
                {player.retained ? <span className="uppercase">retained</span> : null}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatRand(player.price)}
            </span>
            <button
              type="button"
              aria-label={`Remove ${player.name} from ${team.name}`}
              onClick={() => onRelease(team.id, player.name)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-950 dark:hover:text-zinc-50"
            >
              <Undo2 size={14} />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

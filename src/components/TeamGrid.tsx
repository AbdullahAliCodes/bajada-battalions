"use client";

import { User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { USER_TEAM_ID } from "@/lib/constants";
import { PAIR_KEYS, shortName, slotCandidates } from "@/lib/formation";
import { formatRand } from "@/lib/format";
import { namesMatch } from "@/lib/targets";
import type { AuctionState, PairKey, RosterPlayer } from "@/types/auction";

type TeamGridProps = {
  state: AuctionState;
  onPlace: (pair: PairKey, side: "Right" | "Left", name: string | null) => void;
};

const BRACKETS = ["UPPER BRACKET", "LOWER BRACKET", "BENCH"];

export function TeamGrid({ state, onPlace }: TeamGridProps) {
  const [openSlot, setOpenSlot] = useState<{ pair: PairKey; side: "Right" | "Left" } | null>(
    null,
  );
  const userTeam = state.teams.find((team) => team.id === USER_TEAM_ID);
  const formation = userTeam?.formation;
  const candidates = openSlot ? slotCandidates(state) : [];

  useEffect(() => {
    if (!openSlot) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-grid-slot]")) return;
      setOpenSlot(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openSlot]);

  if (!formation || !userTeam) return null;

  const placed = PAIR_KEYS.flatMap((pair) => [formation[pair].right, formation[pair].left]);
  const unplaced = userTeam.roster.filter(
    (player) => !placed.some((name) => name && namesMatch(name, player.name)),
  );

  return (
    <section className="mb-12">
      <div className={`overflow-x-auto ${openSlot ? "pb-56" : "pb-4"}`}>
      <div className="min-w-[600px]">
      <div className="mb-3 grid grid-cols-6 gap-3 sm:gap-4">
        {BRACKETS.map((label) => (
          <p
            key={label}
            className="col-span-2 text-center text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-zinc-500"
          >
            {label}
          </p>
        ))}
      </div>

      {(["Right", "Left"] as const).map((row) => (
        <div
          key={row}
          className={`grid grid-cols-6 gap-3 sm:gap-4 ${row === "Right" ? "mb-3 sm:mb-4" : ""}`}
        >
          {PAIR_KEYS.map((pair) => {
            const name = row === "Right" ? formation[pair].right : formation[pair].left;
            const rosterPlayer = name ? rosterMatch(userTeam.roster, name) : undefined;
            const open = openSlot?.pair === pair && openSlot.side === row;
            return (
              <GridCell
                key={`${pair}-${row}`}
                name={rosterPlayer?.name ?? name}
                price={rosterPlayer?.price ?? null}
                side={row}
                open={open}
                candidates={candidates}
                onEmptyClick={() => setOpenSlot({ pair, side: row })}
                onSelect={(selected) => {
                  onPlace(pair, row, selected);
                  setOpenSlot(null);
                }}
                onClear={() => {
                  onPlace(pair, row, null);
                  setOpenSlot(null);
                }}
              />
            );
          })}
        </div>
      ))}
      </div>
      </div>
      {unplaced.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500">NOT PLACED</p>
          <ul className="mt-2 space-y-2">
            {unplaced.map((player) => (
              <li
                key={player.name}
                className="flex items-center justify-between gap-3 text-sm text-zinc-900 dark:text-zinc-50"
              >
                <span className="min-w-0 truncate">{player.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatRand(player.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function rosterMatch(roster: RosterPlayer[], name: string): RosterPlayer | undefined {
  return roster.find((player) => namesMatch(player.name, name));
}

function GridCell({
  name,
  price,
  side,
  open,
  candidates,
  onEmptyClick,
  onSelect,
  onClear,
}: {
  name: string | null;
  price: number | null;
  side: "Right" | "Left";
  open: boolean;
  candidates: string[];
  onEmptyClick: () => void;
  onSelect: (name: string) => void;
  onClear: () => void;
}) {
  const badge = side === "Right" ? "[R]" : "[L]";
  const onTeam = price != null;

  if (!name) {
    return (
      <div className="relative min-w-0" data-grid-slot="">
        <button
          type="button"
          onClick={onEmptyClick}
          className="flex h-full min-h-[70px] w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/50"
        >
          {badge}
        </button>
        {open && (
          <SlotMenu candidates={candidates} onSelect={onSelect} />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-w-0" data-grid-slot="">
      <button
        type="button"
        onClick={onEmptyClick}
        className={`relative flex min-h-[70px] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
          onTeam ? "" : "opacity-60"
        }`}
      >
        <User size={16} className="text-zinc-500" />
        <span className="mt-1.5 w-full truncate text-xs font-medium leading-tight text-zinc-900 dark:text-zinc-50">
          {shortName(name)}
        </span>
        {price != null && (
          <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatRand(price)}
          </span>
        )}
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-zinc-500">{badge}</span>
      </button>
      <button
        type="button"
        aria-label={`Clear ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
        className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:text-zinc-50"
      >
        <X size={10} strokeWidth={2.5} />
      </button>
      {open && (
        <SlotMenu
          candidates={candidates}
          current={name}
          onSelect={onSelect}
          onClear={onClear}
        />
      )}
    </div>
  );
}

function SlotMenu({
  candidates,
  current,
  onSelect,
  onClear,
}: {
  candidates: string[];
  current?: string;
  onSelect: (name: string) => void;
  onClear?: () => void;
}) {
  return (
    <ul className="absolute z-40 mt-2 max-h-48 w-44 overflow-auto rounded-xl border border-zinc-200/80 bg-white py-1 text-left shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {current && onClear && (
        <li>
          <button
            type="button"
            onClick={onClear}
            className="w-full px-2 py-1.5 text-left text-[11px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Clear slot
          </button>
        </li>
      )}
      {candidates.length === 0 && (
        <li className="px-2 py-1.5 text-[11px] text-zinc-400">No free players</li>
      )}
      {candidates.map((candidate) => (
        <li key={candidate}>
          <button
            type="button"
            onClick={() => onSelect(candidate)}
            className="w-full px-2 py-1.5 text-left text-[11px] text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {shortName(candidate)}
          </button>
        </li>
      ))}
    </ul>
  );
}

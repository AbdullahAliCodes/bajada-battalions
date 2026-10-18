"use client";

import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { PAIR_KEYS, shortName, slotCandidates } from "@/lib/formation";
import { targetStatus } from "@/lib/targets";
import type { AuctionState, PairKey } from "@/types/auction";

type TeamGridProps = {
  state: AuctionState;
  onPlace: (pair: PairKey, side: "Right" | "Left", name: string | null) => void;
};

const BRACKETS = ["UPPER BRACKET", "LOWER BRACKET", "BENCH"];

export function TeamGrid({ state, onPlace }: TeamGridProps) {
  const [openSlot, setOpenSlot] = useState<{ pair: PairKey; side: "Right" | "Left" } | null>(
    null,
  );
  const formation = state.teams.find((team) => team.isUser)?.formation;
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

  if (!formation) return null;

  return (
    <section className="mt-5 mb-8">
      <div className="mb-2 grid grid-cols-6 gap-2">
        {BRACKETS.map((label) => (
          <p
            key={label}
            className="col-span-2 text-center text-[10px] font-semibold tracking-widest text-zinc-500"
          >
            {label}
          </p>
        ))}
      </div>

      {(["Right", "Left"] as const).map((row) => (
        <div
          key={row}
          className={`grid grid-cols-6 gap-2 ${row === "Right" ? "mb-2" : ""}`}
        >
          {PAIR_KEYS.map((pair) => {
            const name = row === "Right" ? formation[pair].right : formation[pair].left;
            const open = openSlot?.pair === pair && openSlot.side === row;
            return (
              <GridCell
                key={`${pair}-${row}`}
                name={name}
                side={row}
                status={name ? targetStatus(name, state) : null}
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
    </section>
  );
}

function GridCell({
  name,
  side,
  status,
  open,
  candidates,
  onEmptyClick,
  onSelect,
  onClear,
}: {
  name: string | null;
  side: "Right" | "Left";
  status: "pending" | "acquired" | "lost" | null;
  open: boolean;
  candidates: string[];
  onEmptyClick: () => void;
  onSelect: (name: string) => void;
  onClear: () => void;
}) {
  const badge = side === "Right" ? "[R]" : "[L]";
  const faded = status === "lost" || status === "pending";

  if (!name) {
    return (
      <div className="relative" data-grid-slot="">
        <button
          type="button"
          onClick={onEmptyClick}
          className="flex h-full min-h-[60px] w-full items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-800"
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
    <div className="relative" data-grid-slot="">
      <button
        type="button"
        onClick={onEmptyClick}
        className={`flex min-h-[60px] w-full flex-col items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 p-2 text-center dark:border-zinc-800 dark:bg-zinc-900 ${
          faded ? "opacity-60" : ""
        }`}
      >
        <User size={14} className="text-zinc-500" />
        <span className="mt-1 text-[10px] font-medium leading-tight text-zinc-900 dark:text-zinc-50">
          {shortName(name)}
        </span>
        <span className="text-[9px] font-semibold tracking-wide text-zinc-500">{badge}</span>
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
    <ul className="absolute z-40 mt-1 max-h-48 w-36 overflow-auto rounded-md border border-zinc-200 bg-white py-1 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
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

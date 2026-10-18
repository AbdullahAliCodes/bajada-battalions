"use client";

import { useState } from "react";
import { baseValue } from "@/lib/constants";
import { formatRand, parseRand } from "@/lib/format";
import { SideToggle } from "@/components/SideToggle";
import type { Player, PlayerSide, TargetKind, Team } from "@/types/auction";

type AuctionActionCardProps = {
  player: Player;
  userTeam: Team;
  opponents: Team[];
  listStatus: TargetKind | null;
  side: PlayerSide;
  onSideChange: (side: PlayerSide) => void;
  advice: string;
  adviceLoading: boolean;
  busy: boolean;
  onBoughtByUs: (price: number) => Promise<void>;
  onBoughtByOpponent: (teamId: string, price: number) => Promise<void>;
  onPassed: () => void;
};

const fieldClassName =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-base text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100";

export function AuctionActionCard({
  player,
  userTeam,
  opponents,
  listStatus,
  side,
  onSideChange,
  advice,
  adviceLoading,
  busy,
  onBoughtByUs,
  onBoughtByOpponent,
  onPassed,
}: AuctionActionCardProps) {
  const [mode, setMode] = useState<"us" | "opponent" | null>(null);
  const [price, setPrice] = useState("");
  const [teamId, setTeamId] = useState(opponents[0]?.id ?? "");
  const [error, setError] = useState("");

  const value = baseValue(player.level);
  const parsedPrice = parseRand(price);
  const selectedOpponent = opponents.find((team) => team.id === teamId);

  async function confirm() {
    if (!parsedPrice) {
      setError("Enter a final price");
      return;
    }

    if (mode === "us") {
      if (userTeam.spotsLeft <= 0) {
        setError("No roster spots left");
        return;
      }
      if (parsedPrice > userTeam.remaining) {
        setError("Over Bajada remaining budget");
        return;
      }
      await onBoughtByUs(parsedPrice);
    } else if (mode === "opponent") {
      if (!selectedOpponent) {
        setError("Pick an opponent");
        return;
      }
      if (selectedOpponent.spotsLeft <= 0) {
        setError(`${selectedOpponent.name} has no spots left`);
        return;
      }
      if (parsedPrice > selectedOpponent.remaining) {
        setError(`${selectedOpponent.name} cannot afford that`);
        return;
      }
      await onBoughtByOpponent(selectedOpponent.id, parsedPrice);
    }

    setMode(null);
    setPrice("");
    setError("");
  }

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Now auctioning
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {player.name}
          </h2>
          {listStatus === "must_buy" && (
            <p className="mt-2 inline-flex rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white dark:bg-zinc-50 dark:text-black">
              Must Buy
            </p>
          )}
          {listStatus === "wishlist" && (
            <p className="mt-2 inline-flex rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
              Wishlist
            </p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 px-3 py-2 text-right dark:border-zinc-800">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Playtomic</p>
          <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {player.level}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Base value{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{formatRand(value)}</span>
          <span> · level × R10,000</span>
        </p>
        <SideToggle value={side} onChange={onSideChange} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          AI bid advice
        </p>
        <p>{adviceLoading ? "Reading the room…" : advice || "Select a player to get advice."}</p>
      </div>

      {mode ? (
        <div className="mt-4 space-y-3">
          {mode === "opponent" && (
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className={fieldClassName}
            >
              {opponents.map((team) => (
                <option key={team.id} value={team.id} disabled={team.spotsLeft <= 0}>
                  {team.name} · {formatRand(team.remaining)} · {team.spotsLeft} left
                </option>
              ))}
            </select>
          )}
          <input
            inputMode="numeric"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
              setError("");
            }}
            placeholder="Final price e.g. 55000"
            className={fieldClassName}
          />
          {error && <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode(null);
                setError("");
              }}
              className="rounded-lg border border-zinc-200 px-4 py-3 font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={busy || userTeam.spotsLeft <= 0}
            onClick={() => setMode("us")}
            className="rounded-lg bg-zinc-900 px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
          >
            Bought by Us
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("opponent")}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Bought by Opponent
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onPassed}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Passed
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { ROSTER_SIZE, TOTAL_BUDGET } from "@/lib/constants";
import { formatRand, parseRand } from "@/lib/format";
import { getPlayerSide } from "@/lib/formation";
import {
  bracketLabel,
  findPlayer,
  lookupBracket,
  namesMatch,
  playerBaseValue,
  targetStatus,
} from "@/lib/targets";
import type { AuctionState, Player, RosterPlayer } from "@/types/auction";

type BudgetEstimatorProps = {
  state: AuctionState;
  players: Player[];
};

const cardClassName =
  "rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const inputClassName =
  "w-[7.5rem] shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-right text-base tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-100";

function enteredAmount(value: string | undefined): number {
  if (!value) return 0;
  return parseRand(value) ?? 0;
}

function defaultPrice(name: string, players: Player[]): string {
  const base = playerBaseValue(name, players);
  return base == null ? "" : String(base);
}

export function BudgetEstimator({ state, players }: BudgetEstimatorProps) {
  const userTeam = state.teams.find((team) => team.isUser);
  const roster = userTeam?.roster ?? [];
  const retained = roster.filter((player) => player.retained);
  const mustBuys = state.must_buy.filter(
    (name) => !retained.some((player) => namesMatch(player.name, name)),
  );
  const pendingMust = mustBuys.filter((name) => targetStatus(name, state) === "pending");
  const mustKey = pendingMust.join("\n");

  const [mustPrices, setMustPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(pendingMust.map((name) => [name, defaultPrice(name, players)])),
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [wishPrices, setWishPrices] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("");
  const [openSections, setOpenSections] = useState({
    retained: false,
    must: false,
    wish: false,
    totals: false,
  });

  useEffect(() => {
    const names = mustKey.split("\n").filter(Boolean);
    setMustPrices((current) => {
      const next = { ...current };
      let changed = false;
      for (const name of names) {
        if (next[name] === undefined) {
          next[name] = defaultPrice(name, players);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [mustKey, players]);

  const availableWishlist = state.wishlist.filter((name) => {
    if (targetStatus(name, state) !== "pending") return false;
    if (retained.some((player) => namesMatch(player.name, name))) return false;
    return !picked.some((item) => namesMatch(item, name));
  });

  const totals = useMemo(() => {
    const counted = new Set<string>();
    let retainedSpend = 0;
    for (const player of retained) {
      retainedSpend += player.price;
      counted.add(player.name);
    }

    let mustSpend = 0;
    for (const name of mustBuys) {
      const status = targetStatus(name, state);
      if (status === "lost") continue;
      const owned = roster.find((player) => namesMatch(player.name, name));
      if (owned) {
        mustSpend += owned.price;
        counted.add(owned.name);
        continue;
      }
      mustSpend += enteredAmount(mustPrices[name]);
    }

    let wishSpend = 0;
    for (const name of picked) {
      const status = targetStatus(name, state);
      if (status === "lost") continue;
      const owned = roster.find((player) => namesMatch(player.name, name));
      if (owned) {
        if (!counted.has(owned.name)) {
          wishSpend += owned.price;
          counted.add(owned.name);
        }
        continue;
      }
      wishSpend += enteredAmount(wishPrices[name]);
    }

    let otherSpend = 0;
    let otherCount = 0;
    for (const player of roster) {
      if (counted.has(player.name)) continue;
      otherSpend += player.price;
      otherCount += 1;
    }

    const spend = retainedSpend + mustSpend + wishSpend + otherSpend;
    const remaining = TOTAL_BUDGET - spend;
    const planned =
      roster.length +
      pendingMust.length +
      picked.filter(
        (name) =>
          targetStatus(name, state) === "pending" &&
          !roster.some((player) => namesMatch(player.name, name)),
      ).length;
    const spotsLeft = ROSTER_SIZE - planned;

    return {
      retainedSpend,
      mustSpend,
      wishSpend,
      otherSpend,
      otherCount,
      spend,
      remaining,
      planned,
      spotsLeft,
      perSpot: spotsLeft > 0 && remaining > 0 ? Math.floor(remaining / spotsLeft) : null,
    };
  }, [mustBuys, mustPrices, pendingMust, picked, retained, roster, state, wishPrices]);

  function addWishlistPlayer() {
    const name = selected;
    if (!name) return;
    setPicked((current) =>
      current.some((item) => namesMatch(item, name)) ? current : [...current, name],
    );
    setWishPrices((current) =>
      current[name] === undefined ? { ...current, [name]: defaultPrice(name, players) } : current,
    );
    setSelected("");
  }

  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="order-2 min-w-0 space-y-10 lg:order-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Budget estimator
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Retained prices stay fixed. Must buys start at base value. Add wishlist players to try a
            lineup.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <EstimateSection
          title="Retained"
          description="Fixed, including the R10 000 premium."
          total={totals.retainedSpend}
          open={openSections.retained}
          onToggle={() =>
            setOpenSections((current) => ({ ...current, retained: !current.retained }))
          }
        >
          <ul className="space-y-4">
            {retained.map((player) => (
              <FixedRow
                key={player.name}
                player={player}
                detail={player.level != null ? `L${player.level} · retained` : "Retained"}
              />
            ))}
          </ul>
        </EstimateSection>

        <EstimateSection
          title="Must buys"
          description="Enter the price you expect to pay. Each box starts at base value."
          total={totals.mustSpend}
          open={openSections.must}
          onToggle={() => setOpenSections((current) => ({ ...current, must: !current.must }))}
        >
          <ul className="space-y-4">
            {mustBuys.map((name) => {
              const status = targetStatus(name, state);
              const owned = roster.find((player) => namesMatch(player.name, name));
              if (status === "lost") {
                return <LostRow key={name} name={name} />;
              }
              if (owned) {
                return (
                  <FixedRow
                    key={name}
                    player={owned}
                    detail="Bought"
                  />
                );
              }
              const base = playerBaseValue(name, players);
              const pool = findPlayer(players, name);
              return (
                <li key={name} className={cardClassName}>
                  <div className="flex items-center justify-between gap-4">
                    <span>
                      <span className="block font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {pool ? `L${pool.level}` : "Not in player pool"}
                        {base != null ? ` · base ${formatRand(base)}` : ""}
                      </span>
                    </span>
                    <input
                      inputMode="numeric"
                      aria-label={`Price for ${name}`}
                      value={mustPrices[name] ?? ""}
                      onChange={(event) =>
                        setMustPrices((current) => ({ ...current, [name]: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </EstimateSection>

        <EstimateSection
          title="Players we want"
          description="Choose someone from the wishlist and add them to this estimate."
          total={totals.wishSpend}
          open={openSections.wish}
          onToggle={() => setOpenSections((current) => ({ ...current, wish: !current.wish }))}
        >
          <div className="mb-4 flex min-w-0 gap-2">
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              aria-label="Wishlist player"
              className="w-0 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-100"
            >
              <option value="">
                {availableWishlist.length === 0
                  ? "No wishlist players left"
                  : "Add a wishlist player"}
              </option>
              {availableWishlist.map((name) => {
                const bracket = lookupBracket(name, state.targetBrackets);
                const side = getPlayerSide(name, state);
                const detail = [
                  bracket ? bracketLabel(bracket) : null,
                  side !== "Unknown" ? `${side} side` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <option key={name} value={name}>
                    {detail ? `${name} · ${detail}` : name}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              disabled={!selected}
              onClick={addWishlistPlayer}
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
            >
              Add
            </button>
          </div>
          {picked.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              No wishlist players in this estimate yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {picked.map((name) => {
                const status = targetStatus(name, state);
                const owned = roster.find((player) => namesMatch(player.name, name));
                if (status === "lost") return <LostRow key={name} name={name} />;
                if (owned) return <FixedRow key={name} player={owned} detail="Bought" />;
                const base = playerBaseValue(name, players);
                const pool = findPlayer(players, name);
                const bracket = lookupBracket(name, state.targetBrackets);
                const side = getPlayerSide(name, state);
                return (
                  <li key={name} className={cardClassName}>
                    <div className="flex items-start justify-between gap-4">
                      <span>
                        <span className="block font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {pool ? `L${pool.level}` : "Not in player pool"}
                          {base != null ? ` · base ${formatRand(base)}` : ""}
                        </span>
                        <span className="mt-1 block text-sm font-bold text-zinc-900 dark:text-zinc-50">
                          {bracketLabel(bracket)}
                          {side !== "Unknown" ? ` · ${side} side` : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${name} from the estimate`}
                        onClick={() =>
                          setPicked((current) => current.filter((item) => !namesMatch(item, name)))
                        }
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <input
                        inputMode="numeric"
                        aria-label={`Price for ${name}`}
                        value={wishPrices[name] ?? ""}
                        onChange={(event) =>
                          setWishPrices((current) => ({ ...current, [name]: event.target.value }))
                        }
                        className={inputClassName}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </EstimateSection>
        </div>
      </div>

      <aside
        aria-label="Estimate totals"
        className="order-1 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm lg:sticky lg:top-56 lg:order-2 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <EstimateSection
          title="Totals"
          spent={totals.spend}
          total={totals.remaining}
          prominent
          open={openSections.totals}
          onToggle={() =>
            setOpenSections((current) => ({ ...current, totals: !current.totals }))
          }
        >
          {totals.remaining < 0 && (
            <p className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Over budget by {formatRand(Math.abs(totals.remaining))}
            </p>
          )}
          <dl className="space-y-3 text-sm">
            <SummaryLine label="Total spend" value={formatRand(totals.spend)} strong />
            <SummaryLine label="Retained" value={formatRand(totals.retainedSpend)} />
            <SummaryLine label="Must buys" value={formatRand(totals.mustSpend)} />
            <SummaryLine label="Wishlist" value={formatRand(totals.wishSpend)} />
            {totals.otherCount > 0 && (
              <SummaryLine label="Already bought" value={formatRand(totals.otherSpend)} />
            )}
            <SummaryLine label="Players" value={`${totals.planned} of ${ROSTER_SIZE}`} />
            <SummaryLine
              label="Spots left"
              value={
                totals.spotsLeft < 0
                  ? `${totals.spotsLeft} over the roster`
                  : String(totals.spotsLeft)
              }
            />
            {totals.perSpot != null && (
              <SummaryLine label="Left per open spot" value={formatRand(totals.perSpot)} />
            )}
          </dl>
        </EstimateSection>
      </aside>
    </div>
  );
}

function EstimateSection({
  title,
  description,
  spent,
  total,
  prominent = false,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  spent?: number;
  total: number;
  prominent?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `estimate-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;

  return (
    <section className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </span>
            {description && (
              <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-right">
              {spent != null && (
                <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  Spent {formatRand(spent)}
                </span>
              )}
              <span
                className={`block text-zinc-900 tabular-nums dark:text-zinc-50 ${
                  prominent ? "text-[0.9375rem] font-extrabold" : "text-sm font-bold"
                }`}
              >
                {spent != null ? `Remaining ${formatRand(total)}` : formatRand(total)}
              </span>
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h3>
      {open && (
        <div id={panelId} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}>
        {label}
      </dt>
      <dd
        className={`tabular-nums text-zinc-900 dark:text-zinc-50 ${strong ? "font-semibold" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function FixedRow({ player, detail }: { player: RosterPlayer; detail: string }) {
  return (
    <li className={cardClassName}>
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-medium text-zinc-900 dark:text-zinc-50">{player.name}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Fixed
          </span>
          <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-50">
            {formatRand(player.price)}
          </span>
        </span>
      </div>
    </li>
  );
}

function LostRow({ name }: { name: string }) {
  return (
    <li className={cardClassName}>
      <span className="block font-medium text-zinc-400">{name}</span>
      <span className="text-xs text-zinc-400">Lost</span>
    </li>
  );
}

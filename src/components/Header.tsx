"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { USER_TEAM_NAME } from "@/lib/constants";
import { formatRand } from "@/lib/format";

type HeaderProps = {
  remaining: number;
  spotsLeft: number;
};

type AuctionTabsProps = {
  tab: "floor" | "targets";
  onTabChange: (tab: "floor" | "targets") => void;
};

export function Header({ remaining, spotsLeft }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-4xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Team Padel Premier
            </p>
            <h1 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {USER_TEAM_NAME}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Live auction desk</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Remaining
            </p>
            <p className="text-4xl font-extrabold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
              {formatRand(remaining)}
            </p>
          </div>
          <div className="mb-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
          </div>
        </div>
      </div>
    </header>
  );
}

export function AuctionTabs({ tab, onTabChange }: AuctionTabsProps) {
  return (
    <nav className="mx-auto mb-8 flex w-full rounded-xl bg-zinc-200/60 p-1.5 backdrop-blur-sm dark:bg-zinc-800/60 sm:w-auto">
      <TabButton active={tab === "floor"} onClick={() => onTabChange("floor")}>
        Auction Floor
      </TabButton>
      <TabButton active={tab === "targets"} onClick={() => onTabChange("targets")}>
        Target List
      </TabButton>
    </nav>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-6 py-2.5 text-sm font-medium transition-all sm:flex-none ${
        active
          ? "border border-black/5 bg-white text-zinc-900 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-zinc-50"
          : "border border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
    >
      {mounted && isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
    </svg>
  );
}

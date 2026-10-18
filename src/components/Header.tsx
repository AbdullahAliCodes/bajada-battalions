"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { USER_TEAM_NAME } from "@/lib/constants";
import { formatRand } from "@/lib/format";

type HeaderProps = {
  remaining: number;
  spotsLeft: number;
  tab: "floor" | "targets";
  onTabChange: (tab: "floor" | "targets") => void;
  grid?: ReactNode;
};

export function Header({ remaining, spotsLeft, tab, onTabChange, grid }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Remaining
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {formatRand(remaining)}
          </p>
        </div>
        <div className="mb-1 rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
        </div>
      </div>

      {grid}

      <nav className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => onTabChange("floor")}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm transition-colors ${
            tab === "floor"
              ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Auction Floor
        </button>
        <button
          type="button"
          onClick={() => onTabChange("targets")}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm transition-colors ${
            tab === "targets"
              ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Target List
        </button>
      </nav>
    </header>
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

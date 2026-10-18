"use client";

import type { PlayerSide, TargetBracket } from "@/types/auction";

type SideToggleProps = {
  value: PlayerSide;
  onChange: (side: PlayerSide) => void;
};

const OPTIONS: { side: PlayerSide; label: string }[] = [
  { side: "Left", label: "L" },
  { side: "Unknown", label: "U" },
  { side: "Right", label: "R" },
];

export function SideToggle({ value, onChange }: SideToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800"
      role="group"
      aria-label="Player side"
    >
      {OPTIONS.map((option) => {
        const active = value === option.side;
        return (
          <button
            key={option.side}
            type="button"
            onClick={() => onChange(option.side)}
            className={`h-7 min-w-7 rounded px-2 text-[11px] font-semibold ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const BRACKETS: { bracket: TargetBracket; label: string }[] = [
  { bracket: "upper", label: "Upper" },
  { bracket: "lower", label: "Lower" },
];

export function BracketToggle({
  value,
  onChange,
}: {
  value: TargetBracket | undefined;
  onChange: (bracket: TargetBracket) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800"
      role="group"
      aria-label="Target bracket"
    >
      {BRACKETS.map((option) => {
        const active = value === option.bracket;
        return (
          <button
            key={option.bracket}
            type="button"
            onClick={() => onChange(option.bracket)}
            className={`h-7 rounded px-2.5 text-[11px] ${
              active
                ? "bg-zinc-900 font-bold text-white dark:bg-zinc-50 dark:text-black"
                : "font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

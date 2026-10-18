import Image from "next/image";
import { USER_TEAM_NAME } from "@/lib/constants";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 ${className}`}
      aria-hidden="true"
    />
  );
}

const BRACKETS = ["UPPER BRACKET", "LOWER BRACKET", "BENCH"];

export function AuctionSkeleton() {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <p className="sr-only">Loading auction desk</p>
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-4xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/bajada-logo.png"
                alt=""
                width={56}
                height={56}
                priority
                className="size-14 shrink-0"
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Team Padel Premier
                </p>
                <h1 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {USER_TEAM_NAME}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Live auction desk</p>
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Spent
              </p>
              <Skeleton className="mt-2 h-5 w-28 rounded-md" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Remaining
              </p>
              <Skeleton className="mt-2 h-10 w-40 rounded-md" />
            </div>
            <Skeleton className="mb-1 h-8 w-28 rounded-full" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        <div className="mb-12 overflow-x-auto pb-4">
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
            <div className="mb-3 grid grid-cols-6 gap-3 sm:mb-4 sm:gap-4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`right-${index}`} className="h-[70px] rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`left-${index}`} className="h-[70px] rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mb-8 grid w-full grid-cols-2 gap-1 rounded-xl bg-zinc-200/60 p-1.5 dark:bg-zinc-800/60 sm:grid-cols-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>

        <div className="space-y-12">
          <div>
            <Skeleton className="mb-3 h-3 w-32 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <section className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Opponent budgets
            </p>
            <ul className="space-y-4">
              {Array.from({ length: 4 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded" />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

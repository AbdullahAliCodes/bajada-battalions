import { NextResponse } from "next/server";
import { updateFormationSlot } from "@/utils/state";
import type { PairKey } from "@/types/auction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRS: PairKey[] = ["pair1", "pair2", "pair3", "pair4", "pair5", "pair6"];
const SIDES = ["Right", "Left"] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pair?: PairKey;
      side?: "Right" | "Left";
      name?: string | null;
    };
    if (!body.pair || !PAIRS.includes(body.pair) || !body.side || !SIDES.includes(body.side)) {
      return NextResponse.json(
        { error: "Expected { pair, side, name }" },
        { status: 400 },
      );
    }
    const state = await updateFormationSlot(body.pair, body.side, body.name ?? null);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update formation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

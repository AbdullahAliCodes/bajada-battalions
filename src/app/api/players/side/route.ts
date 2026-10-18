import { NextResponse } from "next/server";
import { updatePlayerSide } from "@/utils/state";
import type { PlayerSide } from "@/types/auction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIDES: PlayerSide[] = ["Right", "Left", "Unknown"];

export async function PATCH(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; side?: PlayerSide };
    if (!body.name || !body.side || !SIDES.includes(body.side)) {
      return NextResponse.json({ error: "Expected { name, side }" }, { status: 400 });
    }
    const state = await updatePlayerSide(body.name, body.side);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update side";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { readPlayers } from "@/utils/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const players = await readPlayers();
    return NextResponse.json(players, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

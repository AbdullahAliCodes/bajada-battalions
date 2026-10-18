import { NextResponse } from "next/server";
import { isAuctionState, readState, writeState } from "@/utils/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isAuctionState(body)) {
      return NextResponse.json({ error: "Invalid auction state" }, { status: 400 });
    }
    const state = await writeState(body);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

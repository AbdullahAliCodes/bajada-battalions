import { NextResponse } from "next/server";
import OpenAI from "openai";
import { USER_TEAM_NAME } from "@/lib/constants";
import { formatRand } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NamedValue = {
  name: string;
  baseValue: number;
};

type AdviceRequest = {
  playerName: string;
  remainingBudget: number;
  spotsLeft: number;
  baseValue: number;
  maxOpponentBudget: number;
  listStatus: "must_buy" | "wishlist" | "none";
  mustBuyRemaining: NamedValue[];
  wishlistRemaining: NamedValue[];
  mustBuyReserve: number;
};

function isNamedValue(value: unknown): value is NamedValue {
  if (!value || typeof value !== "object") return false;
  const item = value as NamedValue;
  return typeof item.name === "string" && typeof item.baseValue === "number";
}

function isAdviceRequest(value: unknown): value is AdviceRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as AdviceRequest;
  return (
    typeof body.playerName === "string" &&
    typeof body.remainingBudget === "number" &&
    typeof body.spotsLeft === "number" &&
    typeof body.baseValue === "number" &&
    typeof body.maxOpponentBudget === "number" &&
    (body.listStatus === "must_buy" ||
      body.listStatus === "wishlist" ||
      body.listStatus === "none") &&
    Array.isArray(body.mustBuyRemaining) &&
    body.mustBuyRemaining.every(isNamedValue) &&
    Array.isArray(body.wishlistRemaining) &&
    body.wishlistRemaining.every(isNamedValue) &&
    typeof body.mustBuyReserve === "number"
  );
}

function fallbackAdvice(body: AdviceRequest): string {
  const leftoverSpots = Math.max(0, body.spotsLeft - 1);
  const otherMustBuys = body.mustBuyRemaining.filter(
    (player) => player.name.toLowerCase() !== body.playerName.toLowerCase(),
  );
  const reserve =
    body.listStatus === "must_buy"
      ? otherMustBuys.reduce((sum, player) => sum + player.baseValue, 0)
      : body.mustBuyReserve;
  const ceiling = Math.max(0, body.remainingBudget - reserve);

  if (body.listStatus === "must_buy") {
    return `Aggressive ceiling for this Must Buy is ${formatRand(ceiling)} after reserving ${formatRand(reserve)} for the other Must Buys. Push toward that cap — do not lose this one cheaply to opponents sitting on ${formatRand(body.maxOpponentBudget)}.`;
  }
  if (body.listStatus === "wishlist") {
    return `Moderate ceiling is ${formatRand(ceiling)} once ${formatRand(reserve)} is locked for remaining Must Buys. Bid if he stays near base (${formatRand(body.baseValue)}); pass if the room stretches it and you still need ${leftoverSpots} more spots.`;
  }
  if (body.mustBuyRemaining.length >= body.spotsLeft) {
    return `Pass. All ${body.spotsLeft} remaining spots are needed for ${body.mustBuyRemaining.length} Must Buys whose base values total ${formatRand(reserve)}. Do not spend on a non-target.`;
  }
  return `Strict ceiling for this non-target is ${formatRand(ceiling)} after reserving Must Buy bases of ${formatRand(reserve)}. Only nick him below that; otherwise pass and protect the Must Buy budget.`;
}

function buildSystemPrompt(body: AdviceRequest): string {
  const mustBuyNames = body.mustBuyRemaining
    .map((player) => `${player.name} (base R${player.baseValue})`)
    .join(", ");
  const wishlistNames = body.wishlistRemaining
    .map((player) => `${player.name} (base R${player.baseValue})`)
    .join(", ");

  return `You are a live auction assistant. The user's team is ${USER_TEAM_NAME}. They have R${body.remainingBudget} for ${body.spotsLeft} total remaining spots.
Crucially, the user has ${body.mustBuyRemaining.length} 'Must Buy' players still available in the auction pool, and ${body.wishlistRemaining.length} 'Wishlist' players still available.
Remaining Must Buy players: ${mustBuyNames || "none"}.
Remaining Wishlist players: ${wishlistNames || "none"}.
The player on auction is ${body.playerName}, base value R${body.baseValue}. They are currently classified as: ${body.listStatus}.
The highest budget among opponents is R${body.maxOpponentBudget}.
Reserved budget already calculated for remaining Must Buy base values (excluding this player if they are a Must Buy): R${body.mustBuyReserve}.
When advising on the maximum bid for the CURRENT player on auction:
- If the current player is ON the 'Must Buy' list, advise an aggressive bidding ceiling.
- If the current player is ON the 'Wishlist', advise a moderate ceiling.
- If the current player is NOT on either list, the AI MUST mathematically reserve enough budget to afford the base values of the remaining 'Must Buy' players. Calculate a strict, lowered bid ceiling for this non-target player to ensure the 'Must Buy' budget is not jeopardized.
If remaining Must Buy count is greater than or equal to remaining spots and the current player is not a Must Buy, recommend passing.
Give a 2-sentence strategic recommendation.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isAdviceRequest(body)) {
      return NextResponse.json({ error: "Invalid advice request" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(body);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        advice: fallbackAdvice(body),
        source: "fallback",
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 140,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Give the two-sentence live auction recommendation now.",
        },
      ],
    });

    const advice = completion.choices[0]?.message?.content?.trim();
    if (!advice) {
      return NextResponse.json({
        advice: fallbackAdvice(body),
        source: "fallback",
      });
    }

    return NextResponse.json({ advice, source: "openai" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get advice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

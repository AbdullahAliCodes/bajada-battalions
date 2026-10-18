import { namesMatch, targetStatus } from "@/lib/targets";
import type {
  AuctionState,
  Formation,
  FormationSlot,
  PairKey,
  PlayerSide,
} from "@/types/auction";

export const PAIR_KEYS: PairKey[] = [
  "pair1",
  "pair2",
  "pair3",
  "pair4",
  "pair5",
  "pair6",
];

export const DEFAULT_FORMATION: Formation = {
  pair1: { right: "Ahmed Ghaff", left: "Mohammed Wajoodeen" },
  pair2: { right: "Morgan Booysen", left: "Mohammed Rawat" },
  pair3: { right: "Abdullah Ali", left: "Zaid Jacobs" },
  pair4: { right: "Muhammed Zaid Ally", left: "Salmaan Beg" },
  pair5: { right: null, left: null },
  pair6: { right: null, left: null },
};

function emptySlot(): FormationSlot {
  return { right: null, left: null };
}

export function emptyFormation(): Formation {
  return {
    pair1: emptySlot(),
    pair2: emptySlot(),
    pair3: emptySlot(),
    pair4: emptySlot(),
    pair5: emptySlot(),
    pair6: emptySlot(),
  };
}

function isSlot(value: unknown): value is FormationSlot {
  if (!value || typeof value !== "object") return false;
  const slot = value as FormationSlot;
  return (
    (slot.right === null || typeof slot.right === "string") &&
    (slot.left === null || typeof slot.left === "string")
  );
}

export function normalizeFormation(value: unknown): Formation {
  const source = value && typeof value === "object" ? (value as Partial<Formation>) : {};
  const next = emptyFormation();
  for (const key of PAIR_KEYS) {
    const slot = source[key];
    next[key] = isSlot(slot)
      ? {
          right: slot.right?.trim() || null,
          left: slot.left?.trim() || null,
        }
      : emptySlot();
  }
  return next;
}

export function shortName(name: string): string {
  const parts = name.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]!.toUpperCase()}. ${parts[parts.length - 1]}`;
}

export function sideKey(side: "Right" | "Left"): "right" | "left" {
  return side === "Right" ? "right" : "left";
}

export function getPlayerSide(name: string, state: AuctionState): PlayerSide {
  for (const [stored, side] of Object.entries(state.playerSides ?? {})) {
    if (namesMatch(stored, name)) return side;
  }
  const formation = state.teams.find((team) => team.isUser)?.formation;
  if (formation) {
    for (const key of PAIR_KEYS) {
      const slot = formation[key];
      if (slot.right && namesMatch(slot.right, name)) return "Right";
      if (slot.left && namesMatch(slot.left, name)) return "Left";
    }
  }
  return "Unknown";
}

function playerSidesWithout(playerSides: Record<string, PlayerSide>, name: string) {
  const next: Record<string, PlayerSide> = {};
  for (const [key, value] of Object.entries(playerSides)) {
    if (!namesMatch(key, name)) next[key] = value;
  }
  return next;
}

export function sidesFromFormation(formation: Formation): Record<string, PlayerSide> {
  const sides: Record<string, PlayerSide> = {};
  for (const key of PAIR_KEYS) {
    const slot = formation[key];
    if (slot.right) sides[slot.right] = "Right";
    if (slot.left) sides[slot.left] = "Left";
  }
  return sides;
}

export function mergePlayerSides(
  existing: Record<string, PlayerSide> | undefined,
  formation: Formation,
): Record<string, PlayerSide> {
  const next = { ...sidesFromFormation(formation) };
  for (const [name, side] of Object.entries(existing ?? {})) {
    const key = Object.keys(next).find((item) => namesMatch(item, name)) ?? name;
    next[key] = side;
  }
  return next;
}

export function clearNameFromFormation(formation: Formation, name: string): Formation {
  const next = normalizeFormation(formation);
  for (const key of PAIR_KEYS) {
    if (next[key].right && namesMatch(next[key].right!, name)) next[key].right = null;
    if (next[key].left && namesMatch(next[key].left!, name)) next[key].left = null;
  }
  return next;
}

export function findFormationSlot(formation: Formation, name: string) {
  for (const pair of PAIR_KEYS) {
    const slot = formation[pair];
    if (slot.right && namesMatch(slot.right, name)) {
      return { pair, side: "Right" as const };
    }
    if (slot.left && namesMatch(slot.left, name)) {
      return { pair, side: "Left" as const };
    }
  }
  return null;
}

export function placeInFormation(
  formation: Formation,
  pair: PairKey,
  side: "Right" | "Left",
  name: string | null,
): Formation {
  const next = name ? clearNameFromFormation(formation, name) : normalizeFormation(formation);
  next[pair][sideKey(side)] = name;
  return next;
}

export function applyUserFormation(
  state: AuctionState,
  formation: Formation,
  extraSides: Record<string, PlayerSide> = {},
): AuctionState {
  const playerSides = { ...state.playerSides, ...extraSides };
  return {
    ...state,
    playerSides,
    teams: state.teams.map((team) =>
      team.isUser
        ? {
            ...team,
            formation,
            roster: team.roster.map((player) => ({
              ...player,
              side: lookupSide(player.name, playerSides) ?? player.side ?? "Unknown",
            })),
          }
        : team,
    ),
  };
}

export function lookupSide(
  name: string,
  playerSides: Record<string, PlayerSide>,
): PlayerSide | undefined {
  const match = Object.entries(playerSides).find(([key]) => namesMatch(key, name));
  return match?.[1];
}

export function setPlayerSide(
  state: AuctionState,
  name: string,
  side: PlayerSide,
): AuctionState {
  const userTeam = state.teams.find((team) => team.isUser);
  const formation = userTeam?.formation ?? emptyFormation();
  let nextFormation = formation;
  const located = findFormationSlot(formation, name);

  if (located && (side === "Right" || side === "Left") && located.side !== side) {
    const pair = nextFormation[located.pair];
    const swapped = pair[sideKey(side)];
    nextFormation = {
      ...nextFormation,
      [located.pair]: {
        right: side === "Right" ? name : swapped,
        left: side === "Left" ? name : swapped,
      },
    };
  }

  const playerSides = {
    ...playerSidesWithout(state.playerSides, name),
    [name]: side,
  };
  if (located && (side === "Right" || side === "Left")) {
    const partner = formation[located.pair][sideKey(side)];
    if (partner && !namesMatch(partner, name)) {
      playerSides[partner] = located.side;
    }
  }

  return applyUserFormation(state, nextFormation, playerSides);
}

export function slotCandidates(state: AuctionState): string[] {
  const userTeam = state.teams.find((team) => team.isUser);
  const formation = userTeam?.formation ?? emptyFormation();
  const placed = PAIR_KEYS.flatMap((key) => [formation[key].right, formation[key].left]).filter(
    (name): name is string => Boolean(name),
  );
  const names = [
    ...(userTeam?.roster.map((player) => player.name) ?? []),
    ...state.must_buy,
    ...state.wishlist,
  ];
  const unique: string[] = [];
  for (const name of names) {
    if (targetStatus(name, state) === "lost") continue;
    if (placed.some((item) => namesMatch(item, name))) continue;
    if (unique.some((item) => namesMatch(item, name))) continue;
    unique.push(name);
  }
  return unique;
}

export function dropLostFromFormation(state: AuctionState): Formation {
  const formation = state.teams.find((team) => team.isUser)?.formation ?? DEFAULT_FORMATION;
  const next = normalizeFormation(formation);
  for (const key of PAIR_KEYS) {
    for (const side of ["right", "left"] as const) {
      const name = next[key][side];
      if (name && targetStatus(name, state) === "lost") {
        next[key][side] = null;
      }
    }
  }
  return next;
}

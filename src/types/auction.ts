export type PlayerSide = "Right" | "Left" | "Unknown";

export type Player = {
  name: string;
  level: number;
  side?: PlayerSide;
};

export type RosterPlayer = {
  name: string;
  level?: number;
  price: number;
  retained: boolean;
  side?: PlayerSide;
};

export type FormationSlot = {
  right: string | null;
  left: string | null;
};

export type Formation = {
  pair1: FormationSlot;
  pair2: FormationSlot;
  pair3: FormationSlot;
  pair4: FormationSlot;
  pair5: FormationSlot;
  pair6: FormationSlot;
};

export type PairKey = keyof Formation;

export type Team = {
  id: string;
  name: string;
  isUser: boolean;
  spent: number;
  remaining: number;
  spotsLeft: number;
  roster: RosterPlayer[];
  formation?: Formation;
};

export type TargetKind = "must_buy" | "wishlist";
export type TargetStatus = "pending" | "acquired" | "lost";
export type TargetBracket = "upper" | "lower";

export type AuctionState = {
  teams: Team[];
  must_buy: string[];
  wishlist: string[];
  soldPlayers: string[];
  passedPlayers: string[];
  playerSides: Record<string, PlayerSide>;
  targetBrackets: Record<string, TargetBracket>;
};

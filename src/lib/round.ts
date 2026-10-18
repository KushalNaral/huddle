export type Vote = "no" | "yes" | "love";

export type PlayerColor = "blue" | "red" | "green" | "violet";

export type Player = {
  id: string;
  name: string;
  color: PlayerColor;
  /** The viewer of this device. */
  isYou?: boolean;
  isHost?: boolean;
};

export type Option = {
  id: string;
  name: string;
  kind: string;
  /** Rough cost per person in dollars; null when unknown. */
  priceEach: number | null;
  priceLabel: string | null;
  /** How far, or how long until it's ready. */
  distance: string | null;
  rating: { score: number; count: number } | null;
  addedBy: string;
  /** Domain the link came from; null when the option was typed. */
  source: string | null;
};

export type Round = {
  slug: string;
  question: string;
  players: Player[];
  options: Option[];
  /** Your own constraint note, parsed. Others' notes stay private. */
  yourCap: number | null;
  yourNote: string | null;
  /**
   * Options that break someone's budget, and whose. Computed on the server,
   * so other people's caps never reach this device.
   */
  bounds: Record<string, Bound>;
};

/** Whose stated budget an option breaks. */
export type Bound = "yours" | "theirs";

export type Marks = Record<string, Record<string, Vote | undefined>>;

const POINTS: Record<Vote, number> = { love: 2, yes: 1, no: -1 };

export type TallyRow = {
  option: Option;
  marks: Record<string, Vote | undefined>;
  points: number;
  loves: number;
  nos: number;
  order: number;
  /** Breaks a stated constraint (for now: your price cap). */
  outOfBounds: boolean;
};

export type TieBreak = "loves" | "nos" | "order" | null;

export type Tally = {
  rows: TallyRow[];
  tieBreak: TieBreak;
  /** Options that scored at least as well as the winner but break a constraint. */
  filtered: TallyRow[];
};

/**
 * Deterministic scoring: love 2, yes 1, no -1 (a soft veto), unmarked 0.
 * Options that break a constraint rank below every option that doesn't.
 * Ties go to more circles, then fewer cross-outs, then the option added first.
 */
export function tally(round: Round, marks: Marks): Tally {
  const rows: TallyRow[] = round.options.map((option, order) => {
    const m: Record<string, Vote | undefined> = {};
    let points = 0;
    let loves = 0;
    let nos = 0;
    for (const p of round.players) {
      const v = marks[p.id]?.[option.id];
      m[p.id] = v;
      if (!v) continue;
      points += POINTS[v];
      if (v === "love") loves++;
      if (v === "no") nos++;
    }
    return { option, marks: m, points, loves, nos, order, outOfBounds: round.bounds[option.id] !== undefined };
  });

  rows.sort(
    (a, b) =>
      Number(a.outOfBounds) - Number(b.outOfBounds) ||
      b.points - a.points ||
      b.loves - a.loves ||
      a.nos - b.nos ||
      a.order - b.order,
  );

  let tieBreak: TieBreak = null;
  const [first, second] = rows;
  if (first && second && !second.outOfBounds && first.points === second.points) {
    if (first.loves !== second.loves) tieBreak = "loves";
    else if (first.nos !== second.nos) tieBreak = "nos";
    else tieBreak = "order";
  }
  const filtered =
    first && !first.outOfBounds ? rows.filter((r) => r.outOfBounds && r.points >= first.points) : [];
  return { rows, tieBreak, filtered };
}

const NUMBER_WORDS = ["", "one", "two", "three", "four"];

/**
 * Stand-in for the Claude-written reason. The winner is already decided by
 * `tally`; this only explains it in a sentence.
 */
export function explain(round: Round, row: TallyRow): string {
  const n = round.players.length;
  const marks = round.players.map((p) => row.marks[p.id]);
  const everyoneLoved = marks.every((v) => v === "love");
  const nobodyCrossed = marks.every((v) => v !== "no");

  let agreement: string;
  if (everyoneLoved) {
    agreement = n === 2 ? "You both circled it" : `All ${NUMBER_WORDS[n]} of you circled it`;
  } else if (nobodyCrossed && row.loves > 0) {
    agreement = `Nobody crossed it out and ${row.loves === 1 ? "one of you" : NUMBER_WORDS[row.loves] + " of you"} circled it`;
  } else if (nobodyCrossed) {
    agreement = "Nobody crossed it out";
  } else {
    agreement = `It still came out on top with ${row.points} ${row.points === 1 ? "point" : "points"}`;
  }

  const o = row.option;
  let cost = o.priceLabel;
  if (cost && round.yourCap !== null && o.priceEach !== null && o.priceEach <= round.yourCap) {
    cost += `, under your $${round.yourCap} cap`;
  }
  const facts = [cost, o.distance?.toLowerCase()].filter(Boolean);
  if (facts.length === 0) return `${agreement}.`;
  return `${agreement}. ${facts.join(", and ")}.`;
}

/** Which options break a stated budget, labelled by whose budget it is. */
export function computeBounds(
  options: Option[],
  caps: { playerId: string; cap: number | null }[],
  youId: string | null,
): Record<string, Bound> {
  const bounds: Record<string, Bound> = {};
  for (const o of options) {
    const price = o.priceEach;
    if (price === null) continue;
    const broken = caps.filter((c) => c.cap !== null && price > c.cap);
    if (broken.length === 0) continue;
    bounds[o.id] = broken.some((c) => c.playerId === youId) ? "yours" : "theirs";
  }
  return bounds;
}

/** The note shown on an out-of-bounds option, without revealing anyone else's number. */
export function boundNote(round: Round, option: Option): string | null {
  const b = round.bounds[option.id];
  if (!b) return null;
  return b === "yours" && round.yourCap !== null ? `Over your $${round.yourCap} cap` : "Over someone’s budget";
}

// ---------------------------------------------------------------------------
// Demo round. Synthetic data: every name, price and rating here is made up.
// ---------------------------------------------------------------------------

const DEMO_PLAYERS: Player[] = [
  { id: "you", name: "You", color: "blue", isYou: true, isHost: true },
  { id: "sam", name: "Sam", color: "red" },
  { id: "jo", name: "Jo", color: "green" },
  { id: "riya", name: "Riya", color: "violet" },
];

const DEMO_OPTIONS: Option[] = [
  {
    id: "thai-basil",
    name: "Thai Basil Kitchen",
    kind: "Thai · delivery",
    priceEach: 16,
    priceLabel: "About $16 each",
    distance: "Delivers in 25–35 min",
    rating: { score: 4.6, count: 1240 },
    addedBy: "sam",
    source: "ubereats.com",
  },
  {
    id: "pho-88",
    name: "Pho 88",
    kind: "Vietnamese · sit-down",
    priceEach: 14,
    priceLabel: "About $14 each",
    distance: "A 9 min walk",
    rating: { score: 4.4, count: 640 },
    addedBy: "you",
    source: "maps.google.com",
  },
  {
    id: "sushi-zen",
    name: "Sushi Zen Counter",
    kind: "Japanese · omakase counter",
    priceEach: 34,
    priceLabel: "About $34 each",
    distance: "18 min by bus",
    rating: { score: 4.8, count: 310 },
    addedBy: "sam",
    source: "resy.com",
  },
  {
    id: "lasagna",
    name: "Leftover lasagna",
    kind: "At home · already in the fridge",
    priceEach: 0,
    priceLabel: "Free",
    distance: "Ready in 5 min",
    rating: null,
    addedBy: "you",
    source: null,
  },
  {
    id: "la-paloma",
    name: "Taqueria La Paloma",
    kind: "Mexican · counter service",
    priceEach: 12,
    priceLabel: "About $12 each",
    distance: "A 6 min walk",
    rating: { score: 4.7, count: 2310 },
    addedBy: "sam",
    source: "maps.google.com",
  },
  {
    id: "green-fork",
    name: "The Green Fork",
    kind: "Salads & grain bowls · delivery",
    priceEach: 19,
    priceLabel: "About $19 each",
    distance: "Delivers in 20–30 min",
    rating: { score: 4.2, count: 190 },
    addedBy: "you",
    source: "doordash.com",
  },
  {
    id: "mama-rosa",
    name: "Mama Rosa’s Pizzeria & Late-Night Slice Counter",
    kind: "Pizza · by the slice",
    priceEach: 11,
    priceLabel: "About $11 each",
    distance: "A 14 min walk",
    rating: { score: 4.5, count: 980 },
    addedBy: "sam",
    source: "yelp.com",
  },
  {
    id: "shakshuka",
    name: "Cook together: shakshuka",
    kind: "At home · eggs, tomatoes, bread",
    priceEach: 6,
    priceLabel: "About $6 each in groceries",
    distance: "40 min to cook",
    rating: null,
    addedBy: "you",
    source: null,
  },
];

export const DEMO_SCRIPTED: Record<string, Record<string, Vote>> = {
  sam: {
    "thai-basil": "yes",
    "pho-88": "no",
    "sushi-zen": "love",
    lasagna: "no",
    "la-paloma": "love",
    "green-fork": "no",
    "mama-rosa": "yes",
    shakshuka: "yes",
  },
  jo: {
    "thai-basil": "love",
    "pho-88": "yes",
    "sushi-zen": "no",
    lasagna: "no",
    "la-paloma": "yes",
    "green-fork": "yes",
    "mama-rosa": "love",
    shakshuka: "no",
  },
  riya: {
    "thai-basil": "yes",
    "pho-88": "love",
    "sushi-zen": "yes",
    lasagna: "no",
    "la-paloma": "yes",
    "green-fork": "love",
    "mama-rosa": "no",
    shakshuka: "yes",
  },
};

export function demoRound(playerCount: number): Round {
  const count = Math.min(4, Math.max(2, playerCount));
  return {
    slug: "demo",
    question: "Dinner tonight?",
    players: DEMO_PLAYERS.slice(0, count),
    options: DEMO_OPTIONS,
    yourCap: 20,
    yourNote: "Under $20 each tonight",
    bounds: computeBounds(DEMO_OPTIONS, [{ playerId: "you", cap: 20 }], "you"),
  };
}

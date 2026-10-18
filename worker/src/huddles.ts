import { computeBounds, type Marks, type Option, type PlayerColor, type Vote } from "../../src/lib/round";
import { LIMITS, type HuddleStatus, type HuddleView } from "../../src/lib/view";

export type StoredPlayer = {
  id: string;
  name: string;
  color: PlayerColor;
  /** sha-256 of the device token; the raw token only ever lives on the device. */
  deviceHash: string;
  cap: number | null;
  note: string | null;
};

export type StoredHuddle = {
  slug: string;
  question: string;
  status: HuddleStatus;
  version: number;
  roundNo: number;
  hostId: string;
  createdAt: number;
  players: StoredPlayer[];
  options: Option[];
  /** playerId → optionId → vote */
  votes: Record<string, Record<string, Vote>>;
  calledEarly: boolean;
};

const COLORS: readonly PlayerColor[] = ["blue", "red", "green", "violet"];
// No 0/o, 1/l/i: slugs get read aloud and retyped.
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashDevice(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64url(new Uint8Array(digest));
}

export function newSlug(): string {
  // 31 symbols; rejection-sample so every one is equally likely.
  const limit = 256 - (256 % SLUG_ALPHABET.length);
  let s = "";
  while (s.length < 10) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b >= limit || s.length >= 10) continue;
      s += SLUG_ALPHABET.charAt(b % SLUG_ALPHABET.length);
    }
  }
  return s;
}

function newId(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(9)));
}

function findPlayer(h: StoredHuddle, hash: string | null): StoredPlayer | undefined {
  if (hash === null) return undefined;
  return h.players.find((p) => p.deviceHash === hash);
}

// ---------------------------------------------------------------------------
// Input parsing. Everything from the client is untrusted.
// ---------------------------------------------------------------------------

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A dollar amount, or null when left blank. */
function parseMoney(value: unknown): Result<number | null> {
  const raw = clean(value, 12).replace(/^\$/, "").replace(/,/g, "");
  if (raw === "") return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.cap) return fail("Use a dollar amount, like 20.");
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export type PersonInput = { name: unknown; cap: unknown; note: unknown };
type Person = { name: string; cap: number | null; note: string | null };

function parsePerson(input: PersonInput): Result<Person> {
  const name = clean(input.name, LIMITS.name);
  if (!name) return fail("Add your name so the others know whose marks are whose.");
  const cap = parseMoney(input.cap);
  if (!cap.ok) return cap;
  const note = clean(input.note, LIMITS.note);
  return { ok: true, value: { name, cap: cap.value, note: note || null } };
}

export type OptionInput = { text: unknown; details: unknown; price: unknown; distance: unknown };

function parseLink(text: string): URL | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** "maps.google.com/…/Pho+88" → "Pho 88"; falls back to the site name. */
function nameFromLink(url: URL): string {
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts.at(-1);
  const guess = last ? decode(last).replace(/[-_+]+/g, " ").replace(/\.\w+$/, "").trim() : "";
  if (guess && /[a-z]/i.test(guess) && guess.length <= LIMITS.optionName && !/^\d+$/.test(guess)) return guess;
  return url.hostname.replace(/^www\./, "");
}

function parseOption(input: OptionInput, addedBy: string): Result<Option> {
  const text = clean(input.text, LIMITS.optionText);
  if (!text) return fail("Type an option or paste a link.");
  const link = parseLink(text);
  const price = parseMoney(input.price);
  if (!price.ok) return price;
  const details = clean(input.details, LIMITS.details);
  const distance = clean(input.distance, LIMITS.details);
  return {
    ok: true,
    value: {
      id: newId(),
      name: link ? nameFromLink(link) : text.slice(0, LIMITS.optionName),
      kind: details || (link ? "From a link" : "Typed in"),
      priceEach: price.value,
      priceLabel: price.value === null ? null : price.value === 0 ? "Free" : `About $${price.value} each`,
      distance: distance || null,
      rating: null,
      addedBy,
      source: link ? link.hostname.replace(/^www\./, "") : null,
    },
  };
}

const VOTES: readonly Vote[] = ["no", "yes", "love"];
function parseVote(value: unknown): Vote | null | undefined {
  if (value === null) return null;
  return VOTES.find((v) => v === value);
}

function field(body: Record<string, unknown>, key: string): unknown {
  return body[key];
}

export type Action =
  | { type: "join"; person: PersonInput }
  | { type: "me"; person: PersonInput }
  | { type: "add"; option: OptionInput }
  | { type: "remove"; optionId: string }
  | { type: "start" }
  | { type: "vote"; optionId: string; vote: Vote | null }
  | { type: "call" }
  | { type: "runback" };

const ID = /^[\w-]{1,40}$/;

/** Turns a route name and JSON body into an action, or null if it makes no sense. */
export function parseAction(name: string, body: Record<string, unknown>): Action | null {
  const person = (): PersonInput => ({ name: field(body, "name"), cap: field(body, "cap"), note: field(body, "note") });
  const optionId = field(body, "optionId");
  const validId = typeof optionId === "string" && ID.test(optionId) ? optionId : null;
  switch (name) {
    case "join":
      return { type: "join", person: person() };
    case "me":
      return { type: "me", person: person() };
    case "add":
      return {
        type: "add",
        option: {
          text: field(body, "text"),
          details: field(body, "details"),
          price: field(body, "price"),
          distance: field(body, "distance"),
        },
      };
    case "remove":
      return validId === null ? null : { type: "remove", optionId: validId };
    case "start":
      return { type: "start" };
    case "vote": {
      const vote = parseVote(field(body, "vote"));
      return validId === null || vote === undefined ? null : { type: "vote", optionId: validId, vote };
    }
    case "call":
      return { type: "call" };
    case "runback":
      return { type: "runback" };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function markedCount(h: StoredHuddle, playerId: string): number {
  const votes = h.votes[playerId] ?? {};
  return h.options.filter((o) => votes[o.id] !== undefined).length;
}

export function viewFor(h: StoredHuddle, hash: string | null): HuddleView {
  const me = findPlayer(h, hash);
  const marks: Marks = {};
  for (const p of h.players) marks[p.id] = { ...h.votes[p.id] };
  return {
    slug: h.slug,
    question: h.question,
    status: h.status,
    version: h.version,
    roundNo: h.roundNo,
    players: h.players.map((p) => ({
      id: p.id,
      name: p.id === me?.id ? "You" : p.name,
      color: p.color,
      isYou: p.id === me?.id,
      isHost: p.id === h.hostId,
    })),
    options: h.options,
    youId: me?.id ?? null,
    yourName: me?.name ?? null,
    yourCap: me?.cap ?? null,
    yourNote: me?.note ?? null,
    yourMarks: me ? { ...h.votes[me.id] } : {},
    counts: Object.fromEntries(h.players.map((p) => [p.id, markedCount(h, p.id)])),
    bounds: computeBounds(
      h.options,
      h.players.map((p) => ({ playerId: p.id, cap: p.cap })),
      me?.id ?? null,
    ),
    result: h.status === "decided" ? { marks, calledEarly: h.calledEarly } : null,
  };
}

// ---------------------------------------------------------------------------
// Writes. Each one checks who is asking before it changes anything.
// ---------------------------------------------------------------------------

export type CreateInput = PersonInput & { question: unknown };

/** Builds a new huddle for this host, or says what's missing. */
export function newHuddle(slug: string, input: CreateInput, hash: string): Result<StoredHuddle> {
  const question = clean(input.question, LIMITS.question);
  if (!question) return fail("Say what you’re deciding, like “Dinner tonight?”");
  const person = parsePerson(input);
  if (!person.ok) return person;
  const host: StoredPlayer = { id: newId(), color: "blue", deviceHash: hash, ...person.value };
  return {
    ok: true,
    value: {
      slug,
      question,
      status: "collecting",
      version: 1,
      roundNo: 1,
      hostId: host.id,
      createdAt: Date.now(),
      players: [host],
      options: [],
      votes: {},
      calledEarly: false,
    },
  };
}

/** Everyone has marked everything: make the call. */
function settleIfDone(h: StoredHuddle): void {
  if (h.status === "voting" && h.players.every((p) => markedCount(h, p.id) >= h.options.length)) {
    h.status = "decided";
    h.calledEarly = false;
  }
}

function join(h: StoredHuddle, hash: string, input: PersonInput): string | null {
  const person = parsePerson(input);
  if (!person.ok) return person.error;
  if (findPlayer(h, hash)) return null;
  if (h.status === "decided") return "The call’s already been made on this one.";
  if (h.players.length >= LIMITS.players) return `This huddle is full: it’s for up to ${LIMITS.players} people.`;
  const color = COLORS.find((c) => !h.players.some((p) => p.color === c));
  if (!color) return "This huddle is full.";
  h.players.push({ id: newId(), color, deviceHash: hash, ...person.value });
  return null;
}

/**
 * Applies an action as the player on this device. Mutates `h` and returns null,
 * or returns why it can't (in which case `h` should be thrown away).
 */
export function apply(h: StoredHuddle, hash: string, action: Action): string | null {
  if (action.type === "join") return join(h, hash, action.person);

  const me = findPlayer(h, hash);
  if (!me) return "Join this huddle first.";

  switch (action.type) {
    case "me": {
      const person = parsePerson(action.person);
      if (!person.ok) return person.error;
      if (h.status === "decided") return "The call’s already been made.";
      Object.assign(me, person.value);
      return null;
    }
    case "add": {
      if (h.status !== "collecting") return "Voting has started, so the options are locked.";
      if (h.options.length >= LIMITS.options) return `That’s the limit: ${LIMITS.options} options per huddle.`;
      const option = parseOption(action.option, me.id);
      if (!option.ok) return option.error;
      const key = option.value.name.toLowerCase();
      if (h.options.some((o) => o.name.toLowerCase() === key)) return `“${option.value.name}” is already on the board.`;
      h.options.push(option.value);
      return null;
    }
    case "remove": {
      if (h.status !== "collecting") return "Voting has started, so the options are locked.";
      const option = h.options.find((o) => o.id === action.optionId);
      if (!option) return null;
      if (option.addedBy !== me.id && h.hostId !== me.id) return "Only whoever added it, or the host, can take it off.";
      h.options = h.options.filter((o) => o.id !== action.optionId);
      return null;
    }
    case "start":
      if (h.hostId !== me.id) return "Only the person who started the huddle can start the round.";
      if (h.status !== "collecting") return null;
      if (h.options.length < 2) return "Add at least two options first.";
      h.status = "voting";
      return null;
    case "vote": {
      if (h.status === "collecting") return "The round hasn’t started yet.";
      if (h.status === "decided") return "The call’s already been made.";
      if (!h.options.some((o) => o.id === action.optionId)) return "That option isn’t on the board.";
      const mine = Object.entries(h.votes[me.id] ?? {}).filter(([id]) => id !== action.optionId);
      if (action.vote) mine.push([action.optionId, action.vote]);
      h.votes[me.id] = Object.fromEntries(mine);
      settleIfDone(h);
      return null;
    }
    case "call":
      if (h.hostId !== me.id) return "Only the person who started the huddle can call it early.";
      if (h.status !== "voting") return null;
      h.status = "decided";
      h.calledEarly = h.players.some((p) => markedCount(h, p.id) < h.options.length);
      return null;
    case "runback":
      if (h.hostId !== me.id) return "Only the person who started the huddle can run it back.";
      if (h.status !== "decided") return null;
      h.status = "voting";
      h.votes = {};
      h.calledEarly = false;
      h.roundNo += 1;
      return null;
  }
}

import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { computeBounds, type Marks, type Option, type PlayerColor, type Vote } from "@/lib/round";
import { LIMITS, type HuddleView } from "@/lib/view";
import { store, type StoredHuddle, type StoredPlayer } from "@/server/store";

const COLORS: readonly PlayerColor[] = ["blue", "red", "green", "violet"];
// No 0/o, 1/l/i: slugs get read aloud and retyped.
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function newDeviceToken(): string {
  return randomBytes(24).toString("base64url");
}

function hashDevice(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function newSlug(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return s;
}

function newId(): string {
  return randomBytes(9).toString("base64url");
}

function findPlayer(h: StoredHuddle, token: string | null): StoredPlayer | undefined {
  if (!token) return undefined;
  const hash = hashDevice(token);
  return h.players.find((p) => p.deviceHash === hash);
}

// ---------------------------------------------------------------------------
// Input parsing. Everything from the client is untrusted text.
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

function parsePerson(input: PersonInput): Result<{ name: string; cap: number | null; note: string | null }> {
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

/** "maps.google.com/…/Pho+88" → "Pho 88"; falls back to the site name. */
function nameFromLink(url: URL): string {
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts.at(-1);
  const guess = last ? decodeURIComponent(last).replace(/[-_+]+/g, " ").replace(/\.\w+$/, "").trim() : "";
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

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function markedCount(h: StoredHuddle, playerId: string): number {
  const votes = h.votes[playerId] ?? {};
  return h.options.filter((o) => votes[o.id] !== undefined).length;
}

export function viewFor(h: StoredHuddle, token: string | null): HuddleView {
  const me = findPlayer(h, token);
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

export async function getHuddle(slug: string): Promise<StoredHuddle | null> {
  return store.get(slug);
}

// ---------------------------------------------------------------------------
// Writes. Each one checks who is asking before it changes anything.
// ---------------------------------------------------------------------------

export async function createHuddle(
  input: PersonInput & { question: unknown },
  token: string,
): Promise<Result<string>> {
  const question = clean(input.question, LIMITS.question);
  if (!question) return fail("Say what you’re deciding, like “Dinner tonight?”");
  const person = parsePerson(input);
  if (!person.ok) return person;

  const host: StoredPlayer = { id: newId(), color: "blue", deviceHash: hashDevice(token), ...person.value };
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    if (await store.get(slug)) continue;
    await store.create({
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
    });
    return { ok: true, value: slug };
  }
  return fail("Couldn’t start a huddle just now. Try again.");
}

/** Mutates the huddle and returns null, or returns why it can't. */
type Change = (h: StoredHuddle, me: StoredPlayer) => string | null;

/** Runs a change as the player on this device, or refuses. */
async function asPlayer(slug: string, token: string | null, change: Change): Promise<Result<HuddleView>> {
  const updated = await store.update(slug, (h) => {
    const me = findPlayer(h, token);
    if (!me) return "Join this huddle first.";
    return change(h, me);
  });
  if (typeof updated === "string") return fail(updated);
  return { ok: true, value: viewFor(updated, token) };
}

export async function joinHuddle(slug: string, input: PersonInput, token: string): Promise<Result<HuddleView>> {
  const person = parsePerson(input);
  if (!person.ok) return person;
  const updated = await store.update(slug, (h) => {
    if (findPlayer(h, token)) return null;
    if (h.status === "decided") return "The call’s already been made on this one.";
    if (h.players.length >= LIMITS.players) return `This huddle is full: it’s for up to ${LIMITS.players} people.`;
    const color = COLORS.find((c) => !h.players.some((p) => p.color === c));
    if (!color) return "This huddle is full.";
    h.players.push({ id: newId(), color, deviceHash: hashDevice(token), ...person.value });
    return null;
  });
  if (typeof updated === "string") return fail(updated);
  return { ok: true, value: viewFor(updated, token) };
}

export async function updateMe(slug: string, input: PersonInput, token: string | null): Promise<Result<HuddleView>> {
  const person = parsePerson(input);
  if (!person.ok) return person;
  return asPlayer(slug, token, (h, me) => {
    if (h.status === "decided") return "The call’s already been made.";
    Object.assign(me, person.value);
    return null;
  });
}

export async function addOption(slug: string, input: OptionInput, token: string | null): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.status !== "collecting") return "Voting has started, so the options are locked.";
    if (h.options.length >= LIMITS.options) return `That’s the limit: ${LIMITS.options} options per huddle.`;
    const option = parseOption(input, me.id);
    if (!option.ok) return option.error;
    const key = option.value.name.toLowerCase();
    if (h.options.some((o) => o.name.toLowerCase() === key)) return `“${option.value.name}” is already on the board.`;
    h.options.push(option.value);
    return null;
  });
}

export async function removeOption(slug: string, optionId: string, token: string | null): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.status !== "collecting") return "Voting has started, so the options are locked.";
    const option = h.options.find((o) => o.id === optionId);
    if (!option) return null;
    if (option.addedBy !== me.id && h.hostId !== me.id) return "Only whoever added it, or the host, can take it off.";
    h.options = h.options.filter((o) => o.id !== optionId);
    return null;
  });
}

export async function startVoting(slug: string, token: string | null): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.hostId !== me.id) return "Only the person who started the huddle can start the round.";
    if (h.status !== "collecting") return null;
    if (h.options.length < 2) return "Add at least two options first.";
    h.status = "voting";
    return null;
  });
}

/** Everyone has marked everything: make the call. */
function settleIfDone(h: StoredHuddle): void {
  if (h.status === "voting" && h.players.every((p) => markedCount(h, p.id) >= h.options.length)) {
    h.status = "decided";
    h.calledEarly = false;
  }
}

export async function setVote(
  slug: string,
  optionId: string,
  vote: Vote | null,
  token: string | null,
): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.status === "collecting") return "The round hasn’t started yet.";
    if (h.status === "decided") return "The call’s already been made.";
    if (!h.options.some((o) => o.id === optionId)) return "That option isn’t on the board.";
    const mine = (h.votes[me.id] ??= {});
    if (vote) mine[optionId] = vote;
    else delete mine[optionId];
    settleIfDone(h);
    return null;
  });
}

export async function callItNow(slug: string, token: string | null): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.hostId !== me.id) return "Only the person who started the huddle can call it early.";
    if (h.status !== "voting") return null;
    h.status = "decided";
    h.calledEarly = h.players.some((p) => markedCount(h, p.id) < h.options.length);
    return null;
  });
}

export async function runItBack(slug: string, token: string | null): Promise<Result<HuddleView>> {
  return asPlayer(slug, token, (h, me) => {
    if (h.hostId !== me.id) return "Only the person who started the huddle can run it back.";
    if (h.status !== "decided") return null;
    h.status = "voting";
    h.votes = {};
    h.calledEarly = false;
    h.roundNo += 1;
    return null;
  });
}

const VOTES: readonly Vote[] = ["no", "yes", "love"];
export function parseVote(value: unknown): Vote | null | undefined {
  if (value === null) return null;
  return VOTES.find((v) => v === value);
}

import type { Bound, Marks, Option, Player, Round, Vote } from "@/lib/round";

export type HuddleStatus = "collecting" | "voting" | "decided";

/**
 * Everything one device is allowed to see of a huddle. Built on the server per
 * viewer: other people's marks stay hidden until the call, and other people's
 * budgets never leave the server at all.
 */
export type HuddleView = {
  slug: string;
  question: string;
  status: HuddleStatus;
  /** Bumps on every change, so a slow poll can't overwrite a newer answer. */
  version: number;
  /** Bumps when the host runs it back, so devices drop their local marks. */
  roundNo: number;
  /** The viewer is shown as "You"; everyone else by the name they gave. */
  players: Player[];
  options: Option[];
  youId: string | null;
  yourName: string | null;
  yourCap: number | null;
  yourNote: string | null;
  yourMarks: Record<string, Vote>;
  /** How many options each player has marked. */
  counts: Record<string, number>;
  bounds: Record<string, Bound>;
  /** Only once the call is made: everyone's marks. */
  result: { marks: Marks; calledEarly: boolean } | null;
};

export type ActionResult = { ok: true; view: HuddleView } | { ok: false; error: string };

export function toRound(view: HuddleView): Round {
  return {
    slug: view.slug,
    question: view.question,
    players: view.players,
    options: view.options,
    yourCap: view.yourCap,
    yourNote: view.yourNote,
    bounds: view.bounds,
  };
}

export const LIMITS = {
  players: 4,
  options: 20,
  question: 80,
  name: 24,
  optionText: 300,
  optionName: 80,
  details: 80,
  note: 140,
  cap: 10_000,
} as const;

const STATUSES: readonly HuddleStatus[] = ["collecting", "voting", "decided"];

/**
 * Shape check for a polled view. The endpoint is ours, so this guards against
 * error bodies and stale deploys rather than validating every field.
 */
export function isHuddleView(value: unknown): value is HuddleView {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.version === "number" &&
    typeof v.roundNo === "number" &&
    STATUSES.some((s) => s === v.status) &&
    Array.isArray(v.players) &&
    Array.isArray(v.options)
  );
}

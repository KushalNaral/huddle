import "server-only";
import type { Option, PlayerColor, Vote } from "@/lib/round";
import type { HuddleStatus } from "@/lib/view";

export type StoredPlayer = {
  id: string;
  name: string;
  color: PlayerColor;
  /** sha-256 of the device token; the raw token only ever lives in the cookie. */
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

/**
 * Where huddles live. Stage 1 keeps them in memory; Stage 2 swaps in Supabase
 * behind the same shape.
 */
export interface HuddleStore {
  get(slug: string): Promise<StoredHuddle | null>;
  create(huddle: StoredHuddle): Promise<void>;
  /**
   * Applies `change` atomically. The callback mutates the draft in place and
   * returns null, or returns an error string to abort without saving.
   */
  update(slug: string, change: (draft: StoredHuddle) => string | null): Promise<StoredHuddle | string>;
}

class MemoryStore implements HuddleStore {
  private huddles = new Map<string, StoredHuddle>();

  async get(slug: string) {
    const h = this.huddles.get(slug);
    return h ? structuredClone(h) : null;
  }

  async create(huddle: StoredHuddle) {
    if (this.huddles.has(huddle.slug)) throw new Error("Slug taken");
    this.huddles.set(huddle.slug, structuredClone(huddle));
  }

  async update(slug: string, change: (draft: StoredHuddle) => string | null) {
    const current = this.huddles.get(slug);
    if (!current) return "This huddle doesn’t exist anymore.";
    const draft = structuredClone(current);
    const error = change(draft);
    if (error !== null) return error;
    draft.version = current.version + 1;
    this.huddles.set(slug, draft);
    return structuredClone(draft);
  }
}

// Survives dev-server hot reloads; resets when the process restarts.
const globalStore = globalThis as unknown as { __huddleStore?: HuddleStore };
export const store: HuddleStore = (globalStore.__huddleStore ??= new MemoryStore());

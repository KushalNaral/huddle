import { deviceToken } from "./device";
import type { Vote } from "./round";
import { isHuddleView, type ActionResult, type HuddleView } from "./view";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/+$/, "");
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const BAD_RESPONSE = "Huddle sent back something odd. Reload and try again.";

/** Where a huddle lives in the app (static hosting, so the slug is a query). */
export function huddlePath(slug: string): string {
  return `/h/?id=${encodeURIComponent(slug)}`;
}

/** The link people share, including the site's base path. */
export function shareUrl(origin: string, slug: string): string {
  return `${origin}${BASE_PATH}${huddlePath(slug)}`;
}

export function liveUrl(slug: string): string {
  return `${API_URL.replace(/^http/, "ws")}/h/${encodeURIComponent(slug)}/live`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function call(path: string, init: { method: "GET" | "POST"; body?: Record<string, unknown> }): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${deviceToken()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    cache: "no-store",
  });
  return res.json();
}

function toResult(data: unknown): ActionResult {
  if (!isRecord(data)) return { ok: false, error: BAD_RESPONSE };
  if (data.ok === true && isHuddleView(data.view)) return { ok: true, view: data.view };
  if (data.ok === false && typeof data.error === "string") return { ok: false, error: data.error };
  return { ok: false, error: BAD_RESPONSE };
}

function formFields(form: FormData, names: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(names.map((n) => [n, form.get(n)]));
}

const PERSON = ["name", "cap", "note"] as const;

export type CreateResult = { ok: true; slug: string } | { ok: false; error: string };

export async function createHuddle(form: FormData): Promise<CreateResult> {
  const data = await call("/h", { method: "POST", body: formFields(form, ["question", ...PERSON]) });
  if (isRecord(data)) {
    if (data.ok === true && typeof data.slug === "string") return { ok: true, slug: data.slug };
    if (data.ok === false && typeof data.error === "string") return { ok: false, error: data.error };
  }
  return { ok: false, error: BAD_RESPONSE };
}

/** The huddle as this device sees it; null if it doesn't exist. */
export async function getHuddle(slug: string): Promise<HuddleView | null> {
  const data = await call(`/h/${encodeURIComponent(slug)}`, { method: "GET" });
  return isRecord(data) && data.ok === true && isHuddleView(data.view) ? data.view : null;
}

async function act(slug: string, action: string, body: Record<string, unknown> = {}): Promise<ActionResult> {
  return toResult(await call(`/h/${encodeURIComponent(slug)}/${action}`, { method: "POST", body }));
}

export const joinAction = (slug: string, form: FormData) => act(slug, "join", formFields(form, PERSON));
export const updateMeAction = (slug: string, form: FormData) => act(slug, "me", formFields(form, PERSON));
export const addOptionAction = (slug: string, form: FormData) =>
  act(slug, "add", formFields(form, ["text", "details", "price", "distance"]));
export const removeOptionAction = (slug: string, optionId: string) => act(slug, "remove", { optionId });
export const startVotingAction = (slug: string) => act(slug, "start");
export const voteAction = (slug: string, optionId: string, vote: Vote | null) => act(slug, "vote", { optionId, vote });
export const callItAction = (slug: string) => act(slug, "call");
export const runItBackAction = (slug: string) => act(slug, "runback");

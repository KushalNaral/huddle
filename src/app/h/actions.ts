"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/view";
import { ensureDeviceToken, readDeviceToken } from "@/server/device";
import {
  addOption,
  callItNow,
  createHuddle,
  joinHuddle,
  parseVote,
  removeOption,
  runItBack,
  setVote,
  startVoting,
  updateMe,
  type Result,
} from "@/server/huddles";
import type { HuddleView } from "@/lib/view";

// Server Functions are public POST endpoints: every argument is untrusted, so
// they take `unknown` and are checked here and in `@/server/huddles`.

const BAD_REQUEST: ActionResult = { ok: false, error: "That request didn’t make sense. Reload and try again." };

function asId(value: unknown): string | null {
  return typeof value === "string" && /^[\w-]{1,40}$/.test(value) ? value : null;
}

function toAction(result: Result<HuddleView>): ActionResult {
  return result.ok ? { ok: true, view: result.value } : { ok: false, error: result.error };
}

function field(form: unknown, name: string): unknown {
  return form instanceof FormData ? form.get(name) : null;
}

export type CreateState = { error: string | null; values: Record<string, string> };

export async function createHuddleAction(_prev: CreateState, form: FormData): Promise<CreateState> {
  const input = {
    question: field(form, "question"),
    name: field(form, "name"),
    cap: field(form, "cap"),
    note: field(form, "note"),
  };
  const result = await createHuddle(input, await ensureDeviceToken());
  if (!result.ok) {
    const values = Object.fromEntries(
      Object.entries(input).map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
    return { error: result.error, values };
  }
  redirect(`/h/${result.value}`);
}

export async function joinAction(slug: unknown, form: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  const input = { name: field(form, "name"), cap: field(form, "cap"), note: field(form, "note") };
  return toAction(await joinHuddle(id, input, await ensureDeviceToken()));
}

export async function updateMeAction(slug: unknown, form: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  const input = { name: field(form, "name"), cap: field(form, "cap"), note: field(form, "note") };
  return toAction(await updateMe(id, input, await readDeviceToken()));
}

export async function addOptionAction(slug: unknown, form: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  const input = {
    text: field(form, "text"),
    details: field(form, "details"),
    price: field(form, "price"),
    distance: field(form, "distance"),
  };
  return toAction(await addOption(id, input, await readDeviceToken()));
}

export async function removeOptionAction(slug: unknown, optionId: unknown): Promise<ActionResult> {
  const id = asId(slug);
  const option = asId(optionId);
  if (!id || !option) return BAD_REQUEST;
  return toAction(await removeOption(id, option, await readDeviceToken()));
}

export async function startVotingAction(slug: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  return toAction(await startVoting(id, await readDeviceToken()));
}

export async function voteAction(slug: unknown, optionId: unknown, vote: unknown): Promise<ActionResult> {
  const id = asId(slug);
  const option = asId(optionId);
  const v = parseVote(vote);
  if (!id || !option || v === undefined) return BAD_REQUEST;
  return toAction(await setVote(id, option, v, await readDeviceToken()));
}

export async function callItAction(slug: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  return toAction(await callItNow(id, await readDeviceToken()));
}

export async function runItBackAction(slug: unknown): Promise<ActionResult> {
  const id = asId(slug);
  if (!id) return BAD_REQUEST;
  return toAction(await runItBack(id, await readDeviceToken()));
}

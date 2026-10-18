"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { joinAction } from "@/app/h/actions";
import type { RunAction } from "@/components/huddle/use-huddle";
import { PlayerTag } from "@/components/round/player-tag";
import { BUTTON_PRIMARY, Field, Problem, TurfHeader } from "@/components/ui/kit";
import { LIMITS, type HuddleView } from "@/lib/view";

/** Someone opened the link: a name is all it takes to get in. */
export function Join({ view, run }: { view: HuddleView; run: RunAction }) {
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const host = view.players.find((p) => p.isHost);
  const full = view.players.length >= LIMITS.players;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await run(() => joinAction(view.slug, form));
      setProblem(result.ok ? null : result.error);
    });
  }

  const status =
    view.status === "voting" ? "The round has started. Join and mark your way through." : "Adding options now.";

  return (
    <>
      <TurfHeader title={view.question} status={status}>
        <ul className="mt-4 flex flex-wrap gap-2 border-t-2 border-turf-chalk/35 pt-3" aria-label="Who’s in">
          {view.players.map((p) => (
            <li
              key={p.id}
              className="rounded-[4px] bg-sheet px-1.5 pt-0.5 pb-1.5 font-display text-[0.9375rem] leading-none font-bold uppercase tracking-[0.04em] text-ink"
            >
              <PlayerTag player={p} />
            </li>
          ))}
        </ul>
      </TurfHeader>

      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col px-4 pt-7 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {full ? (
          <div>
            <h2 className="font-display text-[2rem] leading-[0.95] font-extrabold uppercase text-ink">This one’s full</h2>
            <p className="mt-2 text-[1.0625rem] text-ink">
              A huddle is for up to {LIMITS.players} people, and they’re all in.
            </p>
            <Link href="/" className={`${BUTTON_PRIMARY} mt-6 grid place-items-center`}>
              Start your own
            </Link>
          </div>
        ) : (
          <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-[2rem] leading-[0.95] font-extrabold uppercase text-ink">
                {host ? `${host.name} wants your vote` : "You’re invited"}
              </h2>
              <p className="mt-2 text-[1.0625rem] text-ink-soft">
                Nobody sees anyone’s marks until the call. No account needed.
              </p>
            </div>
            <Field
              label="Your name"
              name="name"
              required
              maxLength={LIMITS.name}
              autoComplete="given-name"
              placeholder="Sam"
            />
            <Field
              label="Your budget each (optional)"
              name="cap"
              lead="$"
              inputMode="decimal"
              placeholder="20"
              hint="Private. Others only see that something’s over someone’s budget."
            />
            <Problem>{problem}</Problem>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
              {pending ? "Joining…" : "Join the huddle"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}

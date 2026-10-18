"use client";

import { useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { addOptionAction, removeOptionAction, shareUrl, startVotingAction, updateMeAction } from "@/lib/api";
import type { RunAction } from "@/components/huddle/use-huddle";
import { Mark } from "@/components/marks";
import { PlayerTag } from "@/components/round/player-tag";
import { BUTTON_PRIMARY, BUTTON_QUIET, BUTTON_SECONDARY, Field, Problem, TurfHeader } from "@/components/ui/kit";
import { boundNote, type Player } from "@/lib/round";
import { shareOrCopy } from "@/lib/share";
import { LIMITS, toRound, type HuddleView } from "@/lib/view";

type Props = { view: HuddleView; run: RunAction };

/** Before the round: everyone puts options on the board, then the host starts it. */
export function Lobby({ view, run }: Props) {
  const you = view.players.find((p) => p.isYou);
  const host = view.players.find((p) => p.isHost);
  const isHost = you?.isHost === true;
  const n = view.options.length;
  const people = view.players.length;

  return (
    <>
      <TurfHeader
        title={view.question}
        status={`Adding options · ${n} on the board · ${people} ${people === 1 ? "person" : "people"} in`}
      >
        <ul className="mt-4 flex flex-wrap gap-2 border-t-2 border-turf-chalk/35 pt-3" aria-label="Who’s in">
          {view.players.map((p) => (
            <li
              key={p.id}
              className="rounded-[4px] bg-sheet px-1.5 pt-0.5 pb-1.5 font-display text-[0.9375rem] leading-none font-bold uppercase tracking-[0.04em] text-ink"
            >
              <PlayerTag player={p} />
              {p.isHost && <span className="sr-only"> (started it)</span>}
            </li>
          ))}
        </ul>
      </TurfHeader>

      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col gap-8 px-4 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {people < LIMITS.players && <Invite slug={view.slug} alone={people === 1} />}

        <section aria-labelledby="board-heading">
          <h2 id="board-heading" className="font-display text-[1.75rem] leading-none font-extrabold uppercase text-ink">
            On the board
          </h2>
          <OptionList view={view} you={you} run={run} />
          <AddOption slug={view.slug} run={run} full={n >= LIMITS.options} />
        </section>

        <YourBudget view={view} run={run} />

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {isHost ? (
            <StartRound slug={view.slug} run={run} options={n} people={people} />
          ) : (
            <p className="border-t-2 border-rule pt-4 text-center text-[1.0625rem] text-ink">
              {host ? `${host.name} starts the round` : "The round starts"} once everyone’s added theirs.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

const noSubscribe = () => () => {};

function Invite({ slug, alone }: { slug: string; alone: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const url = shareUrl(origin, slug);

  async function share() {
    const outcome = await shareOrCopy({ title: "Huddle", text: "Help us decide:", url });
    if (outcome === "copied" || outcome === "failed") setState(outcome);
  }

  return (
    <section aria-labelledby="invite-heading" className="border-2 border-ink bg-sheet px-4 pt-3.5 pb-4">
      <h2 id="invite-heading" className="font-display text-[1.375rem] leading-none font-extrabold uppercase text-ink">
        {alone ? "Bring them in" : "Anyone else?"}
      </h2>
      <p className="mt-1.5 text-[1rem] text-ink-soft">The link is all they need. No app, no account.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[6px] border-2 border-rule bg-board px-2.5 py-2.5 font-sans text-[0.9375rem] font-semibold text-ink">
          {url.replace(/^https?:\/\//, "")}
        </code>
        <button type="button" onClick={() => void share()} className={`${BUTTON_SECONDARY} shrink-0`}>
          {state === "copied" ? "Copied" : "Share"}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {state === "copied" ? "Link copied." : ""}
      </p>
      {state === "failed" && (
        <div className="mt-2">
          <Problem>Couldn’t copy from this browser. Select the link and copy it by hand.</Problem>
        </div>
      )}
    </section>
  );
}

function OptionList({ view, you, run }: { view: HuddleView; you: Player | undefined; run: RunAction }) {
  const [pending, startTransition] = useTransition();
  const round = toRound(view);
  const byId = (id: string) => view.players.find((p) => p.id === id);

  if (view.options.length === 0) {
    return (
      <p className="mt-3 border-y-2 border-dashed border-rule py-5 text-center text-[1.0625rem] text-ink-soft">
        Nothing up yet. Put the first one on the board.
      </p>
    );
  }

  return (
    <ul className="mt-3 border-b-2 border-rule">
      {view.options.map((o) => {
        const addedBy = byId(o.addedBy);
        const canRemove = you !== undefined && (o.addedBy === you.id || you.isHost === true);
        const note = boundNote(round, o);
        return (
          <li key={o.id} className="grid grid-cols-[1fr_auto] items-start gap-3 border-t-2 border-rule py-3">
            <div className="min-w-0">
              <p className="text-[1.125rem] leading-tight font-semibold text-ink [overflow-wrap:anywhere]">{o.name}</p>
              <p className="mt-0.5 text-[0.9375rem] text-ink-soft">
                {[o.kind, o.priceLabel, o.distance].filter(Boolean).join(" · ")}
              </p>
              {note && (
                <p className="mt-1 flex items-center gap-1.5 font-display text-[0.875rem] font-bold uppercase tracking-[0.03em] text-ink">
                  <Mark vote="no" color="currentColor" className="h-3 w-5" strokeWidth={14} />
                  {note}
                </p>
              )}
              <p className="mt-1 text-[0.875rem] text-ink-soft">
                Added by {addedBy ? <PlayerTag player={addedBy} className="font-semibold text-ink" /> : "someone"}
                {o.source ? `, from ${o.source}` : ""}
              </p>
            </div>
            {canRemove && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await run(() => removeOptionAction(view.slug, o.id))))}
                className={`${BUTTON_QUIET} mt-0.5 shrink-0`}
              >
                Take off<span className="sr-only"> {o.name}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddOption({ slug, run, full }: { slug: string; run: RunAction; full: boolean }) {
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      const result = await run(() => addOptionAction(slug, form));
      if (result.ok) {
        formEl.reset();
        setProblem(null);
        textRef.current?.focus();
      } else {
        setProblem(result.error);
      }
    });
  }

  if (full) {
    return <p className="mt-3 text-[0.9375rem] text-ink-soft">That’s {LIMITS.options} options, the most a huddle holds.</p>;
  }

  return (
    <form method="post" onSubmit={onSubmit} className="mt-4 flex flex-col gap-3" aria-label="Add an option">
      <div className="flex items-end gap-2">
        <Field
          ref={textRef}
          label="Add an option"
          name="text"
          required
          maxLength={LIMITS.optionText}
          placeholder="Paste a link or type one"
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1"
        />
        <button type="submit" disabled={pending} className={`${BUTTON_SECONDARY} shrink-0`}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {details ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="What is it" name="details" maxLength={LIMITS.details} placeholder="Thai · delivery" className="col-span-2" />
          <Field label="Price each" name="price" lead="$" inputMode="decimal" placeholder="16" />
          <Field label="Getting there" name="distance" maxLength={LIMITS.details} placeholder="10 min walk" />
        </div>
      ) : (
        <button type="button" onClick={() => setDetails(true)} className={`${BUTTON_QUIET} self-start`}>
          Add a price or details
        </button>
      )}
      <Problem>{problem}</Problem>
    </form>
  );
}

function YourBudget({ view, run }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("name", view.yourName ?? "");
    startTransition(async () => {
      const result = await run(() => updateMeAction(view.slug, form));
      if (result.ok) {
        setEditing(false);
        setProblem(null);
      } else {
        setProblem(result.error);
      }
    });
  }

  const summary =
    view.yourCap === null ? "No budget set." : `Up to $${view.yourCap} each.`;

  return (
    <section aria-labelledby="budget-heading" className="border-t-2 border-ink pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="budget-heading" className="font-display text-[1.375rem] leading-none font-extrabold uppercase text-ink">
          Your budget
        </h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={BUTTON_QUIET}>
            {view.yourCap === null ? "Set one" : "Change"}
          </button>
        )}
      </div>
      {editing ? (
        <form method="post" onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
          <Field
            label="Budget each"
            name="cap"
            lead="$"
            inputMode="decimal"
            placeholder="20"
            defaultValue={view.yourCap === null ? "" : String(view.yourCap)}
            hint="Leave it blank for no limit."
          />
          <Field
            label="Anything else"
            name="note"
            maxLength={LIMITS.note}
            placeholder="No seafood"
            defaultValue={view.yourNote ?? ""}
            hint="Saved for now. Huddle starts reading these soon."
          />
          <Problem>{problem}</Problem>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={`${BUTTON_SECONDARY} flex-1`}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={BUTTON_QUIET}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 text-[1rem] text-ink">
          {summary}{" "}
          <span className="text-ink-soft">Only Huddle sees the number. Others just see “over someone’s budget”.</span>
        </p>
      )}
    </section>
  );
}

function StartRound({ slug, run, options, people }: { slug: string; run: RunAction; options: number; people: number }) {
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const ready = options >= 2;

  const hint = !ready
    ? `Add ${options === 0 ? "two options" : "one more option"} to start.`
    : people === 1
      ? "Nobody else is in yet. They can still join once it starts."
      : `${options} options, ${people} people. Options lock when it starts.`;

  return (
    <>
      <Problem>{problem}</Problem>
      <button
        type="button"
        disabled={!ready || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await run(() => startVotingAction(slug));
            setProblem(result.ok ? null : result.error);
          })
        }
        className={BUTTON_PRIMARY}
      >
        {pending ? "Starting…" : "Start the round"}
      </button>
      <p className="text-center text-[0.875rem] text-ink-soft">{hint}</p>
    </>
  );
}


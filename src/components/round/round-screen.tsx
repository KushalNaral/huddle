"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VOTE_PAST } from "@/components/marks";
import { Reveal } from "@/components/round/reveal";
import { Scoreboard } from "@/components/round/scoreboard";
import { SwipeDeck } from "@/components/round/swipe-deck";
import { Waiting } from "@/components/round/waiting";
import { tally, type Marks, type Option, type Round, type Vote } from "@/lib/round";

type Phase = "swipe" | "waiting" | "reveal";

// Demo pacing for everyone else's progress. Live rounds get this from realtime.
const OTHERS_START: Record<string, number> = { sam: 2, jo: 1, riya: 3 };
const OTHERS_STEP_MS: Record<string, number> = { sam: 2300, jo: 2700, riya: 3100 };

export function RoundScreen({ round, reasonFails }: { round: Round; reasonFails: boolean }) {
  const you = round.players.find((p) => p.isYou)!;
  const others = round.players.filter((p) => !p.isYou);
  const total = round.options.length;

  const [yourMarks, setYourMarks] = useState<Record<string, Vote>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [returnedId, setReturnedId] = useState<string | null>(null);
  const [otherCounts, setOtherCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(others.map((p) => [p.id, OTHERS_START[p.id] ?? 0])),
  );
  const [phase, setPhase] = useState<Phase>("swipe");
  const [calledEarly, setCalledEarly] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const index = history.length;
  const counts = useMemo(() => ({ ...otherCounts, [you.id]: index }), [otherCounts, you.id, index]);
  const othersDone = others.every((p) => (otherCounts[p.id] ?? 0) >= total);

  // Everyone else keeps marking while you do.
  useEffect(() => {
    if (phase === "reveal") return;
    const timers = others.map((p) =>
      window.setInterval(() => {
        setOtherCounts((c) => ({ ...c, [p.id]: Math.min(total, (c[p.id] ?? 0) + 1) }));
      }, OTHERS_STEP_MS[p.id] ?? 2500),
    );
    return () => timers.forEach(window.clearInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, total]);

  // Once you are done, the call comes as soon as everyone else is.
  useEffect(() => {
    if (phase !== "waiting" || !othersDone) return;
    const t = window.setTimeout(() => setPhase("reveal"), 900);
    return () => window.clearTimeout(t);
  }, [phase, othersDone]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  const marks: Marks = useMemo(() => {
    const m: Marks = { [you.id]: yourMarks };
    for (const p of others) {
      const script = round.scripted[p.id] ?? {};
      const n = otherCounts[p.id] ?? 0;
      m[p.id] = Object.fromEntries(round.options.slice(0, n).map((o) => [o.id, script[o.id]]));
    }
    return m;
  }, [you.id, yourMarks, others, otherCounts, round]);

  const onVote = useCallback(
    (vote: Vote) => {
      const option = round.options[index];
      if (!option) return;
      setYourMarks((m) => ({ ...m, [option.id]: vote }));
      setHistory((h) => [...h, option.id]);
      setReturnedId(null);
      const next = round.options[index + 1];
      setAnnouncement(`You ${VOTE_PAST[vote]} ${option.name}. ${next ? `Next: ${next.name}.` : "That was the last one."}`);
      if (!next) setPhase("waiting");
    },
    [round.options, index],
  );

  const onUndo = useCallback(() => {
    const id = history.at(-1);
    if (!id) return;
    const option = round.options.find((o) => o.id === id);
    setHistory((h) => h.slice(0, -1));
    setYourMarks((m) => {
      const rest = { ...m };
      delete rest[id];
      return rest;
    });
    setReturnedId(id);
    setPhase("swipe");
    setAnnouncement(`Took back your mark on ${option?.name}.`);
  }, [history, round.options]);

  const runItBack = useCallback(() => {
    setYourMarks({});
    setHistory([]);
    setReturnedId(null);
    setOtherCounts(Object.fromEntries(others.map((p) => [p.id, OTHERS_START[p.id] ?? 0])));
    setCalledEarly(false);
    setPhase("swipe");
    setAnnouncement("New round. Same options.");
  }, [others]);

  const lastId = history.at(-1);
  const lastVote: { option: Option; vote: Vote } | null = lastId
    ? { option: round.options.find((o) => o.id === lastId)!, vote: yourMarks[lastId] }
    : null;

  const current = round.options[index];
  const upcoming = round.options[index + 1];
  const left = total - index;
  const status =
    phase === "reveal"
      ? "The call is in."
      : phase === "waiting"
        ? othersDone
          ? "Everyone’s marks are in."
          : `Waiting on ${others
              .filter((p) => (otherCounts[p.id] ?? 0) < total)
              .map((p) => p.name)
              .join(" and ")}.`
        : `${left} left${upcoming ? ` · next: ${upcoming.name}` : " · last one"}`;

  return (
    <>
      <Scoreboard question={round.question} status={status} players={round.players} counts={counts} total={total} />
      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col px-4">
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        {phase === "swipe" && current && (
          <SwipeDeck
            round={round}
            you={you}
            index={index}
            lastVote={lastVote}
            returnedId={returnedId}
            onVote={onVote}
            onUndo={onUndo}
          />
        )}
        {phase === "waiting" && (
          <Waiting
            round={round}
            you={you}
            marks={marks}
            counts={counts}
            everyoneIn={othersDone}
            onCallNow={() => {
              setCalledEarly(true);
              setPhase("reveal");
            }}
            onUndo={onUndo}
          />
        )}
        {phase === "reveal" && (
          <Reveal
            round={round}
            tally={tally(round, marks)}
            marks={marks}
            counts={counts}
            calledEarly={calledEarly}
            reasonFails={reasonFails}
            onRunItBack={runItBack}
          />
        )}
      </main>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { VOTE_PAST } from "@/components/marks";
import { Reveal } from "@/components/round/reveal";
import { Scoreboard } from "@/components/round/scoreboard";
import { SwipeDeck } from "@/components/round/swipe-deck";
import { Waiting } from "@/components/round/waiting";
import { tally, type Marks, type Option, type Round, type Vote } from "@/lib/round";

/**
 * What drives a round. The demo fakes everyone else on a timer; a live huddle
 * gets it from the server. The screen itself doesn't know which.
 */
export type RoundState = {
  yourMarks: Record<string, Vote>;
  /** How many options each other player has marked. */
  otherCounts: Record<string, number>;
  /** Set once the call is made. */
  result: { marks: Marks; calledEarly: boolean } | null;
  /** Marks are made in order, so a null clears your most recent one. */
  setMark: (optionId: string, vote: Vote | null) => void;
  /** Null unless you can call it early. */
  callNow: (() => void) | null;
  /** Null unless you can restart the round. */
  runItBack: (() => void) | null;
};

type Props = {
  round: Round;
  state: RoundState;
  reasonFails?: boolean;
  footnote?: string | undefined;
};

export function RoundScreen({ round, state, reasonFails = false, footnote }: Props) {
  const { yourMarks, otherCounts, result, setMark, runItBack } = state;
  const you = round.players.find((p) => p.isYou);
  const others = round.players.filter((p) => !p.isYou);
  const total = round.options.length;

  const [returnedId, setReturnedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // You mark options in order, so your marks are always a prefix of the list.
  const firstUnmarked = round.options.findIndex((o) => yourMarks[o.id] === undefined);
  const index = firstUnmarked === -1 ? total : firstUnmarked;
  const counts: Record<string, number> = you ? { ...otherCounts, [you.id]: index } : otherCounts;
  const othersDone = others.every((p) => (otherCounts[p.id] ?? 0) >= total);
  const phase = result ? "reveal" : index >= total ? "waiting" : "swipe";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  function onVote(vote: Vote) {
    const option = round.options[index];
    if (!option) return;
    setMark(option.id, vote);
    setReturnedId(null);
    const next = round.options[index + 1];
    setAnnouncement(`You ${VOTE_PAST[vote]} ${option.name}. ${next ? `Next: ${next.name}.` : "That was the last one."}`);
  }

  const lastOption: Option | undefined = round.options[index - 1];
  const lastMark = lastOption ? yourMarks[lastOption.id] : undefined;
  const lastVote = lastOption && lastMark ? { option: lastOption, vote: lastMark } : null;

  function onUndo() {
    if (!lastOption) return;
    setMark(lastOption.id, null);
    setReturnedId(lastOption.id);
    setAnnouncement(`Took back your mark on ${lastOption.name}.`);
  }

  const upcoming = round.options[index + 1];
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
        : `${total - index} left${upcoming ? ` · next: ${upcoming.name}` : " · last one"}`;

  return (
    <>
      <Scoreboard question={round.question} status={status} players={round.players} counts={counts} total={total} />
      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col px-4">
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        {phase === "swipe" && you && (
          <SwipeDeck
            round={round}
            you={you}
            index={index}
            lastVote={lastVote}
            returnedId={returnedId}
            onVote={onVote}
            onUndo={onUndo}
            footnote={footnote}
          />
        )}
        {phase === "waiting" && you && (
          <Waiting
            round={round}
            you={you}
            marks={{ [you.id]: yourMarks }}
            counts={counts}
            everyoneIn={othersDone}
            onCallNow={state.callNow}
            onUndo={onUndo}
          />
        )}
        {result && (
          <Reveal
            round={round}
            tally={tally(round, result.marks)}
            marks={result.marks}
            counts={counts}
            calledEarly={result.calledEarly}
            reasonFails={reasonFails}
            onRunItBack={
              runItBack
                ? () => {
                    setReturnedId(null);
                    setAnnouncement("New round. Same options.");
                    runItBack();
                  }
                : null
            }
            footnote={footnote}
          />
        )}
      </main>
    </>
  );
}

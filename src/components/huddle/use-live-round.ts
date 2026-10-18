"use client";

import { useCallback, useState } from "react";
import { callItAction, runItBackAction, voteAction } from "@/app/h/actions";
import type { RunAction } from "@/components/huddle/use-huddle";
import type { RoundState } from "@/components/round/round-screen";
import type { Vote } from "@/lib/round";
import type { HuddleView } from "@/lib/view";

/**
 * Drives a live round. Your marks change locally first so swiping never waits
 * on the network; the server gets each one in order and stays the truth for
 * everyone else's progress and for the call.
 */
export function useLiveRound(view: HuddleView, run: RunAction): RoundState {
  const [local, setLocal] = useState({ roundNo: view.roundNo, marks: view.yourMarks });

  // The host ran it back: start from the server's (empty) marks.
  let marks = local.marks;
  if (local.roundNo !== view.roundNo) {
    marks = view.yourMarks;
    setLocal({ roundNo: view.roundNo, marks });
  }

  const { slug, youId } = view;
  const isHost = view.players.some((p) => p.isYou && p.isHost);

  const setMark = useCallback(
    (optionId: string, vote: Vote | null) => {
      setLocal((s) => {
        const next = { ...s.marks };
        if (vote) next[optionId] = vote;
        else delete next[optionId];
        return { ...s, marks: next };
      });
      void run(() => voteAction(slug, optionId, vote)).then((result) => {
        // Rejected (say, the host called it mid-swipe): fall back to the server's record.
        if (!result.ok) setLocal((s) => ({ ...s, marks: view.yourMarks }));
      });
    },
    [run, slug, view.yourMarks],
  );

  const otherCounts = Object.fromEntries(Object.entries(view.counts).filter(([id]) => id !== youId));

  return {
    yourMarks: marks,
    otherCounts,
    result: view.result,
    setMark,
    callNow: isHost && view.status === "voting" ? () => void run(() => callItAction(slug)) : null,
    runItBack: isHost ? () => void run(() => runItBackAction(slug)) : null,
  };
}

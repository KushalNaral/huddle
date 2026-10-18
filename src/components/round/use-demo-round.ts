"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoundState } from "@/components/round/round-screen";
import { DEMO_SCRIPTED, type Marks, type Round, type Vote } from "@/lib/round";

// Demo pacing for everyone else's progress. Live huddles get this from the server.
const OTHERS_START: Record<string, number> = { sam: 2, jo: 1, riya: 3 };
const OTHERS_STEP_MS: Record<string, number> = { sam: 2300, jo: 2700, riya: 3100 };

/** Drives `/h/demo`: scripted players mark on a timer while you swipe. */
export function useDemoRound(round: Round): RoundState {
  const others = useMemo(() => round.players.filter((p) => !p.isYou), [round.players]);
  const you = round.players.find((p) => p.isYou);
  const total = round.options.length;
  const startCounts = useCallback(
    () => Object.fromEntries(others.map((p) => [p.id, OTHERS_START[p.id] ?? 0])),
    [others],
  );

  const [yourMarks, setYourMarks] = useState<Record<string, Vote>>({});
  const [otherCounts, setOtherCounts] = useState<Record<string, number>>(startCounts);
  const [result, setResult] = useState<RoundState["result"]>(null);

  const youDone = Object.keys(yourMarks).length >= total;
  const othersDone = others.every((p) => (otherCounts[p.id] ?? 0) >= total);

  const snapshot = useCallback((): Marks => {
    const m: Marks = you ? { [you.id]: yourMarks } : {};
    for (const p of others) {
      const script = DEMO_SCRIPTED[p.id] ?? {};
      const n = otherCounts[p.id] ?? 0;
      m[p.id] = Object.fromEntries(round.options.slice(0, n).map((o) => [o.id, script[o.id]]));
    }
    return m;
  }, [you, yourMarks, others, otherCounts, round.options]);

  // Everyone else keeps marking while you do.
  useEffect(() => {
    if (result) return;
    const timers = others.map((p) =>
      window.setInterval(() => {
        setOtherCounts((c) => ({ ...c, [p.id]: Math.min(total, (c[p.id] ?? 0) + 1) }));
      }, OTHERS_STEP_MS[p.id] ?? 2500),
    );
    return () => timers.forEach(window.clearInterval);
  }, [result, others, total]);

  // Once you are done, the call comes as soon as everyone else is.
  useEffect(() => {
    if (result || !youDone || !othersDone) return;
    const t = window.setTimeout(() => setResult({ marks: snapshot(), calledEarly: false }), 900);
    return () => window.clearTimeout(t);
  }, [result, youDone, othersDone, snapshot]);

  const setMark = useCallback((optionId: string, vote: Vote | null) => {
    setYourMarks((m) => {
      const rest = { ...m };
      if (vote) rest[optionId] = vote;
      else delete rest[optionId];
      return rest;
    });
  }, []);

  return {
    yourMarks,
    otherCounts,
    result,
    setMark,
    callNow: () => setResult({ marks: snapshot(), calledEarly: true }),
    runItBack: () => {
      setYourMarks({});
      setOtherCounts(startCounts());
      setResult(null);
    },
  };
}

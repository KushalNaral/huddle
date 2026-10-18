"use client";

import { useMemo } from "react";
import { RoundScreen } from "@/components/round/round-screen";
import { useDemoRound } from "@/components/round/use-demo-round";
import { demoRound } from "@/lib/round";

export function DemoRound({ players, reasonFails }: { players: number; reasonFails: boolean }) {
  const round = useMemo(() => demoRound(players), [players]);
  const state = useDemoRound(round);
  return (
    <RoundScreen
      round={round}
      state={state}
      reasonFails={reasonFails}
      footnote="Demo round: places, prices and ratings are made up."
    />
  );
}

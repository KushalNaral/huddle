"use client";

import { Join } from "@/components/huddle/join";
import { Lobby } from "@/components/huddle/lobby";
import { useHuddle, type RunAction } from "@/components/huddle/use-huddle";
import { useLiveRound } from "@/components/huddle/use-live-round";
import { RoundScreen } from "@/components/round/round-screen";
import { Problem } from "@/components/ui/kit";
import { toRound, type HuddleView } from "@/lib/view";

/** One huddle on one device: join, add options, swipe, see the call. */
export function LiveHuddle({ initial }: { initial: HuddleView }) {
  const { view, error, clearError, run } = useHuddle(initial);

  return (
    <>
      <Screen view={view} run={run} />
      {error && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[30rem] items-start gap-3 border-2 border-ink bg-sheet px-3.5 py-3 shadow-[0_6px_16px_-6px_rgb(27_29_34/0.45)]">
            <div className="flex-1">
              <Problem>{error}</Problem>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="-my-1 rounded-[6px] px-2 py-1 font-display text-[1rem] font-bold uppercase text-ink hover:bg-board"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Screen({ view, run }: { view: HuddleView; run: RunAction }) {
  if (view.youId === null) {
    // Too late to join: show the call to anyone with the link.
    if (view.status === "decided") return <LiveRound view={view} run={run} />;
    return <Join view={view} run={run} />;
  }
  switch (view.status) {
    case "collecting":
      return <Lobby view={view} run={run} />;
    case "voting":
    case "decided":
      return <LiveRound view={view} run={run} />;
  }
}

function LiveRound({ view, run }: { view: HuddleView; run: RunAction }) {
  const state = useLiveRound(view, run);
  return <RoundScreen round={toRound(view)} state={state} />;
}

"use client";

import { useState, type CSSProperties } from "react";
import { MARKER, Mark, VOTE_PAST } from "@/components/marks";
import { PlayerTag } from "@/components/round/player-tag";
import { explain, type Marks, type Round, type Tally } from "@/lib/round";

type Props = {
  round: Round;
  tally: Tally;
  marks: Marks;
  counts: Record<string, number>;
  calledEarly: boolean;
  reasonFails: boolean;
  onRunItBack: () => void;
};

const TIE_NOTE = {
  loves: "more circles",
  nos: "fewer cross-outs",
  order: "it was added first",
} as const;

/** The call: one winner, ringed, with the whole board underneath to prove it. */
export function Reveal({ round, tally, marks, counts, calledEarly, reasonFails, onRunItBack }: Props) {
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const winner = tally.rows[0];
  const runnerUp = tally.rows[1];
  const total = round.options.length;
  const o = winner.option;
  const reason = reasonFails ? null : explain(round, winner);
  const shortOn = round.players.filter((p) => (counts[p.id] ?? 0) < total);

  async function share() {
    const url = window.location.href;
    const text = `The call for “${round.question}”: ${o.name}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Huddle", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared("copied");
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") setShared("failed");
    }
  }

  return (
    <div className="flex flex-1 flex-col pt-7 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <section aria-labelledby="the-call">
        <div className="relative isolate px-7 py-7">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <Mark vote="love" color="var(--color-call)" stretch strokeWidth={9} animate duration={720} delay={150} className="size-full" />
          </div>
          <h2
            id="the-call"
            className="font-display text-[clamp(2.75rem,14vw,4rem)] leading-[0.86] font-extrabold uppercase text-balance text-ink"
          >
            <span className="sr-only">The call: </span>
            {o.name}
          </h2>
          <p className="mt-2 text-[1.0625rem] font-medium text-ink-soft">{o.kind}</p>
        </div>

        <div className="rise mt-4" style={{ "--rise-delay": "650ms" } as CSSProperties}>
          {reason ? (
            <p className="max-w-[36ch] text-[1.25rem] leading-snug font-medium text-ink">{reason}</p>
          ) : (
            <p className="max-w-[38ch] text-[1.0625rem] leading-snug text-ink">
              Couldn’t write the reason this time. The board below shows exactly how it won.
            </p>
          )}
          {(tally.tieBreak || calledEarly || tally.filtered.length > 0) && (
            <ul className="mt-3 flex flex-col gap-1 text-[0.9375rem] text-ink-soft">
              {tally.filtered.map((r) => (
                <li key={r.option.id}>
                  {r.option.name} scored {r.points === winner.points ? "as well" : "higher"}, but it’s over your $
                  {round.yourCap} cap.
                </li>
              ))}
              {tally.tieBreak && runnerUp && (
                <li>
                  Tied with {runnerUp.option.name} on points; it won on{" "}
                  {tally.tieBreak === "order" ? "order: " : ""}
                  {TIE_NOTE[tally.tieBreak]}.
                </li>
              )}
              {calledEarly && shortOn.length > 0 && (
                <li>
                  Called early.{" "}
                  {shortOn.map((p) => `${p.name} marked ${counts[p.id] ?? 0} of ${total}`).join(", ")}.
                </li>
              )}
            </ul>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={share}
              className="h-14 rounded-[10px] border-2 border-ink bg-ink font-display text-[1.25rem] font-bold uppercase tracking-[0.03em] text-sheet transition-[transform,background-color] duration-150 hover:bg-turf-deep active:translate-y-0.5"
            >
              {shared === "copied" ? "Link copied" : "Share the call"}
            </button>
            <button
              type="button"
              onClick={onRunItBack}
              className="h-14 rounded-[10px] border-2 border-ink bg-sheet font-display text-[1.25rem] font-bold uppercase tracking-[0.03em] text-ink hover:bg-board active:translate-y-0.5"
            >
              Run it back
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {shared === "copied" ? "Link copied to clipboard." : shared === "failed" ? "Couldn’t share. Copy the address bar link instead." : ""}
          </p>
          {shared === "failed" && (
            <p className="mt-2 text-[0.9375rem] text-marker-red">Couldn’t share from this browser. Copy the link from the address bar instead.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="board-heading" className="mt-9">
        <h3 id="board-heading" className="font-display text-[1.5rem] font-extrabold uppercase text-ink">
          How the board fell
        </h3>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">Circle 2 points, tick 1, cross-out minus 1.</p>
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-2 font-display text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink-soft">
                Option
              </th>
              {round.players.map((p) => (
                <th key={p.id} scope="col" className="w-11 px-0.5 py-2 text-center font-display text-[0.9375rem] font-bold uppercase text-ink">
                  <PlayerTag player={p} />
                </th>
              ))}
              <th scope="col" className="w-11 py-2 pl-1 text-right font-display text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink-soft">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {tally.rows.map((row, r) => (
              <tr key={row.option.id} className={`border-b-2 border-rule ${r === 0 ? "bg-call-wash" : ""}`}>
                <th scope="row" className="py-2.5 pr-2 pl-1.5 text-[1rem] leading-tight font-semibold text-ink">
                  {row.option.name}
                  {row.outOfBounds && (
                    <span className="mt-0.5 block font-display text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-ink">
                      Over your ${round.yourCap} cap
                    </span>
                  )}
                </th>
                {round.players.map((p, c) => {
                  const v = marks[p.id]?.[row.option.id];
                  return (
                    <td key={p.id} className="px-0.5 py-1 text-center">
                      {v ? (
                        <>
                          <Mark
                            vote={v}
                            color={MARKER[p.color]}
                            strokeWidth={v === "love" ? 13 : 16}
                            animate
                            duration={160}
                            delay={900 + r * 70 + c * 35}
                            className="mx-auto size-8"
                          />
                          <span className="sr-only">{`${p.name} ${VOTE_PAST[v]} it`}</span>
                        </>
                      ) : (
                        <span className="text-ink-soft">
                          <span aria-hidden="true">–</span>
                          <span className="sr-only">{`${p.name} didn’t mark it`}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 pl-1 text-right font-jersey text-[1.125rem] text-ink">
                  {row.points > 0 ? `+${row.points}` : row.points < 0 ? `−${Math.abs(row.points)}` : "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-8 text-center text-[0.8125rem] text-ink-soft">
        Demo round: places, prices and ratings are made up.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MARKER, Mark, VOTE_LABEL, VOTE_PAST } from "@/components/marks";
import { OptionSheet } from "@/components/round/option-sheet";
import { boundNote, type Option, type Player, type Round, type Vote } from "@/lib/round";

type Props = {
  round: Round;
  you: Player;
  index: number;
  lastVote: { option: Option; vote: Vote } | null;
  /** The option undo just put back, so it can animate in. */
  returnedId: string | null;
  onVote: (vote: Vote) => void;
  onUndo: () => void;
  footnote?: string | undefined;
};

type Drag = { x: number; y: number };
type Exiting = { option: Option; vote: Vote; from: Drag; key: number };

const COMMIT = 96;
const PREVIEW = 110;

function intent({ x, y }: Drag): { vote: Vote; progress: number } | null {
  if (-y > Math.abs(x) && y < 0) return { vote: "love", progress: Math.min(1, -y / PREVIEW) };
  if (x > 0) return { vote: "yes", progress: Math.min(1, x / PREVIEW) };
  if (x < 0) return { vote: "no", progress: Math.min(1, -x / PREVIEW) };
  return null;
}

export function SwipeDeck({ round, you, index, lastVote, returnedId, onVote, onUndo, footnote }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [exiting, setExiting] = useState<Exiting | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const exitKey = useRef(0);

  const current = round.options[index];
  const playerById = (id: string) => round.players.find((p) => p.id === id);
  const capNote = (o: Option) => boundNote(round, o);

  const commit = useCallback(
    (vote: Vote, from: Drag = { x: 0, y: 0 }) => {
      if (!current) return;
      exitKey.current += 1;
      setExiting({ option: current, vote, from, key: exitKey.current });
      setDrag(null);
      onVote(vote);
    },
    [current, onVote],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowLeft") commit("no");
      else if (e.key === "ArrowRight") commit("yes");
      else if (e.key === "ArrowUp") commit("love");
      else if ((e.key === "z" || e.key === "Z" || e.key === "Backspace") && lastVote) onUndo();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, lastVote, onUndo]);

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      setDrag({ x: 0, y: 0 });
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (!start.current || start.current.id !== e.pointerId) return;
      setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
    },
    onPointerUp(e: React.PointerEvent<HTMLElement>) {
      if (!start.current || start.current.id !== e.pointerId) return;
      const released = { x: e.clientX - start.current.x, y: e.clientY - start.current.y };
      start.current = null;
      const i = intent(released);
      const far = i?.vote === "love" ? -released.y > COMMIT : Math.abs(released.x) > COMMIT;
      if (i && far) commit(i.vote, released);
      else setDrag(null);
    },
    onPointerCancel() {
      start.current = null;
      setDrag(null);
    },
  };

  const preview = drag ? intent(drag) : null;
  const frontStyle: CSSProperties = drag
    ? { transform: `translate(${drag.x}px, ${Math.min(drag.y, 40)}px) rotate(${drag.x / 22}deg)`, transition: "none" }
    : {};

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mt-7">
        {current && (
          <OptionSheet
            key={current.id}
            option={current}
            addedBy={playerById(current.addedBy)}
            overCapNote={capNote(current)}
            markColor={you.color}
            preview={preview}
            className={`z-10 cursor-grab touch-none select-none transition-transform duration-300 ease-[var(--ease-out-expo)] active:cursor-grabbing ${
              current.id === returnedId ? "card-return" : index > 0 ? "card-enter" : ""
            }`}
            style={frontStyle}
            handlers={handlers}
          />
        )}
        {exiting && (
          <OptionSheet
            key={`exit-${exiting.key}`}
            option={exiting.option}
            addedBy={playerById(exiting.option.addedBy)}
            overCapNote={capNote(exiting.option)}
            markColor={you.color}
            committed={exiting.vote}
            inert
            className={`absolute inset-x-0 top-0 z-20 exit-${exiting.vote}`}
            style={{ "--from-x": `${exiting.from.x}px`, "--from-y": `${Math.min(exiting.from.y, 40)}px` } as CSSProperties}
            handlers={{
              onAnimationEnd: (e) => {
                if (e.target === e.currentTarget) setExiting((x) => (x?.key === exiting.key ? null : x));
              },
            }}
          />
        )}
      </div>

      <div className="pt-5">
        <div className="mb-2.5 flex min-h-8 items-center justify-between gap-3">
          {lastVote ? (
            <button
              type="button"
              onClick={onUndo}
              aria-keyshortcuts="Z"
              className="-ml-1 flex min-w-0 items-center gap-1.5 rounded-[6px] px-1 py-1 text-[0.9375rem] font-semibold text-ink hover:bg-sheet"
            >
              <UndoIcon />
              <span className="truncate">
                Undo: {VOTE_PAST[lastVote.vote]} {lastVote.option.name}
              </span>
            </button>
          ) : (
            <span />
          )}
          <span className="keys-hint shrink-0 items-center gap-1.5 text-[0.8125rem] text-ink-soft">
            <Kbd>←</Kbd> no <Kbd>→</Kbd> yes <Kbd>↑</Kbd> love
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Your mark">
          {(["no", "yes", "love"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => commit(v)}
              aria-keyshortcuts={v === "no" ? "ArrowLeft" : v === "yes" ? "ArrowRight" : "ArrowUp"}
              className="group flex h-16 items-center justify-center gap-2 rounded-[10px] border-2 border-ink bg-sheet font-display text-[1.375rem] font-bold uppercase tracking-[0.03em] text-ink transition-[transform,background-color] duration-150 hover:bg-board active:translate-y-0.5 active:bg-call-wash"
            >
              <Mark vote={v} color={MARKER[you.color]} strokeWidth={v === "love" ? 9 : 12} className="size-7" />
              {VOTE_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-auto pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[0.8125rem] text-ink-soft">
        {footnote}
      </p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid min-w-6 place-items-center rounded-[4px] border-2 border-rule bg-sheet px-1 font-sans text-[0.75rem] font-bold text-ink">
      {children}
    </kbd>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        d="M9 6 L4 10.5 L9 15 M4.5 10.5 H14 C17.5 10.5 20 13 20 16 C20 18 19 19.5 17.5 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

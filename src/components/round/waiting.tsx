import { MARKER, Mark, VOTE_PAST } from "@/components/marks";
import type { Marks, Player, Round } from "@/lib/round";

type Props = {
  round: Round;
  you: Player;
  marks: Marks;
  counts: Record<string, number>;
  everyoneIn: boolean;
  /** Null unless you started the huddle: only the host can call it early. */
  onCallNow: (() => void) | null;
  onUndo: () => void;
};

function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Your marks are in; the board waits for everyone else. */
export function Waiting({ round, you, marks, counts, everyoneIn, onCallNow, onUndo }: Props) {
  const total = round.options.length;
  const waitingOn = round.players.filter((p) => !p.isYou && (counts[p.id] ?? 0) < total);
  const yours = marks[you.id] ?? {};

  return (
    <div className="flex flex-1 flex-col pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <h2 className="font-display text-[2.5rem] leading-[0.9] font-extrabold uppercase text-ink">
        {everyoneIn ? "Everyone’s in" : "Your marks are in"}
      </h2>
      <p className="mt-2 max-w-[34ch] text-[1.0625rem] text-ink-soft">
        {everyoneIn
          ? "Making the call now."
          : `${listNames(waitingOn.map((p) => p.name))} ${waitingOn.length === 1 ? "is" : "are"} still marking. Nobody sees anyone’s marks until the call.`}
      </p>

      <ul className="mt-5 border-b-2 border-rule" aria-label="Your marks">
        {round.options.map((o) => {
          const v = yours[o.id];
          return (
            <li key={o.id} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-t-2 border-rule py-2">
              <span className="grid size-9 place-items-center">
                {v && <Mark vote={v} color={MARKER[you.color]} strokeWidth={v === "love" ? 13 : 16} className="size-8" />}
              </span>
              <span className="truncate text-[1.0625rem] font-semibold text-ink">{o.name}</span>
              <span className="text-[0.875rem] text-ink-soft">{v ? VOTE_PAST[v] : "not marked"}</span>
            </li>
          );
        })}
      </ul>

      {!everyoneIn && (
        <div className="mt-auto flex flex-col gap-2 pt-6">
          {onCallNow && (
            <>
              <button
                type="button"
                onClick={onCallNow}
                className="h-14 rounded-[10px] border-2 border-ink bg-ink font-display text-[1.375rem] font-bold uppercase tracking-[0.03em] text-sheet transition-[transform,background-color] duration-150 hover:bg-turf-deep active:translate-y-0.5"
              >
                Make the call now
              </button>
              <p className="text-center text-[0.875rem] text-ink-soft">
                You started this huddle, so you can call it early. Unmarked options count as no mark.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={onUndo}
            className="h-12 rounded-[10px] border-2 border-ink bg-sheet font-display text-[1.125rem] font-bold uppercase tracking-[0.03em] text-ink hover:bg-board active:translate-y-0.5"
          >
            Change my last mark
          </button>
        </div>
      )}
    </div>
  );
}

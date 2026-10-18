import { Mark } from "@/components/marks";
import { PlayerTag } from "@/components/round/player-tag";
import type { Player } from "@/lib/round";

type Props = {
  question: string;
  status: string;
  players: Player[];
  counts: Record<string, number>;
  total: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The turf strip: the question, where you are, and everyone's count. */
export function Scoreboard({ question, status, players, counts, total }: Props) {
  const [left, right] = players;
  const pair = players.length === 2 && left && right ? { left, right } : null;
  const mirrored = pair !== null;

  return (
    <header className="on-turf bg-turf text-turf-chalk">
      <div className="mx-auto w-full max-w-[30rem] px-4 pt-5 pb-4">
        <h1 className="font-display text-[2.125rem] leading-none font-extrabold uppercase text-balance">
          {question}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] font-medium text-turf-chalk-soft" aria-live="polite">
          {status}
        </p>

        <div
          className={`mt-4 grid items-end border-t-2 border-turf-chalk/35 pt-3 ${
            mirrored ? "grid-cols-[1fr_auto_1fr]" : ""
          }`}
          style={mirrored ? undefined : { gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}
        >
          {pair ? (
            <>
              <PlayerCount player={pair.left} count={counts[pair.left.id] ?? 0} total={total} align="end" />
              <CenterLine />
              <PlayerCount player={pair.right} count={counts[pair.right.id] ?? 0} total={total} align="start" />
            </>
          ) : (
            players.map((p, i) => (
              <div key={p.id} className={i > 0 ? "border-l-2 border-turf-chalk/35" : ""}>
                <PlayerCount player={p} count={counts[p.id] ?? 0} total={total} align="center" compact />
              </div>
            ))
          )}
        </div>
      </div>
    </header>
  );
}

function PlayerCount({
  player,
  count,
  total,
  align,
  compact = false,
}: {
  player: Player;
  count: number;
  total: number;
  align: "start" | "end" | "center";
  compact?: boolean;
}) {
  const done = count >= total;
  const alignClass = align === "end" ? "items-end text-right" : align === "start" ? "items-start" : "items-center text-center";

  return (
    <div className={`flex flex-col gap-1.5 ${alignClass}`}>
      <span className="rounded-[4px] bg-sheet px-1.5 pt-0.5 pb-1.5 font-display text-[0.9375rem] leading-none font-bold uppercase tracking-[0.04em] text-ink">
        <PlayerTag player={player} />
      </span>
      <span className="flex items-baseline gap-1 font-jersey font-black leading-none" aria-label={`${player.name}: ${count} of ${total} marked`}>
        <span className={compact ? "text-[2.25rem]" : "text-[2.875rem]"}>{pad(count)}</span>
        <span className="text-[1.125rem] font-extrabold text-turf-chalk-soft">/{pad(total)}</span>
        {done && (
          <Mark vote="yes" color="var(--color-turf-chalk)" className="ml-0.5 size-5 self-center" strokeWidth={12} />
        )}
      </span>
    </div>
  );
}

/** Midfield: the line two players mirror across. */
function CenterLine() {
  return (
    <svg viewBox="0 0 40 64" className="mx-3 h-16 w-10 text-turf-chalk/60" aria-hidden="true">
      <line x1="20" y1="0" x2="20" y2="64" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="36" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

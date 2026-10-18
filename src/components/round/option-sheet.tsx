import type { CSSProperties, ReactNode } from "react";
import { MARKER, Mark } from "@/components/marks";
import { PlayerTag } from "@/components/round/player-tag";
import type { Option, Player, PlayerColor, Vote } from "@/lib/round";

type Props = {
  option: Option;
  addedBy: Player | undefined;
  overCapNote: string | null;
  /** Live drag preview: which mark, and how much of it is drawn. */
  preview?: { vote: Vote; progress: number } | null;
  /** A committed mark, drawn in. */
  committed?: Vote | null;
  markColor: PlayerColor;
  className?: string;
  style?: CSSProperties;
  inert?: boolean;
  handlers?: Partial<
    Pick<
      React.HTMLAttributes<HTMLElement>,
      "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onAnimationEnd"
    >
  >;
};

/**
 * One option, as a play sheet magneted to the board: name at display scale,
 * then the facts on ruled rows.
 */
export function OptionSheet({
  option,
  addedBy,
  overCapNote,
  preview,
  committed,
  markColor,
  className = "",
  style,
  inert,
  handlers,
}: Props) {
  const color = MARKER[markColor];
  const shown: { vote: Vote; progress?: number } | null = committed
    ? { vote: committed }
    : preview && preview.progress > 0
      ? preview
      : null;

  return (
    <article
      className={`relative border-2 border-ink bg-sheet px-5 pt-7 pb-1 shadow-[0_3px_8px_-4px_rgb(22_80_41/0.4)] ${className}`}
      style={style}
      inert={inert}
      aria-hidden={inert || undefined}
      {...handlers}
    >
      <Magnet />

      <div className="relative">
        <h2
          className={`font-display leading-[0.9] font-extrabold uppercase text-balance text-ink ${
            option.name.length > 26 ? "text-[clamp(2rem,9.5vw,2.625rem)]" : "text-[clamp(2.5rem,12.5vw,3.5rem)]"
          }`}
        >
          {option.name}
        </h2>
        {shown?.vote === "no" && (
          <Overlay className="-inset-x-2 top-1/2 h-12 -translate-y-1/2">
            <Mark vote="no" color={color} stretch strokeWidth={8} progress={shown.progress} animate={!!committed} duration={140} className="size-full" />
          </Overlay>
        )}
        {shown?.vote === "love" && (
          <Overlay className="-inset-x-3 -inset-y-3">
            <Mark vote="love" color={color} stretch strokeWidth={7} progress={shown.progress} animate={!!committed} duration={180} className="size-full" />
          </Overlay>
        )}
        {shown?.vote === "yes" && (
          <Overlay className="-top-14 -right-3 size-24">
            <Mark vote="yes" color={color} strokeWidth={13} progress={shown.progress} animate={!!committed} duration={140} className="size-full" />
          </Overlay>
        )}
      </div>
      <p className="mt-1.5 text-[1.0625rem] font-medium text-ink-soft">{option.kind}</p>

      {overCapNote && (
        <p className="mt-3 flex items-center gap-2 font-display text-[1.125rem] font-bold uppercase tracking-[0.02em] text-ink">
          <Mark vote="no" color="currentColor" className="h-4 w-7" strokeWidth={14} />
          {overCapNote}
        </p>
      )}

      <dl className="mt-5">
        <Fact label="Price">{option.priceLabel}</Fact>
        <Fact label="Getting it">{option.distance}</Fact>
        <Fact label="Rating">
          {option.rating ? (
            <>
              {option.rating.score.toFixed(1)}
              <span className="font-normal text-ink-soft"> from {option.rating.count.toLocaleString("en-US")} ratings</span>
            </>
          ) : (
            <span className="font-normal text-ink-soft">Not rated</span>
          )}
        </Fact>
        <Fact label="Added by">
          {addedBy ? <PlayerTag player={addedBy} /> : "Someone"}
          <span className="font-normal text-ink-soft">{option.source ? `, from ${option.source}` : ", typed in"}</span>
        </Fact>
      </dl>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.25rem_1fr] items-baseline gap-3 border-t-2 border-rule py-2.5">
      <dt className="font-display text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink-soft">{label}</dt>
      <dd className="min-w-0 text-[1.125rem] font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** The whiteboard magnet holding the sheet up. */
function Magnet() {
  return (
    <span
      className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-ink shadow-[0_2px_4px_rgb(27_29_34/0.35)]"
      aria-hidden="true"
    >
      <span className="absolute top-1 left-1.5 size-2 rounded-full bg-sheet/30" />
    </span>
  );
}

function Overlay({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`pointer-events-none absolute ${className}`}>{children}</div>;
}

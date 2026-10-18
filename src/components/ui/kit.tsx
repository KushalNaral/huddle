import type { InputHTMLAttributes, ReactNode, Ref } from "react";

// The same buttons the round uses: ink-bordered, condensed caps, a press that sinks.
export const BUTTON_PRIMARY =
  "h-14 w-full rounded-[10px] border-2 border-ink bg-ink font-display text-[1.375rem] font-bold uppercase tracking-[0.03em] text-sheet transition-[transform,background-color] duration-150 hover:bg-turf-deep active:translate-y-0.5 disabled:cursor-not-allowed disabled:border-rule disabled:bg-rule disabled:text-ink-soft disabled:active:translate-y-0";
export const BUTTON_SECONDARY =
  "h-12 rounded-[10px] border-2 border-ink bg-sheet px-4 font-display text-[1.125rem] font-bold uppercase tracking-[0.03em] text-ink transition-[transform,background-color] duration-150 hover:bg-board active:translate-y-0.5 disabled:cursor-not-allowed disabled:text-ink-soft";
export const BUTTON_QUIET =
  "-mx-1 rounded-[6px] px-1 py-1 text-[0.9375rem] font-semibold text-ink underline decoration-2 decoration-rule underline-offset-4 hover:decoration-ink";

/** The turf strip that heads every screen. */
export function TurfHeader({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children?: ReactNode;
}) {
  return (
    <header className="on-turf bg-turf text-turf-chalk">
      <div className="mx-auto w-full max-w-[30rem] px-4 pt-5 pb-4">
        <h1 className="font-display text-[2.125rem] leading-none font-extrabold uppercase text-balance">{title}</h1>
        <p className="mt-1.5 text-[0.9375rem] font-medium text-turf-chalk-soft" aria-live="polite">
          {status}
        </p>
        {children}
      </div>
    </header>
  );
}

type FieldProps = {
  label: string;
  name: string;
  hint?: string | undefined;
  /** A fixed mark inside the box, like "$". */
  lead?: string | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function Field({ label, name, hint, lead, id, className = "", ...input }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="font-display text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink-soft"
      >
        {label}
      </label>
      <div className="relative mt-1">
        {lead && (
          <span
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[1.0625rem] font-semibold text-ink-soft"
            aria-hidden="true"
          >
            {lead}
          </span>
        )}
        <input
          id={inputId}
          name={name}
          aria-describedby={hintId}
          className={`h-12 w-full rounded-[6px] border-2 border-ink bg-sheet text-[1.0625rem] font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft/75 ${
            lead ? "pr-3 pl-7" : "px-3"
          }`}
          {...input}
        />
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[0.875rem] text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * A problem, said plainly next to where it happened. Ink, not red: marker
 * colours belong to players.
 */
export function Problem({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="border-l-[3px] border-ink pl-2.5 text-[0.9375rem] font-semibold text-ink">
      {children}
    </p>
  );
}

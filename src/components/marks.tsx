"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PlayerColor, Vote } from "@/lib/round";

export const MARKER: Record<PlayerColor, string> = {
  blue: "var(--color-marker-blue)",
  red: "var(--color-marker-red)",
  green: "var(--color-marker-green)",
  violet: "var(--color-marker-violet)",
};

// Hand-drawn marker paths on a 100×100 board.
const PATHS: Record<Vote, string> = {
  yes: "M12 55 C 21 61, 29 70, 36 82 C 50 57, 68 33, 90 13",
  no: "M6 58 C 30 52, 62 47, 95 40",
  love: "M54 9 C 80 8, 95 27, 93 52 C 91 78, 69 94, 45 92 C 20 90, 5 70, 8 45 C 11 24, 29 9, 62 13",
};

type MarkProps = {
  vote: Vote;
  color?: string;
  /** 0–1: how much of the stroke is drawn. Omit to draw it in. */
  progress?: number;
  animate?: boolean;
  delay?: number;
  duration?: number;
  strokeWidth?: number;
  className?: string;
  stretch?: boolean;
};

export function Mark({
  vote,
  color = "currentColor",
  progress,
  animate = false,
  delay = 0,
  duration,
  strokeWidth = 9,
  className,
  stretch = false,
}: MarkProps) {
  const controlled = progress !== undefined;
  const style: CSSProperties = controlled
    ? { strokeDashoffset: 1 - progress }
    : ({ "--draw-delay": `${delay}ms`, ...(duration ? { "--draw-ms": `${duration}ms` } : {}) } as CSSProperties);

  // A chisel nib: the same path laid down several times along a fixed 40°
  // nib axis, so the line is thick across the nib and thin along it, with flat
  // angled ends. Stretched marks draw in measured pixels so the nib stays true.
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!stretch || !ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stretch]);

  const nib = stretch ? strokeWidth * 0.75 : strokeWidth * 0.62;
  const passes = 7;
  const lineWidth = (nib * 2) / (passes - 1) + (stretch ? 1.5 : 1.2);
  const viewBox = stretch && box ? `0 0 ${box.w} ${box.h}` : "0 0 100 100";

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
      overflow="visible"
    >
      {(!stretch || box) &&
        Array.from({ length: passes }, (_, i) => {
        const t = (i / (passes - 1)) * 2 - 1;
        const dx = t * nib * 0.77;
        const dy = -t * nib * 0.64;
        const transform =
          stretch && box
            ? `translate(${dx} ${dy}) scale(${box.w / 100} ${box.h / 100})`
            : `translate(${dx} ${dy})`;
        return (
          <path
            key={i}
            d={PATHS[vote]}
            transform={transform}
            style={style}
            pathLength={1}
            fill="none"
            stroke={color}
            strokeWidth={lineWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            vectorEffect={stretch ? "non-scaling-stroke" : undefined}
            className={controlled ? "stroke-static" : animate ? "stroke-draw" : undefined}
          />
        );
      })}
    </svg>
  );
}

export const VOTE_LABEL: Record<Vote, string> = {
  no: "No",
  yes: "Yes",
  love: "Love",
};

/** The past-tense words used in announcements and the board record. */
export const VOTE_PAST: Record<Vote, string> = {
  no: "crossed out",
  yes: "ticked",
  love: "circled",
};

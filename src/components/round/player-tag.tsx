import { MARKER } from "@/components/marks";
import type { Player } from "@/lib/round";

/** A player's name with their marker color struck under it. */
export function PlayerTag({ player, className = "" }: { player: Player; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{player.name}</span>
      <svg
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className="absolute -bottom-1 left-0 h-[7px] w-full"
        aria-hidden="true"
      >
        <path
          d="M2 7 C 30 4, 62 9, 98 5"
          fill="none"
          stroke={MARKER[player.color]}
          strokeWidth={4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

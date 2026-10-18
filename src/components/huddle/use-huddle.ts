"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isHuddleView, type ActionResult, type HuddleView } from "@/lib/view";

const POLL_MS = { collecting: 2000, voting: 1500, decided: 4000 } as const;
const OFFLINE_ERROR = "Couldn’t reach Huddle. Check your connection and try again.";

export type RunAction = (action: () => Promise<ActionResult>) => Promise<ActionResult>;

/**
 * Keeps this device's view of a huddle fresh. Polls for now (Stage 2 swaps in
 * realtime); every action also returns the new view, so your own changes land
 * without waiting for the next poll.
 */
export function useHuddle(initial: HuddleView) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(0);
  const { slug, status } = view;

  // A poll that left before an action finished must not undo it.
  const accept = useCallback((next: HuddleView) => {
    setView((current) => (next.version >= current.version ? next : current));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (document.hidden || inFlight.current > 0) return;
      try {
        const res = await fetch(`/api/h/${slug}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!cancelled && isHuddleView(data)) accept(data);
      } catch {
        // Offline for a moment; the next tick tries again.
      }
    }
    const timer = window.setInterval(() => void poll(), POLL_MS[status]);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug, status, accept]);

  const run: RunAction = useCallback(
    async (action) => {
      inFlight.current += 1;
      try {
        const result = await action();
        if (result.ok) {
          accept(result.view);
          setError(null);
        } else {
          setError(result.error);
        }
        return result;
      } catch {
        setError(OFFLINE_ERROR);
        return { ok: false, error: OFFLINE_ERROR };
      } finally {
        inFlight.current -= 1;
      }
    },
    [accept],
  );

  return { view, error, clearError: () => setError(null), run };
}

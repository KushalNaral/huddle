"use client";

import { useCallback, useEffect, useState } from "react";
import { getHuddle, liveUrl } from "@/lib/api";
import { deviceToken } from "@/lib/device";
import { isHuddleView, type ActionResult, type HuddleView } from "@/lib/view";

const OFFLINE_ERROR = "Couldn’t reach Huddle. Check your connection and try again.";
const MISSING_ERROR = "This huddle doesn’t exist anymore.";
/** The API closes with this when the huddle is gone; reconnecting won't help. */
const CLOSE_MISSING = 4404;
const RETRY_MS = { first: 1000, max: 10_000 } as const;
const PING_MS = 25_000;

export type RunAction = (action: () => Promise<ActionResult>) => Promise<ActionResult>;

function viewFromMessage(data: unknown): HuddleView | null {
  if (typeof data !== "string" || data === "pong") return null;
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message === "object" && message !== null && "view" in message && isHuddleView(message.view)) {
      return message.view;
    }
  } catch {
    // not ours
  }
  return null;
}

/**
 * Keeps this device's view of a huddle fresh over a WebSocket: the API pushes
 * a new view on every change. Every action also returns the new view, so your
 * own changes land without waiting for the push.
 */
export function useHuddle(initial: HuddleView) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const { slug } = view;

  // A push that left before an action finished must not undo it.
  const accept = useCallback((next: HuddleView) => {
    setView((current) => (next.version >= current.version ? next : current));
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retries = 0;
    let retryTimer: number | undefined;
    let stopped = false;

    function connect() {
      window.clearTimeout(retryTimer);
      const ws = new WebSocket(liveUrl(slug));
      socket = ws;
      ws.onopen = () => {
        retries = 0;
        ws.send(JSON.stringify({ token: deviceToken() }));
      };
      ws.onmessage = (event: MessageEvent<unknown>) => {
        const next = viewFromMessage(event.data);
        if (next) accept(next);
      };
      ws.onclose = (event) => {
        if (socket === ws) socket = null;
        if (stopped) return;
        if (event.code === CLOSE_MISSING) {
          stopped = true;
          setError(MISSING_ERROR);
          return;
        }
        const delay = Math.min(RETRY_MS.max, RETRY_MS.first * 2 ** retries);
        retries += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    }

    async function refresh() {
      try {
        const next = await getHuddle(slug);
        if (next) accept(next);
      } catch {
        // Offline for a moment; the socket retries on its own.
      }
    }

    // Phones freeze background tabs: catch up and reconnect right away on return.
    const onVisible = () => {
      if (document.hidden || stopped) return;
      void refresh();
      if (socket === null) {
        retries = 0;
        connect();
      }
    };

    const ping = window.setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
    }, PING_MS);

    connect();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(ping);
      document.removeEventListener("visibilitychange", onVisible);
      socket?.close(1000);
    };
  }, [slug, accept]);

  const run: RunAction = useCallback(
    async (action) => {
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
      }
    },
    [accept],
  );

  return { view, error, clearError: () => setError(null), run };
}

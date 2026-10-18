"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { LiveHuddle } from "@/components/huddle/live-huddle";
import { DemoRound } from "@/components/round/demo-round";
import { BUTTON_PRIMARY, TurfHeader } from "@/components/ui/kit";
import { getHuddle } from "@/lib/api";
import type { HuddleView } from "@/lib/view";

// The site is static, so one page serves every huddle: /h/?id=<slug>.
export default function HuddlePage() {
  return (
    <Suspense fallback={<LoadingBoard />}>
      <HuddleFromQuery />
    </Suspense>
  );
}

function HuddleFromQuery() {
  const search = useSearchParams();
  const id = search.get("id") ?? "";

  if (id === "demo") {
    const players = Number(search.get("players") ?? 2);
    return <DemoRound players={Number.isFinite(players) ? players : 2} reasonFails={search.get("reason") === "fail"} />;
  }
  return <LoadedHuddle key={id} slug={id} />;
}

type Load = { state: "loading" } | { state: "missing" } | { state: "offline" } | { state: "ready"; view: HuddleView };

function LoadedHuddle({ slug }: { slug: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getHuddle(slug).then(
      (view) => {
        if (!cancelled) setLoad(view ? { state: "ready", view } : { state: "missing" });
      },
      () => {
        if (!cancelled) setLoad({ state: "offline" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  switch (load.state) {
    case "loading":
      return <LoadingBoard />;
    case "ready":
      return <LiveHuddle initial={load.view} />;
    case "missing":
      return (
        <Notice
          title="No huddle here"
          body="This link might be mistyped, or the huddle has ended and been cleared away."
          action={
            <Link href="/" className={`${BUTTON_PRIMARY} grid place-items-center`}>
              Start your own
            </Link>
          }
        />
      );
    case "offline":
      return (
        <Notice
          title="Can’t reach Huddle"
          body="Check your connection and try again."
          action={
            <button
              type="button"
              className={BUTTON_PRIMARY}
              onClick={() => {
                setLoad({ state: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          }
        />
      );
  }
}

function Notice({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <>
      <TurfHeader title="Huddle" status={title} />
      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col px-4 pt-7 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <h2 className="font-display text-[2rem] leading-[0.95] font-extrabold uppercase text-ink">{title}</h2>
        <p className="mt-2 text-[1.0625rem] text-ink">{body}</p>
        <div className="mt-6">{action}</div>
      </main>
    </>
  );
}

/** The turf strip and an empty board while the huddle loads. */
function LoadingBoard() {
  return (
    <>
      <header className="bg-turf text-turf-chalk">
        <div className="mx-auto w-full max-w-[30rem] px-4 pt-5 pb-4">
          <p className="font-display text-[2.125rem] leading-none font-extrabold uppercase">Huddle</p>
          <p className="mt-1.5 text-[0.9375rem] font-medium text-turf-chalk-soft">Getting the board ready…</p>
          <div className="mt-4 h-[5.75rem] border-t-2 border-turf-chalk/35" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[30rem] flex-1 px-4">
        <div className="mt-4 h-[clamp(21rem,50svh,27rem)] rounded-[10px] border-2 border-dashed border-rule" />
      </main>
    </>
  );
}

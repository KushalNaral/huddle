import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LiveHuddle } from "@/components/huddle/live-huddle";
import { DemoRound } from "@/components/round/demo-round";
import { readDeviceToken } from "@/server/device";
import { getHuddle, viewFor } from "@/server/huddles";

// Huddle links are private by default: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function HuddlePage(props: PageProps<"/h/[slug]">) {
  return (
    <Suspense fallback={<LoadingBoard />}>
      <LoadedHuddle params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoadedHuddle({
  params,
  searchParams,
}: Pick<PageProps<"/h/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;

  if (slug === "demo") {
    const search = await searchParams;
    const players = Number(search.players ?? 2);
    return <DemoRound players={Number.isFinite(players) ? players : 2} reasonFails={search.reason === "fail"} />;
  }

  const huddle = await getHuddle(slug);
  if (!huddle) notFound();
  const view = viewFor(huddle, await readDeviceToken());
  return <LiveHuddle key={slug} initial={view} />;
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

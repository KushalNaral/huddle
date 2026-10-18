import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RoundScreen } from "@/components/round/round-screen";
import { demoRound } from "@/lib/round";

export default function HuddlePage(props: PageProps<"/h/[slug]">) {
  return (
    <Suspense fallback={<LoadingBoard />}>
      <LoadedRound params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoadedRound({
  params,
  searchParams,
}: Pick<PageProps<"/h/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const search = await searchParams;

  // Only the demo round exists until the backend lands.
  if (slug !== "demo") notFound();

  const players = Number(search.players ?? 2);
  return (
    <RoundScreen
      round={demoRound(Number.isFinite(players) ? players : 2)}
      reasonFails={search.reason === "fail"}
    />
  );
}

/** The turf strip and an empty board while the round loads. */
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

import Link from "next/link";
import { CreateForm } from "@/components/huddle/create-form";
import { Mark } from "@/components/marks";

export default function Home() {
  return (
    <>
      <header className="on-turf bg-turf text-turf-chalk">
        <div className="mx-auto w-full max-w-[30rem] px-4 pt-8 pb-6">
          <p className="font-display text-[4rem] leading-[0.85] font-extrabold uppercase">Huddle</p>
          <p className="mt-3 max-w-[26ch] text-[1.1875rem] leading-snug font-medium text-turf-chalk">
            Put the options up. Everyone swipes. You get one call.
          </p>
          <ul className="mt-5 flex gap-5 border-t-2 border-turf-chalk/35 pt-3 font-display text-[1rem] font-bold uppercase tracking-[0.04em]">
            <li className="flex items-center gap-1.5">
              <Mark vote="love" color="var(--color-turf-chalk)" strokeWidth={10} className="size-5" />
              Love
            </li>
            <li className="flex items-center gap-1.5">
              <Mark vote="yes" color="var(--color-turf-chalk)" strokeWidth={12} className="size-5" />
              Yes
            </li>
            <li className="flex items-center gap-1.5">
              <Mark vote="no" color="var(--color-turf-chalk)" strokeWidth={12} className="size-5" />
              No
            </li>
          </ul>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col px-4 pt-7 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <CreateForm />
        <p className="mt-auto pt-10 text-center text-[1rem] text-ink">
          Want to see it first?{" "}
          <Link href="/h/?id=demo" className="font-semibold underline decoration-2 underline-offset-4">
            Try the demo round
          </Link>
        </p>
      </main>
    </>
  );
}

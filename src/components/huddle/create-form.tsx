"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { BUTTON_PRIMARY, Field, Problem } from "@/components/ui/kit";
import { createHuddle, huddlePath } from "@/lib/api";
import { LIMITS } from "@/lib/view";

const OFFLINE_ERROR = "Couldn’t reach Huddle. Check your connection and try again.";

export function CreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await createHuddle(form);
        if (result.ok) router.push(huddlePath(result.slug));
        else setProblem(result.error);
      } catch {
        setProblem(OFFLINE_ERROR);
      }
    });
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field
        label="What are you deciding?"
        name="question"
        required
        maxLength={LIMITS.question}
        placeholder="Dinner tonight?"
        autoComplete="off"
      />
      <Field
        label="Your name"
        name="name"
        required
        maxLength={LIMITS.name}
        autoComplete="given-name"
        placeholder="Alex"
      />
      <Field
        label="Your budget each (optional)"
        name="cap"
        lead="$"
        inputMode="decimal"
        placeholder="20"
        hint="Private. Options over it rank below the rest."
      />
      <Problem>{problem}</Problem>
      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Starting…" : "Start a huddle"}
      </button>
    </form>
  );
}

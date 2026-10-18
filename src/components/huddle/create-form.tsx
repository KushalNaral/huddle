"use client";

import { useActionState } from "react";
import { createHuddleAction, type CreateState } from "@/app/h/actions";
import { BUTTON_PRIMARY, Field, Problem } from "@/components/ui/kit";
import { LIMITS } from "@/lib/view";

const EMPTY: CreateState = { error: null, values: {} };

export function CreateForm() {
  const [state, action, pending] = useActionState(createHuddleAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="What are you deciding?"
        name="question"
        required
        maxLength={LIMITS.question}
        placeholder="Dinner tonight?"
        autoComplete="off"
        defaultValue={state.values.question}
      />
      <Field
        label="Your name"
        name="name"
        required
        maxLength={LIMITS.name}
        autoComplete="given-name"
        placeholder="Alex"
        defaultValue={state.values.name}
      />
      <Field
        label="Your budget each (optional)"
        name="cap"
        lead="$"
        inputMode="decimal"
        placeholder="20"
        defaultValue={state.values.cap}
        hint="Private. Options over it rank below the rest."
      />
      <Problem>{state.error}</Problem>
      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        {pending ? "Starting…" : "Start a huddle"}
      </button>
    </form>
  );
}

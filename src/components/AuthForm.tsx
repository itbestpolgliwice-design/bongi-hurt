"use client";
import { useActionState } from "react";

type State = { error?: string; ok?: string } | undefined;
type Field = { name: string; label: string; type?: string; required?: boolean };

export default function AuthForm({
  action, fields, submit,
}: { action: (s: State, f: FormData) => Promise<State>; fields: Field[]; submit: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.ok) return <p className="rounded-md bg-lime-400/10 p-4 text-lime-300">{state.ok}</p>;
  return (
    <form action={formAction} className="space-y-3">
      {fields.map((f) => (
        <label key={f.name} className="block text-sm">
          <span className="text-neutral-400">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            required={f.required ?? true}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
      ))}
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-lime-400 py-2 font-semibold text-black disabled:opacity-50">
        {pending ? "..." : submit}
      </button>
    </form>
  );
}

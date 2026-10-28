import { requireAdmin } from "@/lib/admin";
import { setAdmin, setApproved } from "../actions";

export default async function Shops() {
  const db = await requireAdmin();
  const { data } = await db.from("profiles").select("*").order("approved").order("created_at", { ascending: false });
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Sklepy / hurtownicy</h1>
      <div className="space-y-2">
        {(data ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{p.company_name || "—"} {p.is_admin && <span className="text-xs text-lime-400">(admin)</span>}</div>
              <div className="text-xs text-neutral-400">NIP {p.nip} · {p.email} · {p.phone} · {p.address}</div>
            </div>
            <form action={setAdmin}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="admin" value={String(!p.is_admin)} />
              {p.is_admin
                ? <button className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:border-red-400">Odbierz admina</button>
                : <button className="rounded-md border border-lime-400/40 px-3 py-1 text-xs text-lime-300 hover:border-lime-400">Nadaj admina</button>}
            </form>
            <form action={setApproved}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="approved" value={String(!p.approved)} />
              {p.approved
                ? <button className="rounded-md border border-neutral-700 px-3 py-1 text-neutral-300 hover:border-red-400">Zablokuj</button>
                : <button className="rounded-md bg-lime-400 px-3 py-1 font-semibold text-black">Zatwierdź</button>}
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

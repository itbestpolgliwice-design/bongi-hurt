import { requireAdmin } from "@/lib/admin";
import { zl } from "@/lib/data";
import { setOrderStatus } from "../actions";

const STATUSES = ["nowe", "w realizacji", "wysłane", "anulowane"];
type Item = { sku: string; name: string; qty: number; price_net: number };

export default async function Orders() {
  const db = await requireAdmin();
  const { data: orders } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  const ids = [...new Set((orders ?? []).map((o) => o.user_id))];
  const { data: profiles } = await db.from("profiles").select("id,company_name,nip,phone,address,email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const prof = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Zamówienia</h1>
      {!orders?.length && <p className="text-neutral-500">Brak zamówień.</p>}
      <div className="space-y-3">
        {(orders ?? []).map((o) => {
          const p = prof.get(o.user_id);
          return (
            <details key={o.id} className="rounded-lg border border-neutral-800 p-3 text-sm" open={o.status === "nowe"}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <b>#{o.id}</b>
                <span>{p?.company_name}</span>
                <span className="text-neutral-400">{new Date(o.created_at).toLocaleString("pl-PL")}</span>
                <span className="ml-auto font-semibold text-lime-400">{zl(Number(o.total_net))} netto</span>
                <span className={`rounded px-2 py-0.5 text-xs ${o.status === "nowe" ? "bg-amber-500/20 text-amber-300" : "bg-neutral-800"}`}>{o.status}</span>
              </summary>
              <div className="mt-3 text-xs text-neutral-400">NIP {p?.nip} · {p?.address} · {p?.phone} · {p?.email}</div>
              <table className="mt-2 w-full">
                <tbody>
                  {(o.items as Item[]).map((i) => (
                    <tr key={i.sku} className="border-t border-neutral-800">
                      <td className="py-1 font-mono text-xs">{i.sku}</td><td>{i.name}</td>
                      <td className="text-right">{i.qty} szt.</td><td className="text-right">{zl(i.price_net)}</td>
                      <td className="text-right">{zl(i.qty * i.price_net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {o.note && <p className="mt-2"><b>Uwagi:</b> {o.note}</p>}
              <form action={setOrderStatus} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button className="rounded-md bg-neutral-800 px-3 py-1 hover:bg-neutral-700">Zmień status</button>
              </form>
            </details>
          );
        })}
      </div>
    </div>
  );
}

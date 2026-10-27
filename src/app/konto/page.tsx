import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, zl } from "@/lib/data";

export default async function Account() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/logowanie");
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders").select("id,total_net,total_gross,status,created_at").order("created_at", { ascending: false });
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{profile?.company_name}</h1>
      <p className="text-sm text-neutral-400">NIP {profile?.nip} · {profile?.address} · {profile?.phone}</p>
      <p className="mt-1 text-sm">Status: {profile?.approved ? <span className="text-lime-400">zatwierdzone</span> : <span className="text-amber-300">czeka na zatwierdzenie</span>}</p>
      <h2 className="mt-8 mb-2 font-semibold">Twoje zamówienia</h2>
      {!orders?.length ? <p className="text-sm text-neutral-500">Brak zamówień.</p> : (
        <table className="w-full text-sm">
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-800">
                <td className="py-2">#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleString("pl-PL")}</td>
                <td>{zl(o.total_gross != null ? Number(o.total_gross) : Math.round(Number(o.total_net) * 123) / 100)} brutto</td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

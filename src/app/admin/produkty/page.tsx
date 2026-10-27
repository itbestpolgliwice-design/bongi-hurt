import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { zl } from "@/lib/data";
import { grossOf } from "@/lib/format";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const db = await requireAdmin();
  let query = db.from("products").select("id,sku,name,variant_name,group_code,image_url,active,in_stock,stock_qty,categories(name),product_prices(price_net,price_gross)").order("name").order("variant_name");
  const qq = q?.replace(/[,()%*]/g, " ").trim();
  if (qq) query = query.or(`name.ilike.%${qq}%,sku.ilike.%${qq}%`);
  const { data } = await query;
  type Row = { id: string; sku: string; name: string; variant_name: string | null; group_code: string | null; image_url: string | null; active: boolean; in_stock: boolean; stock_qty: number | null;
    categories: { name: string } | null; product_prices: PP | PP[] | null };
  type PP = { price_net: number; price_gross: number | null };
  const rows = (data ?? []) as unknown as Row[];
  const pp = (r: Row) => (Array.isArray(r.product_prices) ? r.product_prices[0] : r.product_prices);
  const price = (r: Row) => { const p = pp(r); return p ? Number(p.price_net) : null; };
  const brutto = (r: Row) => { const p = pp(r); return p ? grossOf(Number(p.price_net), p.price_gross) : null; };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Produkty ({rows.length})</h1>
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Szukaj" className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm" /></form>
        <Link href="/admin/produkty/nowy" className="rounded-md bg-lime-400 px-3 py-1.5 text-sm font-semibold text-black">+ Dodaj produkt</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th className="p-2">Kod/znak</th><th>Nazwa</th><th>Kategoria</th><th className="text-right">Cena netto</th><th className="text-right">Cena brutto</th><th className="text-right">Stan</th><th className="pl-4">Dostępny</th><th>Zdjęcie</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                <td className="p-2 font-mono text-xs">{r.sku}</td>
                <td><Link href={`/admin/produkty/${r.id}`} className="hover:text-lime-400">{r.name}</Link>{r.variant_name && <span className="ml-2 rounded bg-neutral-800 px-1.5 text-xs">{r.variant_name}</span>}{!r.active && <span className="ml-2 text-xs text-neutral-500">(ukryty)</span>}</td>
                <td className="text-neutral-400">{r.categories?.name ?? "—"}</td>
                <td className="text-right">{price(r) != null ? zl(price(r)!) : <span className="text-red-400">brak</span>}</td>
                <td className="text-right text-neutral-300">{brutto(r) != null ? zl(brutto(r)!) : "—"}</td>
                <td className="text-right">{r.stock_qty ?? "—"}</td>
                <td className="pl-4">{r.in_stock ? <span className="text-lime-400">tak</span> : <span className="text-red-400">nie</span>}</td>
                <td className="p-1">
                  {r.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                    : <span className="text-xs text-red-400">brak</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

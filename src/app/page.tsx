import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProducts, getViewer, groupProducts } from "@/lib/data";

export default async function Catalog({ searchParams }: { searchParams: Promise<{ k?: string; q?: string }> }) {
  const { k, q } = await searchParams;
  const [{ categories, products }, { profile }] = await Promise.all([getProducts({ category: k, q }), getViewer()]);
  const canBuy = !!profile?.approved;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Katalog</h1>
        <form className="sm:ml-auto" action="/">
          {k && <input type="hidden" name="k" value={k} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Szukaj: nazwa, kod, EAN"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm sm:w-72"
          />
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/" className={`rounded-full px-3 py-1 ${!k ? "bg-lime-400 text-black" : "bg-neutral-800"}`}>Wszystko</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/?k=${c.slug}`} className={`rounded-full px-3 py-1 ${k === c.slug ? "bg-lime-400 text-black" : "bg-neutral-800"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-400">Brak produktów.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {groupProducts(products).map((g) => <ProductCard key={g[0].id} group={g} canBuy={canBuy} />)}
        </div>
      )}
    </div>
  );
}

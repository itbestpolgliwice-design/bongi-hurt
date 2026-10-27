import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import ProductForm from "@/components/admin/ProductForm";
import { deleteProduct } from "../../actions";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await requireAdmin();
  const { data: categories } = await db.from("categories").select("id,name").order("sort");
  let product = null, price = null;
  if (id !== "nowy") {
    const { data } = await db.from("products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data;
    const { data: pr } = await db.from("product_prices").select("price_net").eq("product_id", id).maybeSingle();
    price = pr ? Number(pr.price_net) : null;
  }
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{product ? product.name : "Nowy produkt"}</h1>
      <ProductForm product={product} price={price} categories={categories ?? []} />
      {product && (
        <form action={deleteProduct} className="mt-8 border-t border-neutral-800 pt-4">
          <input type="hidden" name="id" value={product.id} />
          <button className="text-sm text-red-400 hover:underline">Usuń produkt na stałe</button>
          <span className="ml-2 text-xs text-neutral-500">(lepiej odznaczyć „widoczny”)</span>
        </form>
      )}
    </div>
  );
}

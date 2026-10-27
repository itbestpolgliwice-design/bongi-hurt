import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { getProducts, getViewer } from "@/lib/data";

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const sku = decodeURIComponent((await params).sku);
  const [{ products }, { profile }] = await Promise.all([getProducts({ sku }), getViewer()]);
  if (!products.length) notFound();
  return <ProductDetail group={products} initialSku={sku} canBuy={!!profile?.approved} />;
}

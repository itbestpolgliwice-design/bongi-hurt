import { createClient } from "@/lib/supabase/server";

export type Category = { id: number; slug: string; name: string };
export type Product = {
  id: string;
  sku: string;
  ean: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  image_url: string | null;
  height_cm: number | null;
  material: string | null;
  pack_qty: number;
  in_stock: boolean;
  stock_qty: number | null;
  group_code: string | null;
  variant_name: string | null;
  price_net?: number | null;
  price_gross?: number | null;
};
export type Profile = {
  id: string;
  email: string | null;
  company_name: string | null;
  nip: string | null;
  phone: string | null;
  address: string | null;
  approved: boolean;
  is_admin: boolean;
};

export async function getViewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { user, profile: (profile as Profile) ?? null };
}

/** Produkty + ceny (ceny dociągane tylko gdy RLS na to pozwoli = konto zatwierdzone). */
export async function getProducts(opts: { category?: string; q?: string; sku?: string } = {}) {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id,slug,name").order("sort");
  let query = supabase.from("products").select("*").eq("active", true).order("name").order("variant_name");
  const cat = categories?.find((c) => c.slug === opts.category);
  if (cat) query = query.eq("category_id", cat.id);
  const q = opts.q?.replace(/[,()%*]/g, " ").trim();
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,ean.ilike.%${q}%`);
  if (opts.sku) {
    const { data: one } = await supabase.from("products").select("group_code").eq("sku", opts.sku).maybeSingle();
    query = one?.group_code ? query.eq("group_code", one.group_code) : query.eq("sku", opts.sku);
  }
  const { data: products } = await query;

  const { data: prices } = await supabase.from("product_prices").select("product_id,price_net,price_gross");
  const priceMap = new Map((prices ?? []).map((p) => [p.product_id, p]));

  return {
    categories: (categories ?? []) as Category[],
    products: ((products ?? []) as Product[]).map((p) => {
      const pr = priceMap.get(p.id);
      return { ...p, price_net: pr ? Number(pr.price_net) : null, price_gross: pr?.price_gross != null ? Number(pr.price_gross) : null };
    }),
  };
}

export const zl = (n: number) =>
  n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

/** Grupuje warianty (ta sama grupa) w jeden produkt do wyświetlenia. */
export function groupProducts(products: Product[]): Product[][] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.group_code || p.sku;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.values()];
}

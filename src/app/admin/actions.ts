"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { netOf } from "@/lib/format";
import { readCatalogFile, saveCatalog } from "@/lib/catalog-import";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = s(f, k).replace(",", ".");
  return v === "" ? null : Number(v);
};

export async function saveProduct(_: unknown, f: FormData) {
  const db = await requireAdmin();
  const id = s(f, "id");
  const row = {
    sku: s(f, "sku"),
    ean: s(f, "ean") || null,
    name: s(f, "name"),
    description: s(f, "description") || null,
    category_id: n(f, "category_id"),
    height_cm: n(f, "height_cm"),
    material: s(f, "material") || null,
    pack_qty: Math.max(1, n(f, "pack_qty") ?? 1),
    stock_qty: n(f, "stock_qty"),
    group_code: s(f, "group_code") || null,
    variant_name: s(f, "variant_name") || null,
    in_stock: f.get("in_stock") === "on",
    active: f.get("active") === "on",
    image_url: s(f, "image_url") || null,
  };
  if (!row.sku || !row.name) return { error: "Kod i nazwa są wymagane." };

  const q = id ? db.from("products").update(row).eq("id", id) : db.from("products").insert(row);
  const { data, error } = await q.select("id").single();
  if (error) return { error: error.code === "23505" ? "Taki kod już istnieje." : error.message };

  const price = n(f, "price_gross");
  if (price != null && !Number.isNaN(price) && price > 0) {
    await db.from("product_prices").upsert({ product_id: data.id, price_net: netOf(price), price_gross: price });
  } else {
    await db.from("product_prices").delete().eq("product_id", data.id);
  }
  revalidatePath("/", "layout");
  redirect("/admin/produkty");
}

export async function deleteProduct(f: FormData) {
  const db = await requireAdmin();
  await db.from("products").delete().eq("id", s(f, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/produkty");
}

/** Podpisany link do wgrania zdjęcia prosto z przeglądarki do Supabase Storage. */
export async function getUploadUrl(fileName: string) {
  const db = await requireAdmin();
  const safe = fileName.normalize("NFD").replace(/[^\w.-]+/g, "_");
  const path = `${Date.now()}_${safe}`;
  const { data, error } = await db.storage.from("products").createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  const { data: pub } = db.storage.from("products").getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}

/** Po wgraniu wielu zdjęć: przypisz po nazwie pliku = kod produktu (np. BG-001.jpg). */
export async function assignImages(list: { sku: string; url: string }[]) {
  const db = await requireAdmin();
  const done: string[] = [];
  const missing: string[] = [];
  for (const { sku, url } of list) {
    // w nazwie pliku nie ma "/", więc "2749-BE-54.jpg" ma pasować do kodu "2749/BE-54" ("_" = dowolny znak)
    const pattern = sku.replace(/[%_\\]/g, "").replace(/-/g, "_");
    const { data } = await db.from("products").update({ image_url: url }).ilike("sku", pattern).select("sku");
    (data?.length ? done : missing).push(sku);
  }
  revalidatePath("/", "layout");
  return { done, missing };
}

export async function importCatalog(_: unknown, f: FormData) {
  const db = await requireAdmin();
  const file = f.get("file") as File | null;
  if (!file || !file.size) return { error: "Wybierz plik." };
  const { rows, errors, unknownCols } = await readCatalogFile(await file.arrayBuffer(), file.name);
  if (!rows.length) return { error: errors.join("\n") || "Brak wierszy do importu." };
  const res = await saveCatalog(db, rows);
  revalidatePath("/", "layout");
  return {
    ok: `Zapisano ${res.saved} z ${rows.length} produktów.`,
    warnings: [...errors, ...res.errors, ...(unknownCols.length ? [`Pominięte kolumny: ${unknownCols.join(", ")}`] : [])],
  };
}

export async function setApproved(f: FormData) {
  const db = await requireAdmin();
  await db.from("profiles").update({ approved: s(f, "approved") === "true" }).eq("id", s(f, "id"));
  revalidatePath("/admin/sklepy");
}

export async function setOrderStatus(f: FormData) {
  const db = await requireAdmin();
  await db.from("orders").update({ status: s(f, "status") }).eq("id", s(f, "id"));
  revalidatePath("/admin/zamowienia");
}

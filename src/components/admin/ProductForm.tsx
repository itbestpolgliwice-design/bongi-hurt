"use client";
import { useActionState, useState } from "react";
import { saveProduct } from "@/app/admin/actions";
import { uploadImage } from "./imageUpload";

type P = Record<string, string | number | boolean | null>;

export default function ProductForm({ product, price, categories }: { product: P | null; price: number | null; categories: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [img, setImg] = useState<string>((product?.image_url as string) ?? "");
  const [uploading, setUploading] = useState(false);
  const v = (k: string) => (product?.[k] ?? "") as string;
  const input = "mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2";

  return (
    <form action={action} className="grid gap-4 md:grid-cols-[260px_1fr]">
      <input type="hidden" name="id" value={v("id")} />
      <input type="hidden" name="image_url" value={img} />
      <div>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img ? <img src={img} alt="" className="h-full w-full object-contain" /> : <span className="text-sm text-neutral-500">brak zdjęcia</span>}
        </div>
        <label className="mt-2 block cursor-pointer rounded-md border border-neutral-700 py-2 text-center text-sm hover:border-lime-400">
          {uploading ? "Wgrywanie..." : "Wgraj / zrób zdjęcie"}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setUploading(true);
            try { setImg(await uploadImage(f, v("sku") || undefined)); } catch (err) { alert((err as Error).message); }
            setUploading(false);
          }} />
        </label>
        {img && <button type="button" onClick={() => setImg("")} className="mt-1 w-full text-xs text-neutral-500 hover:text-red-400">usuń zdjęcie</button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="text-neutral-400">Kod (SKU) *</span><input name="sku" defaultValue={v("sku")} required className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">EAN</span><input name="ean" defaultValue={v("ean")} className={input} /></label>
        <label className="text-sm sm:col-span-2"><span className="text-neutral-400">Nazwa *</span><input name="name" defaultValue={v("name")} required className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Grupa (ten sam kod = jeden produkt z wariantami)</span><input name="group_code" defaultValue={v("group_code")} placeholder="np. 5-3821" className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Wariant / kolor</span><input name="variant_name" defaultValue={v("variant_name")} placeholder="np. Niebieski" className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Kategoria</span>
          <select name="category_id" defaultValue={v("category_id")} className={input}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="text-neutral-400">Cena brutto (zł) — netto liczy się samo</span><input name="price_gross" defaultValue={price ?? ""} inputMode="decimal" className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Stan na magazynie (szt.)</span><input name="stock_qty" type="number" min={0} defaultValue={v("stock_qty")} className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Wysokość (cm)</span><input name="height_cm" defaultValue={v("height_cm")} inputMode="decimal" className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Materiał</span><input name="material" defaultValue={v("material")} placeholder="szkło / akryl / silikon" className={input} /></label>
        <label className="text-sm"><span className="text-neutral-400">Sprzedaż po (szt.)</span><input name="pack_qty" type="number" min={1} defaultValue={v("pack_qty") || 1} className={input} /></label>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="in_stock" defaultChecked={product ? !!product.in_stock : true} /> dostępny</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={product ? !!product.active : true} /> widoczny</label>
        </div>
        <label className="text-sm sm:col-span-2"><span className="text-neutral-400">Opis</span><textarea name="description" defaultValue={v("description")} rows={4} className={input} /></label>
        {state?.error && <p className="text-sm text-red-400 sm:col-span-2">{state.error}</p>}
        <button disabled={pending || uploading} className="rounded-md bg-lime-400 py-2 font-semibold text-black disabled:opacity-50 sm:col-span-2">
          {pending ? "Zapisywanie..." : "Zapisz"}
        </button>
      </div>
    </form>
  );
}

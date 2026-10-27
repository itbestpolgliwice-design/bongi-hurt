"use client";
import Link from "next/link";
import { useState } from "react";
import { BuyBox, VariantPicker } from "./ProductCard";
import type { Product } from "@/lib/data";

export default function ProductDetail({ group, initialSku, canBuy }: { group: Product[]; initialSku: string; canBuy: boolean }) {
  const [sel, setSel] = useState(Math.max(0, group.findIndex((v) => v.sku === initialSku)));
  const p = group[sel];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-neutral-500">brak zdjęcia</span>
        )}
      </div>
      <div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">← Katalog</Link>
        <h1 className="mt-2 text-2xl font-bold">{p.name}</h1>
        <div className="mt-1 text-sm text-neutral-500">Kod: {p.sku}{p.ean && ` · EAN: ${p.ean}`}</div>
        {group.length > 1 && <div className="mt-4 text-sm text-neutral-400">Wariant:</div>}
        <VariantPicker group={group} sel={sel} onSel={setSel} />
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
          {p.height_cm && (<><dt className="text-neutral-400">Wysokość</dt><dd>{p.height_cm} cm</dd></>)}
          {p.material && (<><dt className="text-neutral-400">Materiał</dt><dd>{p.material}</dd></>)}
          {p.pack_qty > 1 && (<><dt className="text-neutral-400">Sprzedaż po</dt><dd>{p.pack_qty} szt.</dd></>)}
          <dt className="text-neutral-400">Dostępność</dt><dd>{p.in_stock ? "dostępny" : "brak"}</dd>
        </dl>
        {p.description && <p className="mt-4 whitespace-pre-line text-neutral-300">{p.description}</p>}
        <div className="mt-6 max-w-xs"><BuyBox p={p} canBuy={canBuy} big /></div>
      </div>
    </div>
  );
}

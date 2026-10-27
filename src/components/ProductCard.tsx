"use client";
import Link from "next/link";
import { useState } from "react";
import AddToCart from "./AddToCart";
import type { Product } from "@/lib/data";
import { grossOf } from "@/lib/format";

const zl = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

/** Przyciski wyboru wariantu (kolor). */
export function VariantPicker({ group, sel, onSel }: { group: Product[]; sel: number; onSel: (i: number) => void }) {
  if (group.length < 2) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {group.map((v, i) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSel(i)}
          className={`rounded-full border px-2 py-0.5 text-xs ${i === sel ? "border-lime-400 bg-lime-400 text-black" : "border-neutral-700 text-neutral-300 hover:border-lime-400"} ${!v.in_stock ? "line-through opacity-50" : ""}`}
        >
          {v.variant_name || v.sku}
        </button>
      ))}
    </div>
  );
}

export function BuyBox({ p, canBuy, big }: { p: Product; canBuy: boolean; big?: boolean }) {
  if (!canBuy || p.price_net == null)
    return (
      <Link href="/logowanie" className="block rounded-md border border-neutral-700 px-3 py-1.5 text-center text-sm text-neutral-300 hover:border-lime-400">
        {canBuy ? "Cena na zapytanie" : "Zaloguj się, aby zobaczyć cenę"}
      </Link>
    );
  return (
    <>
      <div className={`${big ? "text-2xl" : "text-lg"} font-bold text-lime-400`}>
        {zl(grossOf(p.price_net, p.price_gross))} <span className="text-xs font-normal text-neutral-400">brutto</span>
      </div>
      <div className="mb-2 text-xs text-neutral-400">
        {zl(p.price_net)} netto · {p.in_stock ? `stan: ${p.stock_qty ?? "dostępny"}` : "brak"}
      </div>
      <AddToCart product={p} />
    </>
  );
}

/** Lampka dostępności: zielona = dostępny (z ilością), czerwona = niedostępny. */
export function StockBadge({ p, className = "absolute left-2 top-2" }: { p: Product; className?: string }) {
  const ok = p.in_stock && (p.stock_qty == null || p.stock_qty > 0);
  return (
    <span
      className={`${className} z-10 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow ${
        ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? "animate-pulse bg-lime-300" : "bg-red-200"}`} />
      {ok ? `Dostępny${p.stock_qty != null ? ` · ${p.stock_qty} szt.` : ""}` : "Niedostępny"}
    </span>
  );
}

export default function ProductCard({ group, canBuy }: { group: Product[]; canBuy: boolean }) {
  const [sel, setSel] = useState(Math.max(0, group.findIndex((v) => v.in_stock)));
  const p = group[sel];
  const total = group.reduce((s, v) => s + (v.stock_qty ?? 0), 0);
  return (
    <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <Link href={`/produkt/${encodeURIComponent(p.sku)}`} className="block">
        <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#dcdfe3]">
          <StockBadge p={p} />
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name} className="h-full w-full object-contain mix-blend-multiply" />
          ) : (
            <span className="text-xs text-neutral-500">brak zdjęcia</span>
          )}
        </div>
        <div className="text-xs text-neutral-500">{p.sku}</div>
        <div className="font-medium leading-snug">{p.name}</div>
      </Link>
      {group.length > 1 && (
        <div className="mt-1 text-xs text-neutral-400">
          {group.length} warianty{canBuy && total > 0 ? ` · razem ${total} szt.` : ""}
        </div>
      )}
      <VariantPicker group={group} sel={sel} onSel={setSel} />
      <div className="mt-auto pt-3">
        <BuyBox p={p} canBuy={canBuy} />
      </div>
    </div>
  );
}

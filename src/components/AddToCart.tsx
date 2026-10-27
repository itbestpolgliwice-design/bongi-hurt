"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/data";
import { fullName, grossOf } from "@/lib/format";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(product.pack_qty);
  const [done, setDone] = useState(false);
  if (product.price_net == null) return null;
  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={product.pack_qty}
        step={product.pack_qty}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
        aria-label="Ilość"
      />
      <button
        disabled={!product.in_stock}
        onClick={() => {
          add(
            { id: product.id, sku: product.sku, name: fullName(product), pack_qty: product.pack_qty, price_net: product.price_net!, price_gross: grossOf(product.price_net!, product.price_gross), image_url: product.image_url },
            qty
          );
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }}
        className="flex-1 rounded-md bg-lime-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-40"
      >
        {!product.in_stock ? "Brak" : done ? "Dodano ✓" : "Do koszyka"}
      </button>
    </div>
  );
}

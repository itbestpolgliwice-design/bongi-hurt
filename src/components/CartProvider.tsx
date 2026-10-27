"use client";
import { grossOf } from "@/lib/format";
import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  pack_qty: number;
  price_net: number;
  price_gross?: number;
  image_url: string | null;
};

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  total: number;
  totalGross: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "bongi-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, loaded]);

  const roundToPack = (qty: number, pack: number) => Math.max(pack, Math.ceil(qty / pack) * pack);

  const value: Ctx = {
    items,
    add: (item, qty) =>
      setItems((prev) => {
        const ex = prev.find((i) => i.id === item.id);
        if (ex) return prev.map((i) => (i.id === item.id ? { ...i, qty: roundToPack(i.qty + qty, i.pack_qty) } : i));
        return [...prev, { ...item, qty: roundToPack(qty, item.pack_qty) }];
      }),
    setQty: (id, qty) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: roundToPack(qty, i.pack_qty) } : i))
      ),
    remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price_net, 0),
    totalGross: Math.round(items.reduce((s, i) => s + i.qty * grossOf(i.price_net, i.price_gross), 0) * 100) / 100,
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart poza CartProvider");
  return c;
}

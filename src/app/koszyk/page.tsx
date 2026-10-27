"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

const zl = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

export default function CartPage() {
  const { items, setQty, remove, clear, total } = useCart();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit() {
    setStatus("sending");
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ id: i.id, qty: i.qty })), note }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      clear();
      setStatus("ok");
      setMsg(`Zamówienie #${data.orderId} wysłane. Potwierdzenie przyjdzie na Twój e-mail.`);
    } else {
      setStatus("error");
      setMsg(data.error ?? "Coś poszło nie tak. Spróbuj ponownie.");
    }
  }

  if (status === "ok") return <p className="rounded-md bg-lime-400/10 p-4 text-lime-300">{msg}</p>;
  if (!items.length) return <p className="text-neutral-400">Koszyk jest pusty. <Link href="/" className="text-lime-400">Wróć do katalogu</Link></p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Koszyk</h1>
      <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{i.name}</div>
              <div className="text-xs text-neutral-500">{i.sku} · {zl(Math.round(i.price_net * 123) / 100)} brutto/szt. · po {i.pack_qty} szt.</div>
            </div>
            <input
              type="number" min={i.pack_qty} step={i.pack_qty} value={i.qty}
              onChange={(e) => setQty(i.id, Number(e.target.value))}
              className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
            />
            <div className="w-24 text-right text-sm font-semibold">{zl(Math.round(i.qty * i.price_net * 123) / 100)}</div>
            <button onClick={() => remove(i.id)} className="text-neutral-500 hover:text-red-400" aria-label="Usuń">✕</button>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right">
        <div className="text-sm text-neutral-400">Razem brutto</div>
        <div className="text-2xl font-bold text-lime-400">{zl(Math.round(total * 123) / 100)}</div>
        <div className="text-xs text-neutral-500">netto {zl(total)}</div>
      </div>
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
        placeholder="Uwagi do zamówienia (np. termin dostawy, kolory)"
        className="mt-4 w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-sm" rows={3}
      />
      {status === "error" && <p className="mt-2 text-sm text-red-400">{msg}</p>}
      <button
        onClick={submit} disabled={status === "sending"}
        className="mt-3 w-full rounded-md bg-lime-400 py-3 font-semibold text-black disabled:opacity-50"
      >
        {status === "sending" ? "Wysyłanie..." : "Wyślij zamówienie"}
      </button>
    </div>
  );
}

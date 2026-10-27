import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Body = { items?: { id: string; qty: number }[]; note?: string };
const zl = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function POST(req: Request) {
  // 1. kto zamawia
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.approved) return NextResponse.json({ error: "Konto nie jest jeszcze zatwierdzone." }, { status: 403 });

  // 2. walidacja pozycji — ceny ZAWSZE z bazy, nie z przeglądarki
  const body = (await req.json().catch(() => ({}))) as Body;
  const wanted = (body.items ?? []).filter((i) => i && typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0).slice(0, 300);
  if (!wanted.length) return NextResponse.json({ error: "Koszyk jest pusty." }, { status: 400 });

  const { data: rows } = await admin
    .from("products")
    .select("id,sku,name,variant_name,pack_qty,active,in_stock,product_prices(price_net)")
    .in("id", wanted.map((i) => i.id));

  const items = [];
  for (const w of wanted) {
    const p = rows?.find((r) => r.id === w.id);
    const pp = p?.product_prices as unknown as { price_net: number } | { price_net: number }[] | null;
    const price = Array.isArray(pp) ? pp[0]?.price_net : pp?.price_net;
    if (!p || !p.active || price == null) continue;
    const qty = Math.max(p.pack_qty, Math.ceil(w.qty / p.pack_qty) * p.pack_qty);
    items.push({ sku: p.sku, name: p.variant_name ? `${p.name} – ${p.variant_name}` : p.name, qty, price_net: Number(price) });
  }
  if (!items.length) return NextResponse.json({ error: "Produkty niedostępne." }, { status: 400 });

  const total = Math.round(items.reduce((s, i) => s + i.qty * i.price_net, 0) * 100) / 100;
  const note = (body.note ?? "").slice(0, 1000);

  // 3. zapis
  const { data: order, error } = await admin
    .from("orders")
    .insert({ user_id: user.id, items, total_net: total, note })
    .select("id")
    .single();
  if (error || !order) return NextResponse.json({ error: "Nie udało się zapisać zamówienia." }, { status: 500 });

  // 4. mail do BEST-POL + potwierdzenie do sklepu
  const rowsHtml = items
    .map((i) => `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td align="right">${i.qty}</td><td align="right">${zl(i.price_net)}</td><td align="right">${zl(i.qty * i.price_net)}</td></tr>`)
    .join("");
  const html = `
    <h2>Zamówienie #${order.id}</h2>
    <p><b>${esc(profile.company_name ?? "")}</b><br>NIP: ${esc(profile.nip ?? "")}<br>${esc(profile.address ?? "")}<br>
    Tel: ${esc(profile.phone ?? "")}<br>E-mail: ${esc(profile.email ?? user.email ?? "")}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><th>Kod</th><th>Produkt</th><th>Ilość</th><th>Cena netto</th><th>Wartość netto</th></tr>
      ${rowsHtml}
      <tr><td colspan="4" align="right"><b>Razem netto</b></td><td align="right"><b>${zl(total)}</b></td></tr>
    </table>
    ${note ? `<p><b>Uwagi:</b> ${esc(note)}</p>` : ""}`;

  if (process.env.RESEND_API_KEY && process.env.ORDER_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.MAIL_FROM ?? "Zamówienia <onboarding@resend.dev>";
    try {
      await resend.emails.send({
        from,
        to: process.env.ORDER_EMAIL.split(",").map((s) => s.trim()),
        replyTo: profile.email ?? user.email ?? undefined,
        subject: `Zamówienie #${order.id} — ${profile.company_name ?? user.email}`,
        html,
      });
      if (profile.email && process.env.MAIL_FROM) {
        await resend.emails.send({
          from,
          to: profile.email,
          subject: `Potwierdzenie zamówienia #${order.id} — BEST-POL`,
          html: `<p>Dziękujemy, przyjęliśmy zamówienie. Skontaktujemy się w sprawie realizacji.</p>${html}`,
        });
      }
    } catch (e) {
      console.error("Błąd wysyłki maila", e); // zamówienie i tak jest zapisane w bazie
    }
  } else {
    console.warn("Brak RESEND_API_KEY / ORDER_EMAIL — mail nie wysłany");
  }

  return NextResponse.json({ orderId: order.id });
}

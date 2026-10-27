import { NextResponse } from "next/server";
import { canMailCustomers, sendMail } from "@/lib/mail";
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

  let mail = "";
  try {
    const orderTo = process.env.ORDER_TO || process.env.ORDER_EMAIL; // ORDER_TO = mail hurtowni
    if (orderTo) {
      const sent = await sendMail({
        to: orderTo.split(",").map((x) => x.trim()),
        replyTo: profile.email ?? user.email ?? undefined,
        subject: `Nowe zamówienie BONGA: #${order.id} - ${profile.company_name || user.email}`,
        html,
      });
      mail = sent ? "hurtownia: ok" : "hurtownia: brak konfiguracji maila";
    } else mail = "brak ORDER_TO";
    const customer = profile.email ?? user.email;
    if (customer && canMailCustomers()) {
      await sendMail({
        to: customer,
        subject: `Potwierdzenie zamówienia #${order.id} — BEST-POL`,
        html: `<p>Dziękujemy, przyjęliśmy zamówienie. Skontaktujemy się w sprawie realizacji.</p>${html}`,
      });
      mail += ", potwierdzenie: ok";
    } else mail += ", potwierdzenie: wyłączone";
  } catch (e) {
    console.error("Błąd wysyłki maila", e); // zamówienie i tak jest zapisane w bazie
    mail += " BŁĄD: " + (e instanceof Error ? e.message : String(e));
  }

  // status maila widzi tylko admin (diagnostyka)
  return NextResponse.json(profile.is_admin ? { orderId: order.id, mail } : { orderId: order.id });
}

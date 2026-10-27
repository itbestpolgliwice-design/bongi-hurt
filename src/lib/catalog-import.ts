import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Kolumny szablonu → pole w bazie. Rozpoznaje też popularne nazwy z Subiekta. */
const ALIASES: Record<string, string[]> = {
  sku: ["sku", "kod", "symbol", "kod_produktu", "indeks", "kod_znak", "znak"],
  ean: ["ean", "kod_kreskowy", "ean13"],
  name: ["nazwa", "name", "nazwa_produktu"],
  description: ["opis", "description"],
  category: ["kategoria", "category", "grupa_towarowa"],
  height_cm: ["wysokosc_cm", "wysokosc", "height"],
  material: ["material"],
  pack_qty: ["ilosc_w_opak", "opakowanie", "pack_qty", "wielokrotnosc", "min_ilosc"],
  price_net: ["cena_netto", "cena", "cena_hurtowa", "price"],
  price_gross: ["cena_brutto", "brutto"],
  group_code: ["grupa", "kod_grupy", "produkt_glowny"],
  variant_name: ["wariant", "kolor", "wersja"],
  stock_qty: ["stan_na_magazynie", "stan", "stan_magazynowy", "ilosc", "magazyn"],
  in_stock: ["dostepny", "dostepnosc", "in_stock"],
  active: ["aktywny", "widoczny", "active"],
  image_url: ["zdjecie_url", "zdjecie", "image_url", "foto"],
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function mapHeader(h: string): string | null {
  const n = norm(h);
  for (const [field, list] of Object.entries(ALIASES)) if (list.includes(n)) return field;
  return null;
}

const toNum = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", ".").replace(/zł|pln/gi, ""));
  return Number.isFinite(n) ? n : null;
};
const toBool = (v: unknown, def: boolean) => {
  if (v == null || v === "") return def;
  return !["nie", "n", "0", "false", "brak", "no"].includes(norm(String(v)));
};
const cellText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return String(o.text);
    if (o.hyperlink) return o.hyperlink;
    if (o.result != null) return String(o.result);
  }
  return String(v).trim();
};

/** CSV z Excela (średnik lub przecinek, cudzysłowy). */
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ImportRow = {
  sku: string; ean: string | null; name: string; description: string | null; category: string | null;
  height_cm: number | null; material: string | null; pack_qty: number; price_net: number | null; price_gross: number | null;
  in_stock: boolean; active: boolean; image_url: string | null; stock_qty: number | null;
  group_code: string | null; variant_name: string | null;
};

export async function readCatalogFile(buf: ArrayBuffer, filename: string) {
  let grid: string[][];
  if (/\.csv$/i.test(filename)) {
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1250").decode(buf); // stary Excel / Subiekt
    grid = parseCsv(text);
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    grid = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      const vals = r.values as unknown[];
      grid.push(vals.slice(1).map(cellText));
    });
  }
  if (grid.length < 2) return { rows: [] as ImportRow[], errors: ["Plik jest pusty."], unknownCols: [] as string[] };

  const header = grid[0].map((h) => mapHeader(h ?? ""));
  const unknownCols = grid[0].filter((h, i) => h && !header[i]);
  if (!header.includes("sku") || !header.includes("name"))
    return { rows: [], errors: ["Brakuje kolumn „kod” i „nazwa” w pierwszym wierszu."], unknownCols };

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  grid.slice(1).forEach((cells, idx) => {
    const r: Record<string, string> = {};
    header.forEach((f, i) => { if (f) r[f] = (cells[i] ?? "").trim(); });
    const line = idx + 2;
    r.sku = (r.sku ?? "").replace(/^[,„"'\s]+|[”"'\s]+$/g, ""); // ,,603'' → 603 (cudzysłowy z OpenOffice)
    const nz = (x: number | null) => (x ? x : null); // 0 zł = brak ceny
    if (!r.sku && !r.name) return;
    if (!r.sku) return errors.push(`Wiersz ${line}: brak kodu`);
    if (!r.name) return errors.push(`Wiersz ${line}: brak nazwy`);
    // netto ma pierwszeństwo; jeśli wpisano tylko brutto → netto = brutto / 1.23
    const net = nz(toNum(r.price_net)), gross = nz(toNum(r.price_gross));
    const price = net ?? (gross != null ? Math.round((gross / 1.23) * 100) / 100 : null);
    if ((r.price_net && toNum(r.price_net) == null) || (r.price_gross && toNum(r.price_gross) == null)) errors.push(`Wiersz ${line}: zła cena`);
    else if (price == null) errors.push(`Kod ${r.sku}: brak ceny — sklepy go nie zamówią`);
    const stock = toNum(r.stock_qty);
    rows.push({
      sku: r.sku, ean: r.ean || null, name: r.name, description: r.description || null,
      category: r.category || null, height_cm: toNum(r.height_cm), material: r.material || null,
      pack_qty: Math.max(1, Math.round(toNum(r.pack_qty) ?? 1)), price_net: price,
      price_gross: gross ?? (price != null ? Math.round(price * 123) / 100 : null),
      in_stock: toBool(r.in_stock, stock == null ? true : stock > 0), active: toBool(r.active, true),
      // zdjęcie: link → zapis; nazwa pliku (BG-001.jpg) → przypisze się przy wgrywaniu zdjęć hurtem
      image_url: /^https?:\/\//i.test(r.image_url ?? "") ? r.image_url : null,
      stock_qty: stock == null ? null : Math.max(0, Math.round(stock)),
      group_code: r.group_code?.replace(/^[,„"'\s]+|[”"'\s]+$/g, "") || null, variant_name: r.variant_name || null,
    });
  });
  // ten sam kod 2x w pliku → zostaje ostatni wiersz
  const bySku = new Map<string, ImportRow>();
  for (const r of rows) {
    if (bySku.has(r.sku)) errors.push(`Kod ${r.sku} występuje kilka razy — użyto ostatniego wiersza`);
    bySku.set(r.sku, r);
  }
  return { rows: [...bySku.values()], errors, unknownCols };
}

const slugify = (s: string) => norm(s).replace(/_/g, "-");

/** Zapis do bazy: tworzy brakujące kategorie, aktualizuje produkty po kodzie (sku). */
export async function saveCatalog(db: SupabaseClient, rows: ImportRow[]) {
  const catNames = [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[];
  if (catNames.length) {
    await db.from("categories").upsert(catNames.map((name) => ({ slug: slugify(name), name })), { onConflict: "slug", ignoreDuplicates: true });
  }
  const { data: cats } = await db.from("categories").select("id,slug");
  const catId = (name: string | null) => (name ? cats?.find((c) => c.slug === slugify(name))?.id ?? null : null);

  let saved = 0;
  const errors: string[] = [];
  // osobno wiersze ze zdjęciem i bez — żeby pusta kolumna nie kasowała wgranych zdjęć
  const groups = [rows.filter((r) => r.image_url), rows.filter((r) => !r.image_url)];
  for (const group of groups) {
    for (let i = 0; i < group.length; i += 200) {
      const chunk = group.slice(i, i + 200);
      const { data, error } = await db.from("products").upsert(
        chunk.map((r) => ({
          sku: r.sku, ean: r.ean, name: r.name, description: r.description, category_id: catId(r.category),
          height_cm: r.height_cm, material: r.material, pack_qty: r.pack_qty, in_stock: r.in_stock, active: r.active, stock_qty: r.stock_qty, group_code: r.group_code, variant_name: r.variant_name,
          ...(r.image_url ? { image_url: r.image_url } : {}),
        })),
        { onConflict: "sku" }
      ).select("id,sku");
      if (error) { errors.push(error.message); continue; }
      saved += data.length;
      const prices = data
        .map((d) => { const r = chunk.find((x) => x.sku === d.sku); return { product_id: d.id, price_net: r?.price_net, price_gross: r?.price_gross }; })
        .filter((p) => p.price_net != null);
      if (prices.length) {
        const { error: pe } = await db.from("product_prices").upsert(prices, { onConflict: "product_id" });
        if (pe) errors.push(pe.message);
      }
    }
  }
  return { saved, errors };
}

export const fullName = (p: { name: string; variant_name: string | null }) =>
  p.variant_name ? `${p.name} – ${p.variant_name}` : p.name;

/** Cena brutto: zapisana z cennika (dokładna) albo wyliczona z netto. */
export const grossOf = (net: number, gross?: number | null) => (gross != null ? Number(gross) : Math.round(net * 123) / 100);
/** Netto z brutto (VAT 23%). */
export const netOf = (gross: number) => Math.round((gross / 1.23) * 100) / 100;

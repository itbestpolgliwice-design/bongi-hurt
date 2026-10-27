export const fullName = (p: { name: string; variant_name: string | null }) =>
  p.variant_name ? `${p.name} – ${p.variant_name}` : p.name;

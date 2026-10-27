import type { NextConfig } from "next";

// Integracja Supabase w Vercel ustawia SUPABASE_URL / SUPABASE_ANON_KEY —
// przekazujemy je też do przeglądarki pod nazwami NEXT_PUBLIC_*.
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } }, // import pliku z katalogiem
};

export default nextConfig;

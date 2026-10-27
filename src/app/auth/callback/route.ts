import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// link z maila Supabase (reset hasła / potwierdzenie konta) → logowanie i przekierowanie
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/nie-pamietam?blad=1", url.origin));
}

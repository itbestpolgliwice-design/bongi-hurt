"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: "Błędny e-mail lub hasło." };
  redirect("/");
}

export async function signUp(_: unknown, form: FormData) {
  const supabase = await createClient();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (get("password").length < 8) return { error: "Hasło musi mieć min. 8 znaków." };
  const { error } = await supabase.auth.signUp({
    email: get("email"),
    password: get("password"),
    options: {
      data: { company_name: get("company_name"), nip: get("nip"), phone: get("phone"), address: get("address") },
    },
  });
  if (error) return { error: error.message };
  return { ok: "Konto założone. Potwierdź e-mail, a po zatwierdzeniu przez BEST-POL zobaczysz ceny." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

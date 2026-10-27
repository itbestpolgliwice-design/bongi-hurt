import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Wpuszcza tylko admina. Zwraca klienta z pełnymi uprawnieniami. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logowanie");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");
  return admin;
}

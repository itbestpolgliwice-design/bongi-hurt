"use client";
import { createBrowser } from "@/lib/supabase/browser";
import { getUploadUrl } from "@/app/admin/actions";

/** Zmniejsza zdjęcie do max 1400 px (webp) i wgrywa do Supabase. Zwraca publiczny URL. */
export async function uploadImage(file: File, name?: string): Promise<string> {
  const blob = await shrink(file);
  const base = (name ?? file.name).replace(/\.[^.]+$/, "");
  const { path, token, publicUrl } = await getUploadUrl(`${base}.webp`);
  const { error } = await createBrowser().storage.from("products").uploadToSignedUrl(path, token, blob, { contentType: "image/webp" });
  if (error) throw new Error(error.message);
  return publicUrl;
}

async function shrink(file: File, max = 1400): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Nie udało się przetworzyć zdjęcia"))), "image/webp", 0.85));
}

"use client";
import { useActionState, useState } from "react";
import { assignImages, importCatalog } from "@/app/admin/actions";
import { uploadImage } from "./imageUpload";

export function CatalogImport() {
  const [state, action, pending] = useActionState(importCatalog, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="file" accept=".xlsx,.csv" required className="block text-sm" />
      <button disabled={pending} className="rounded-md bg-lime-400 px-4 py-2 font-semibold text-black disabled:opacity-50">
        {pending ? "Importuję..." : "Importuj katalog"}
      </button>
      {state?.error && <p className="whitespace-pre-line text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-lime-400">{state.ok}</p>}
      {!!state?.warnings?.length && (
        <ul className="list-disc pl-5 text-xs text-amber-300">{state.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
      )}
    </form>
  );
}

export function BulkImages() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <label className="inline-block cursor-pointer rounded-md border border-neutral-700 px-4 py-2 text-sm hover:border-lime-400">
        {busy ? "Wgrywanie..." : "Wybierz zdjęcia (wiele naraz)"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          if (!files.length) return;
          setBusy(true); setLog([]);
          const list: { sku: string; url: string }[] = [];
          for (const f of files) {
            const sku = f.name.replace(/\.[^.]+$/, "").replace(/[_ ]\d+$/, "").trim(); // BG-001.jpg, BG-001_2.jpg
            try { list.push({ sku, url: await uploadImage(f, sku) }); setLog((l) => [...l, `↑ ${f.name}`]); }
            catch (err) { setLog((l) => [...l, `✕ ${f.name}: ${(err as Error).message}`]); }
          }
          const res = await assignImages(list);
          setLog((l) => [...l, `✓ Przypisano: ${res.done.length}`, ...(res.missing.length ? [`Brak produktu o kodzie: ${res.missing.join(", ")}`] : [])]);
          setBusy(false);
        }} />
      </label>
      {!!log.length && <pre className="max-h-60 overflow-auto rounded-md bg-neutral-900 p-3 text-xs">{log.join("\n")}</pre>}
    </div>
  );
}

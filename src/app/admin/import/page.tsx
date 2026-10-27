import { CatalogImport, BulkImages } from "@/components/admin/ImportForm";

export default function ImportPage() {
  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h1 className="mb-2 text-xl font-bold">Import katalogu z Excela</h1>
        <p className="mb-3 text-sm text-neutral-400">
          Pobierz <a href="/szablon-katalogu.xlsx" className="text-lime-400 underline">szablon</a>, uzupełnij i wgraj (.xlsx lub .csv — z OpenOffice: Plik → Zapisz jako → .xlsx).
          Produkty z tym samym kodem są aktualizowane, nowe — dodawane. Kategorie tworzą się same.
        </p>
        <CatalogImport />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold">Zdjęcia hurtem</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Nazwij pliki kodem produktu, np. <code>BG-001.jpg</code> — zdjęcie samo trafi do właściwego produktu.
          Zdjęcia są automatycznie zmniejszane.
        </p>
        <BulkImages />
      </section>
    </div>
  );
}

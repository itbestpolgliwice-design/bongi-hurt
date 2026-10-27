import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const links = [
    ["/admin/produkty", "Produkty"],
    ["/admin/import", "Import / zdjęcia"],
    ["/admin/sklepy", "Sklepy"],
    ["/admin/zamowienia", "Zamówienia"],
  ];
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-neutral-800 pb-3 text-sm">
        <span className="mr-2 font-bold text-lime-400">PANEL</span>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md bg-neutral-800 px-3 py-1 hover:bg-neutral-700">{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

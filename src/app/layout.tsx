import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import CartLink from "@/components/CartLink";
import { getViewer } from "@/lib/data";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "BEST-POL Hurt — bongi i akcesoria",
  description: "Hurtowy katalog bong i akcesoriów BEST-POL. Zamówienia dla sklepów.",
  robots: { index: false }, // zmień, jeśli strona ma być w Google
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getViewer();
  return (
    <html lang="pl">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {/* filtr wyostrzający przezroczyste szkło na zdjęciach (gamma) */}
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="szklo" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="gamma" exponent="4" />
              <feFuncG type="gamma" exponent="4" />
              <feFuncB type="gamma" exponent="4" />
            </feComponentTransfer>
          </filter>
        </svg>
        <CartProvider>
          <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
              <Link href="/" className="text-lg font-black tracking-tight">
                BEST-POL <span className="text-lime-400">HURT</span>
              </Link>
              <a href="https://epapierosy-hurt.pl" className="rounded-md border border-neutral-700 px-2.5 py-1 text-sm text-neutral-300 hover:border-lime-400 hover:text-white">
                ← <span className="hidden sm:inline">Powrót do </span>hurtowni
              </a>
              <nav className="ml-auto flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <Link href="/konto" className="hidden text-neutral-300 hover:text-white sm:inline">
                      {profile?.company_name || user.email}
                    </Link>
                    {profile?.is_admin && (
                      <Link href="/admin" className="font-semibold text-lime-400">Panel</Link>
                    )}
                    <form action={signOut}>
                      <button className="text-neutral-400 hover:text-white">Wyloguj</button>
                    </form>
                    {profile?.approved && <CartLink />}
                  </>
                ) : (
                  <>
                    <Link href="/logowanie" className="text-neutral-300 hover:text-white">Logowanie</Link>
                    <Link href="/rejestracja" className="rounded-md border border-neutral-700 px-3 py-1.5 hover:border-lime-400">
                      Załóż konto
                    </Link>
                  </>
                )}
              </nav>
            </div>
            {user && profile && !profile.approved && (
              <div className="bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-300">
                Twoje konto czeka na zatwierdzenie przez BEST-POL. Ceny i zamawianie pojawią się po akceptacji.
              </div>
            )}
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
            <a href="https://epapierosy-hurt.pl" className="text-neutral-400 underline hover:text-white">← Wróć do hurtowni epapierosy-hurt.pl</a>
            <br />
            BEST-POL · sprzedaż hurtowa wyłącznie dla firm · produkty dla osób pełnoletnich
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}

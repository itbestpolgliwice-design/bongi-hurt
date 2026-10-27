import AuthForm from "@/components/AuthForm";
import { resetPassword } from "../actions";

export default async function Forgot({ searchParams }: { searchParams: Promise<{ blad?: string }> }) {
  const { blad } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Nie pamiętasz hasła?</h1>
      {blad && <p className="mb-3 text-sm text-red-400">Link wygasł lub otwarto go w innej przeglądarce — wyślij nowy.</p>}
      <p className="mb-4 text-sm text-neutral-400">Podaj e-mail konta, wyślemy link do ustawienia nowego hasła.</p>
      <AuthForm action={resetPassword} submit="Wyślij link" fields={[{ name: "email", label: "E-mail", type: "email" }]} />
    </div>
  );
}

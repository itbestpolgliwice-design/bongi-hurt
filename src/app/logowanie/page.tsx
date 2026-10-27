import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { signIn } from "../actions";

export default function Login() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Logowanie</h1>
      <AuthForm
        action={signIn}
        submit="Zaloguj"
        fields={[
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Hasło", type: "password" },
        ]}
      />
      <p className="mt-4 text-sm text-neutral-400">
        Nie masz konta? <Link href="/rejestracja" className="text-lime-400">Załóż konto sklepu</Link>
      </p>
    </div>
  );
}

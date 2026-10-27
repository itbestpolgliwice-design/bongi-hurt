import AuthForm from "@/components/AuthForm";
import { signUp } from "../actions";

export default function Register() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Konto dla sklepu</h1>
      <p className="mb-4 text-sm text-neutral-400">Po rejestracji zatwierdzimy konto i odblokujemy ceny hurtowe.</p>
      <AuthForm
        action={signUp}
        submit="Załóż konto"
        fields={[
          { name: "company_name", label: "Nazwa firmy / sklepu" },
          { name: "nip", label: "NIP" },
          { name: "address", label: "Adres dostawy" },
          { name: "phone", label: "Telefon", type: "tel" },
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Hasło (min. 8 znaków)", type: "password" },
        ]}
      />
    </div>
  );
}

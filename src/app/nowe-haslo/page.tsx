import AuthForm from "@/components/AuthForm";
import { updatePassword } from "../actions";

export default function NewPassword() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Nowe hasło</h1>
      <AuthForm
        action={updatePassword}
        submit="Zapisz hasło"
        fields={[
          { name: "password", label: "Nowe hasło (min. 8 znaków)", type: "password" },
          { name: "password2", label: "Powtórz hasło", type: "password" },
        ]}
      />
    </div>
  );
}

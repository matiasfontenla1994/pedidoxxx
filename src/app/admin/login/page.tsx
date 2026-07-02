"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form action={formAction} className="bg-white border rounded-xl p-6 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Entrar al panel</h1>
          <p className="text-sm text-zinc-500">Usá las credenciales de tu tienda.</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium block mb-1">Email</span>
          <input name="email" type="email" required className="input" defaultValue="demo@pedix-clone.test" />
        </label>
        <label className="block">
          <span className="text-sm font-medium block mb-1">Contraseña</span>
          <input name="password" type="password" required className="input" defaultValue="demo1234" />
        </label>
        {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-[#ff7e7e] text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-xs text-zinc-400">
          Demo precargada: demo@pedix-clone.test / demo1234 (correr <code>npm run db:seed</code> primero)
        </p>
      </form>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { superAdminLoginAction } from "@/lib/actions/superadmin";

export default function SuperAdminLoginPage() {
  const [state, formAction, pending] = useActionState(superAdminLoginAction, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form action={formAction} className="bg-white border rounded-xl p-6 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Panel de superadmin</h1>
          <p className="text-sm text-zinc-500">Acceso global a todas las tiendas de la plataforma.</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium block mb-1">Email</span>
          <input name="email" type="email" required className="input" />
        </label>
        <label className="block">
          <span className="text-sm font-medium block mb-1">Contraseña</span>
          <input name="password" type="password" required className="input" />
        </label>
        {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-zinc-900 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

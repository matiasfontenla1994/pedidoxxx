"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { importProductsCsvAction } from "@/lib/actions/catalog";

export default function ImportProductsForm() {
  const [state, formAction, pending] = useActionState(importProductsCsvAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="bg-white border rounded-xl p-4 space-y-2" style={{ borderColor: "#ECE6E2" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>Importar / exportar productos (CSV)</h2>
        <div className="flex gap-3 text-xs font-medium" style={{ color: "#E85A47" }}>
          <Link href="/admin/productos/export">Exportar mis productos</Link>
          <Link href="/admin/productos/plantilla">Descargar ejemplo</Link>
        </div>
      </div>
      <form ref={formRef} action={formAction} className="flex items-center gap-2 flex-wrap">
        <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Importando..." : "Importar"}
        </button>
      </form>
      {state?.error && <p className="text-sm" style={{ color: "#DC2626" }}>{state.error}</p>}
      {state?.success && <p className="text-sm" style={{ color: "#059669" }}>{state.success}</p>}
    </div>
  );
}

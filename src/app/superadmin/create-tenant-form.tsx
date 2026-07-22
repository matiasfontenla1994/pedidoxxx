"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTenantAction } from "@/lib/actions/superadmin";

export default function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenantAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="bg-white border rounded-xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
      <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>Nueva tienda</h2>
      <div className="grid grid-cols-2 gap-3">
        <input name="name" required placeholder="Nombre de la tienda" className="input col-span-2" />
        <input name="slug" placeholder="Slug (opcional, ej. mi-tienda)" className="input col-span-2" />
        <input name="whatsapp" required placeholder="WhatsApp (cod. país + número, sin +)" className="input col-span-2" />
        <select name="plan" defaultValue="PRINCIPIANTE" className="input">
          <option value="PRINCIPIANTE">Principiante</option>
          <option value="ESPECIALISTA">Especialista</option>
          <option value="PRO">Pro</option>
        </select>
        <select name="storeType" defaultValue="PRODUCTS" className="input">
          <option value="PRODUCTS">Solo productos</option>
          <option value="SERVICES">Solo servicios con turnos</option>
          <option value="BOTH">Productos y servicios</option>
        </select>
        <select name="currency" defaultValue="ARS" className="input col-span-2">
          <option value="ARS">Peso argentino (ARS)</option>
          <option value="USD">Dólar estadounidense (USD)</option>
          <option value="MXN">Peso mexicano (MXN)</option>
          <option value="CLP">Peso chileno (CLP)</option>
          <option value="COP">Peso colombiano (COP)</option>
          <option value="UYU">Peso uruguayo (UYU)</option>
          <option value="PEN">Sol peruano (PEN)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
      </div>

      <div className="border-t pt-3 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9C8E87" }}>Cuenta del dueño</p>
        <div className="grid grid-cols-2 gap-3">
          <input name="ownerName" placeholder="Nombre del dueño" className="input col-span-2" />
          <input name="ownerEmail" type="email" required placeholder="Email de acceso" className="input col-span-2" />
          <input name="ownerPassword" type="password" required placeholder="Contraseña" className="input col-span-2" />
        </div>
      </div>

      {state?.error && <p className="text-sm" style={{ color: "#DC2626" }}>{state.error}</p>}
      {state?.success && <p className="text-sm" style={{ color: "#059669" }}>Tienda creada correctamente.</p>}

      <button
        type="submit"
        disabled={pending}
        className="text-white px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-50"
        style={{ background: "#E85A47" }}
      >
        {pending ? "Creando..." : "Crear tienda"}
      </button>
    </form>
  );
}

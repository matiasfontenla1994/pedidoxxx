"use client";

import { useState, useTransition } from "react";
import { setTenantStatusAction } from "@/lib/actions/superadmin";
import ToggleSwitch from "../admin/(dashboard)/toggle-switch";

export default function TenantStatusToggle({ id, initialActive }: { id: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !active;
        setActive(next);
        startTransition(() => {
          setTenantStatusAction(id, next ? "ACTIVE" : "SUSPENDED");
        });
      }}
      className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"
      style={{ color: active ? "#059669" : "#DC2626" }}
      aria-pressed={active}
    >
      <ToggleSwitch checked={active} onColor="#059669" offColor="#DC2626" />
      {active ? "Activa" : "Suspendida"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toggleProductActiveAction } from "@/lib/actions/catalog";
import ToggleSwitch from "./toggle-switch";

export default function ActiveToggle({ id, initialActive }: { id: string; initialActive: boolean }) {
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
          toggleProductActiveAction(id, next);
        });
      }}
      className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"
      style={{ color: active ? "#059669" : "#9C8E87" }}
      aria-pressed={active}
    >
      <ToggleSwitch checked={active} onColor="#059669" />
      {active ? "Visible en la tienda" : "Oculto"}
    </button>
  );
}

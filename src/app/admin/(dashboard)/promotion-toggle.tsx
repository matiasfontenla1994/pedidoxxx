"use client";

import { useState, useTransition } from "react";
import { togglePromotionAction } from "@/lib/actions/settings";
import ToggleSwitch from "./toggle-switch";

export default function PromotionToggle({ id, initialActive }: { id: string; initialActive: boolean }) {
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
          togglePromotionAction(id, next);
        });
      }}
      className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"
      style={{ color: active ? "#059669" : "#9C8E87" }}
      aria-pressed={active}
    >
      <ToggleSwitch checked={active} />
      {active ? "Activa" : "Inactiva"}
    </button>
  );
}

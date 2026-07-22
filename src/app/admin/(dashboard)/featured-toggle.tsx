"use client";

import { useState, useTransition } from "react";
import { toggleProductFeaturedAction } from "@/lib/actions/catalog";
import ToggleSwitch from "./toggle-switch";

export default function FeaturedToggle({ id, initialFeatured }: { id: string; initialFeatured: boolean }) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !featured;
        setFeatured(next);
        startTransition(() => {
          toggleProductFeaturedAction(id, next);
        });
      }}
      className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"
      style={{ color: featured ? "#E85A47" : "#9C8E87" }}
      aria-pressed={featured}
    >
      <ToggleSwitch checked={featured} />
      Oferta especial
    </button>
  );
}

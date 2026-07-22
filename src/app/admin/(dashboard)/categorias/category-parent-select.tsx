"use client";

import { useTransition } from "react";
import { updateCategoryParentAction } from "@/lib/actions/catalog";

export default function CategoryParentSelect({
  categoryId, currentParentId, options,
}: {
  categoryId: string;
  currentParentId: string | null;
  options: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={currentParentId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value || null;
        startTransition(() => {
          updateCategoryParentAction(categoryId, value);
        });
      }}
      className="input !w-auto text-xs"
    >
      <option value="">Sin categoría principal</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>Dentro de: {o.name}</option>
      ))}
    </select>
  );
}

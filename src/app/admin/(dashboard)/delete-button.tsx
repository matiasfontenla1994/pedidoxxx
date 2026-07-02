"use client";

import { useTransition } from "react";

export default function DeleteButton({ action, id }: { action: (id: string) => Promise<void>; id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Eliminar? Esta acción no se puede deshacer.")) {
          startTransition(() => action(id));
        }
      }}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}

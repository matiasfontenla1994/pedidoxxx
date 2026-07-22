"use client";

import { useTransition } from "react";

export default function DeleteButton({
  action, id, confirmMessage = "¿Eliminar? Esta acción no se puede deshacer.",
}: {
  action: (id: string) => Promise<void>;
  id: string;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(confirmMessage)) {
          startTransition(() => action(id));
        }
      }}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}

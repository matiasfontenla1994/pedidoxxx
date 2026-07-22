"use client";

import { useActionState, useState, useTransition } from "react";
import { updateStaffLinkAction, regenerateStaffLinkAction } from "@/lib/actions/staff";

export default function StaffLinkManager({
  baseUrl, tenantSlug, staffId, initialLinkSlug,
}: {
  baseUrl: string;
  tenantSlug: string;
  staffId: string;
  initialLinkSlug: string;
}) {
  const [linkSlug, setLinkSlug] = useState(initialLinkSlug);
  const [state, formAction, pending] = useActionState(updateStaffLinkAction.bind(null, staffId), undefined);
  const [regenerating, startRegenerate] = useTransition();
  const [copied, setCopied] = useState(false);

  const url = `${baseUrl}/${tenantSlug}?staff=${linkSlug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; the link is still visible for manual copy
    }
  }

  return (
    <div className="space-y-1.5">
      <form action={formAction} className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ color: "#9C8E87" }}>{baseUrl}/{tenantSlug}?staff=</span>
        <input
          name="linkSlug"
          value={linkSlug}
          onChange={(e) => setLinkSlug(e.target.value)}
          className="input text-xs !w-auto flex-1 min-w-[120px]"
        />
        <button
          type="submit"
          disabled={pending || linkSlug === initialLinkSlug}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
          style={{ background: "#211B18" }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          disabled={regenerating}
          onClick={() =>
            startRegenerate(async () => {
              await regenerateStaffLinkAction(staffId);
            })
          }
          className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50"
          style={{ borderColor: "#ECE6E2", color: "#211B18" }}
        >
          {regenerating ? "..." : "Regenerar"}
        </button>
      </form>
      {state?.error && <p className="text-xs" style={{ color: "#DC2626" }}>{state.error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <input readOnly value={url} className="input text-xs flex-1 min-w-[160px]" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          onClick={copy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0"
          style={{ borderColor: "#ECE6E2", color: copied ? "#059669" : "#211B18" }}
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}

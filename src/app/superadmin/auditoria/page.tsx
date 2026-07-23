import Link from "next/link";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { listAuditLog } from "@/lib/data/audit-log";

const ACTION_LABEL: Record<string, string> = {
  CREATE_TENANT: "Alta de tienda",
  UPDATE_TENANT: "Edición de tienda",
  SUSPEND_TENANT: "Suspensión de tienda",
  ACTIVATE_TENANT: "Reactivación de tienda",
  DELETE_TENANT: "Baja de tienda",
  APPROVE_PLAN_CHANGE: "Aprobación de cambio de plan",
  DISMISS_PLAN_CHANGE: "Rechazo de cambio de plan",
  IMPERSONATE_TENANT: "Ingreso al panel de una tienda",
  END_IMPERSONATION: "Salida del panel de una tienda",
  SUPERADMIN_LOGIN: "Login de superadmin",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR");
}

export default async function AuditoriaPage() {
  await requireSuperAdmin();
  const entries = await listAuditLog(300);

  return (
    <div className="min-h-screen" style={{ background: "#FAF8F6" }}>
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: "#ECE6E2" }}>
        <div>
          <h1 className="font-bold" style={{ color: "#211B18" }}>Auditoría</h1>
          <p className="text-xs" style={{ color: "#9C8E87" }}>Últimas {entries.length} acciones administrativas registradas.</p>
        </div>
        <Link href="/superadmin" className="text-sm font-medium" style={{ color: "#E85A47" }}>
          ← Volver
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#ECE6E2" }}>
          {entries.length === 0 && (
            <p className="p-4 text-sm" style={{ color: "#9C8E87" }}>Todavía no hay acciones registradas.</p>
          )}
          <div className="divide-y" style={{ borderColor: "#ECE6E2" }}>
            {entries.map((e) => (
              <div key={e.id} className="p-4 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-medium" style={{ color: "#211B18" }}>
                    {ACTION_LABEL[e.action] ?? e.action}
                    {e.tenant_name && <span style={{ color: "#9C8E87" }}> · {e.tenant_name}</span>}
                  </p>
                  <span className="text-xs" style={{ color: "#9C8E87" }}>{formatDate(e.created_at)}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>{e.actor_email}</p>
                {e.details && (
                  <pre className="text-xs mt-1 p-2 rounded-lg overflow-x-auto" style={{ background: "#FAF8F6", color: "#6E635E" }}>
                    {JSON.stringify(JSON.parse(e.details), null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { listTenants } from "@/lib/data/tenants";
import { getTenantOwnerEmail } from "@/lib/data/users";
import { orderStats } from "@/lib/data/orders";
import { superAdminLogoutAction } from "@/lib/actions/superadmin";
import CreateTenantForm from "./create-tenant-form";
import TenantRow from "./tenant-row";

export default async function SuperAdminPage() {
  const { user } = await requireSuperAdmin();
  const tenants = await listTenants();
  const tenantsWithDetails = await Promise.all(
    tenants.map(async (t) => ({
      tenant: t,
      ownerEmail: await getTenantOwnerEmail(t.id),
      stats: await orderStats(t.id),
    }))
  );

  return (
    <div className="min-h-screen" style={{ background: "#FAF8F6" }}>
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: "#ECE6E2" }}>
        <div>
          <h1 className="font-bold" style={{ color: "#211B18" }}>Superadmin</h1>
          <p className="text-xs" style={{ color: "#9C8E87" }}>{user.name} · {user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/superadmin/auditoria" className="text-sm font-medium" style={{ color: "#E85A47" }}>
            Auditoría
          </Link>
          <form action={superAdminLogoutAction}>
            <button className="text-sm" style={{ color: "#9C8E87" }}>Cerrar sesión</button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <CreateTenantForm />

        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#ECE6E2" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#ECE6E2" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>
              Tiendas ({tenants.length})
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "#ECE6E2" }}>
            {tenantsWithDetails.length === 0 && (
              <p className="p-4 text-sm" style={{ color: "#9C8E87" }}>Todavía no hay tiendas.</p>
            )}
            {tenantsWithDetails.map(({ tenant, ownerEmail, stats }) => (
              <TenantRow key={tenant.id} tenant={tenant} ownerEmail={ownerEmail} stats={stats} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

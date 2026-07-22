import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/data/users";
import { getTenantById } from "@/lib/data/tenants";

export async function requireAdmin() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/admin/login");
  const user = await getUserById(session.userId);
  const tenant = await getTenantById(session.tenantId);
  if (!user || !tenant) redirect("/admin/login");
  const impersonating = user.role === "SUPER_ADMIN";
  if (tenant.status === "SUSPENDED" && !impersonating) redirect("/admin/suspended");
  return { user, tenant, impersonating };
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/data/users";
import { getTenantById } from "@/lib/data/tenants";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const user = getUserById(session.userId);
  const tenant = getTenantById(session.tenantId);
  if (!user || !tenant) redirect("/admin/login");
  return { user, tenant };
}

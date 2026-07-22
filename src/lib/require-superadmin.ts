import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/data/users";

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) redirect("/superadmin/login");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "SUPER_ADMIN") redirect("/superadmin/login");
  return { user };
}

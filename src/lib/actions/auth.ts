"use server";

import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/data/users";
import { getTenantById } from "@/lib/data/tenants";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";
import { recordLoginAttempt, isLoginLocked, LOGIN_LOCKOUT_MESSAGE } from "@/lib/data/login-attempts";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (await isLoginLocked(email)) return { error: LOGIN_LOCKOUT_MESSAGE };

  const user = await getUserByEmail(email);
  if (!user) {
    await recordLoginAttempt(email, false);
    return { error: "Email o contraseña incorrectos." };
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await recordLoginAttempt(email, false);
    return { error: "Email o contraseña incorrectos." };
  }

  if (!user.tenant_id) return { error: "Esta cuenta no pertenece a una tienda. Usá /superadmin/login." };

  const tenant = await getTenantById(user.tenant_id);
  if (tenant?.status === "SUSPENDED") {
    return { error: "Tu tienda está suspendida. Contactá a soporte para regularizar la situación." };
  }

  await recordLoginAttempt(email, true);
  await createSession(user.id, user.tenant_id);
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

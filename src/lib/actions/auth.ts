"use server";

import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/data/users";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = getUserByEmail(email);
  if (!user) return { error: "Email o contraseña incorrectos." };

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { error: "Email o contraseña incorrectos." };

  await createSession(user.id, user.tenant_id);
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

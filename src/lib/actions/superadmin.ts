"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserByEmail, getUserById } from "@/lib/data/users";
import { verifyPassword, createSession, destroySession, getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-superadmin";
import { createTenant, updateTenant, deleteTenant, getTenantById } from "@/lib/data/tenants";
import { createUser } from "@/lib/data/users";
import { createPaymentMethod } from "@/lib/data/payment-methods";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/data/audit-log";
import { recordLoginAttempt, isLoginLocked, LOGIN_LOCKOUT_MESSAGE } from "@/lib/data/login-attempts";
import { validatePassword } from "@/lib/password-policy";
import { db } from "@/lib/db";

export async function superAdminLoginAction(_prevState: { error?: string } | undefined, formData: FormData) {
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

  if (user.role !== "SUPER_ADMIN") {
    await recordLoginAttempt(email, false);
    return { error: "Esta cuenta no tiene permiso de superadmin." };
  }

  await recordLoginAttempt(email, true);
  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "SUPERADMIN_LOGIN",
  });

  await createSession(user.id, null);
  redirect("/superadmin");
}

export async function superAdminLogoutAction() {
  await destroySession();
  redirect("/superadmin/login");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createTenantAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "").trim() || "Dueño/a";
  const plan = String(formData.get("plan") ?? "PRINCIPIANTE");
  const currency = String(formData.get("currency") ?? "ARS").toUpperCase();
  const storeType = String(formData.get("storeType") ?? "PRODUCTS");
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name || !whatsapp || !ownerEmail || !ownerPassword) {
    return { error: "Faltan datos obligatorios." };
  }

  const passwordError = validatePassword(ownerPassword);
  if (passwordError) return { error: passwordError };

  const slug = slugify(slugInput || name);

  const existingSlug = await db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug);
  if (existingSlug) return { error: `Ya existe una tienda con el slug "${slug}".` };

  const existingUser = await getUserByEmail(ownerEmail);
  if (existingUser) return { error: `Ya existe un usuario con el email "${ownerEmail}".` };

  const tenant = await createTenant({ slug, name, whatsapp, plan, currency, storeType });
  const passwordHash = await hashPassword(ownerPassword);
  await createUser({ email: ownerEmail, passwordHash, name: ownerName, tenantId: tenant.id, role: "OWNER" });
  await createPaymentMethod(tenant.id, "Efectivo", 0, "PERCENT");

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId: tenant.id,
    tenantName: tenant.name,
    action: "CREATE_TENANT",
    details: { slug, plan, storeType },
  });

  revalidatePath("/superadmin");
  return { success: true };
}

export async function updateTenantAsSuperAdminAction(id: string, formData: FormData) {
  const { user } = await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const plan = String(formData.get("plan") ?? "PRINCIPIANTE");
  const currency = String(formData.get("currency") ?? "ARS").toUpperCase();
  const storeType = String(formData.get("storeType") ?? "PRODUCTS") as "PRODUCTS" | "SERVICES" | "BOTH";
  if (!name || !whatsapp) return;

  const before = await getTenantById(id);
  await updateTenant(id, { name, whatsapp, plan: plan as never, currency, store_type: storeType });

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId: id,
    tenantName: name,
    action: "UPDATE_TENANT",
    details: { before: before && { name: before.name, plan: before.plan, storeType: before.store_type }, after: { name, plan, storeType } },
  });

  revalidatePath("/superadmin");
}

export async function setTenantStatusAction(id: string, status: "ACTIVE" | "SUSPENDED") {
  const { user } = await requireSuperAdmin();
  const tenant = await getTenantById(id);
  await updateTenant(id, { status });

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId: id,
    tenantName: tenant?.name ?? null,
    action: status === "SUSPENDED" ? "SUSPEND_TENANT" : "ACTIVATE_TENANT",
  });

  revalidatePath("/superadmin");
}

export async function deleteTenantAction(id: string) {
  const { user } = await requireSuperAdmin();
  const tenant = await getTenantById(id);
  await deleteTenant(id);

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId: id,
    tenantName: tenant?.name ?? null,
    action: "DELETE_TENANT",
  });

  revalidatePath("/superadmin");
}

export async function approvePlanChangeAction(tenantId: string) {
  const { user } = await requireSuperAdmin();
  const tenant = await getTenantById(tenantId);
  if (!tenant?.plan_requested) return;
  const requestedPlan = tenant.plan_requested;
  await updateTenant(tenantId, { plan: requestedPlan as never, plan_requested: null });

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId,
    tenantName: tenant.name,
    action: "APPROVE_PLAN_CHANGE",
    details: { from: tenant.plan, to: requestedPlan },
  });

  revalidatePath("/superadmin");
}

export async function dismissPlanChangeRequestAction(tenantId: string) {
  const { user } = await requireSuperAdmin();
  const tenant = await getTenantById(tenantId);
  await updateTenant(tenantId, { plan_requested: null });

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId,
    tenantName: tenant?.name ?? null,
    action: "DISMISS_PLAN_CHANGE",
    details: { requested: tenant?.plan_requested ?? null },
  });

  revalidatePath("/superadmin");
}

export async function impersonateTenantAction(tenantId: string) {
  const { user } = await requireSuperAdmin();
  const tenant = await getTenantById(tenantId);
  if (!tenant) return;

  await logAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    tenantId: tenant.id,
    tenantName: tenant.name,
    action: "IMPERSONATE_TENANT",
  });

  await createSession(user.id, tenantId);
  redirect("/admin/dashboard");
}

export async function returnToSuperAdminAction() {
  const session = await getSession();
  if (!session) redirect("/superadmin/login");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "SUPER_ADMIN") redirect("/superadmin/login");

  if (session.tenantId) {
    const tenant = await getTenantById(session.tenantId);
    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      tenantId: session.tenantId,
      tenantName: tenant?.name ?? null,
      action: "END_IMPERSONATION",
    });
  }

  await createSession(user.id, null);
  redirect("/superadmin");
}

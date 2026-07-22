import { db, newId, nowIso } from "@/lib/db";
import type { AppUser } from "./types";

export async function getUserByEmail(email: string): Promise<AppUser | undefined> {
  return (await db.prepare("SELECT * FROM users WHERE email = ?").get(email)) as unknown as AppUser | undefined;
}

export async function getUserById(id: string): Promise<AppUser | undefined> {
  return (await db.prepare("SELECT * FROM users WHERE id = ?").get(id)) as unknown as AppUser | undefined;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  tenantId: string | null;
  role?: string;
}): Promise<AppUser> {
  const id = newId();
  await db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.email, input.passwordHash, input.name, input.role ?? "OWNER", input.tenantId, nowIso());
  return (await getUserById(id))!;
}

export async function listUsersByRole(role: string): Promise<AppUser[]> {
  return (await db.prepare("SELECT * FROM users WHERE role = ?").all(role)) as unknown as AppUser[];
}

export async function getTenantOwnerEmail(tenantId: string): Promise<string | undefined> {
  const row = (await db
    .prepare("SELECT email FROM users WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1")
    .get(tenantId)) as { email: string } | undefined;
  return row?.email;
}

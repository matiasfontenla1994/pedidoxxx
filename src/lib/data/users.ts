import { db, newId, nowIso } from "@/lib/db";
import type { AppUser } from "./types";

export function getUserByEmail(email: string): AppUser | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as unknown as AppUser | undefined;
}

export function getUserById(id: string): AppUser | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as AppUser | undefined;
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  tenantId: string;
  role?: string;
}): AppUser {
  const id = newId();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.email, input.passwordHash, input.name, input.role ?? "OWNER", input.tenantId, nowIso());
  return getUserById(id)!;
}

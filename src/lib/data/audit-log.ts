import { db, newId, nowIso } from "@/lib/db";
import type { AuditLogEntry } from "./types";

export interface LogAuditInput {
  actorUserId: string | null;
  actorEmail: string;
  tenantId?: string | null;
  tenantName?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_log (id, actor_user_id, actor_email, tenant_id, tenant_name, action, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    input.actorUserId,
    input.actorEmail,
    input.tenantId ?? null,
    input.tenantName ?? null,
    input.action,
    input.details ? JSON.stringify(input.details) : null,
    nowIso()
  );
}

export async function listAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  return (await db
    .prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?")
    .all(limit)) as unknown as AuditLogEntry[];
}

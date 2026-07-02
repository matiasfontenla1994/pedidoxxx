import { db, newId, nowIso } from "@/lib/db";

export function getBlockedSlotTimes(staffId: string, date: string): string[] {
  const rows = db
    .prepare("SELECT time FROM blocked_slots WHERE staff_id = ? AND date = ?")
    .all(staffId, date) as { time: string }[];
  return rows.map((r) => r.time);
}

export function addBlockedSlot(tenantId: string, staffId: string, date: string, time: string) {
  try {
    db.prepare(
      "INSERT INTO blocked_slots (id, tenant_id, staff_id, date, time, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(newId(), tenantId, staffId, date, time, nowIso());
  } catch {
    // UNIQUE constraint: slot already blocked, ignore
  }
}

export function removeBlockedSlot(tenantId: string, staffId: string, date: string, time: string) {
  db.prepare(
    "DELETE FROM blocked_slots WHERE staff_id = ? AND tenant_id = ? AND date = ? AND time = ?"
  ).run(staffId, tenantId, date, time);
}

export function isSlotBlocked(staffId: string, date: string, time: string): boolean {
  const row = db
    .prepare("SELECT id FROM blocked_slots WHERE staff_id = ? AND date = ? AND time = ?")
    .get(staffId, date, time);
  return !!row;
}

import { db, newId, nowIso } from "@/lib/db";

export async function getBlockedSlotTimes(staffId: string, date: string): Promise<string[]> {
  const rows = (await db
    .prepare("SELECT time FROM blocked_slots WHERE staff_id = ? AND date = ?")
    .all(staffId, date)) as { time: string }[];
  return rows.map((r) => r.time);
}

export async function addBlockedSlot(tenantId: string, staffId: string, date: string, time: string) {
  try {
    await db.prepare(
      "INSERT INTO blocked_slots (id, tenant_id, staff_id, date, time, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(newId(), tenantId, staffId, date, time, nowIso());
  } catch {
    // UNIQUE constraint: slot already blocked, ignore
  }
}

export async function removeBlockedSlot(tenantId: string, staffId: string, date: string, time: string) {
  await db.prepare(
    "DELETE FROM blocked_slots WHERE staff_id = ? AND tenant_id = ? AND date = ? AND time = ?"
  ).run(staffId, tenantId, date, time);
}

export async function isSlotBlocked(staffId: string, date: string, time: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM blocked_slots WHERE staff_id = ? AND date = ? AND time = ?")
    .get(staffId, date, time);
  return !!row;
}

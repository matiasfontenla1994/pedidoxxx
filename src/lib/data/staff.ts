import { db, newId, nowIso } from "@/lib/db";
import type { Staff, StaffSchedule } from "./types";

export function listStaff(tenantId: string): Staff[] {
  return db.prepare("SELECT * FROM staff WHERE tenant_id = ? AND active = 1 ORDER BY created_at ASC").all(tenantId) as unknown as Staff[];
}

export function getStaffById(id: string): Staff | undefined {
  return db.prepare("SELECT * FROM staff WHERE id = ?").get(id) as unknown as Staff | undefined;
}

export function createStaff(tenantId: string, name: string): Staff {
  const id = newId();
  db.prepare("INSERT INTO staff (id, tenant_id, name, active, created_at) VALUES (?, ?, ?, 1, ?)").run(id, tenantId, name, nowIso());
  return getStaffById(id)!;
}

export function deleteStaff(tenantId: string, id: string) {
  db.prepare("DELETE FROM staff WHERE id = ? AND tenant_id = ?").run(id, tenantId);
  db.prepare("DELETE FROM staff_schedules WHERE staff_id = ? AND tenant_id = ?").run(id, tenantId);
}

export function getStaffSchedules(staffId: string): StaffSchedule[] {
  return db.prepare("SELECT * FROM staff_schedules WHERE staff_id = ? ORDER BY day_of_week ASC").all(staffId) as unknown as StaffSchedule[];
}

export function upsertStaffSchedule(
  staffId: string,
  tenantId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  slotMinutes: number
) {
  const existing = db.prepare("SELECT id FROM staff_schedules WHERE staff_id = ? AND day_of_week = ?").get(staffId, dayOfWeek) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE staff_schedules SET start_time = ?, end_time = ?, slot_minutes = ? WHERE id = ?").run(startTime, endTime, slotMinutes, existing.id);
  } else {
    db.prepare(
      "INSERT INTO staff_schedules (id, staff_id, tenant_id, day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(newId(), staffId, tenantId, dayOfWeek, startTime, endTime, slotMinutes);
  }
}

export function removeStaffScheduleDay(tenantId: string, staffId: string, dayOfWeek: number) {
  db.prepare("DELETE FROM staff_schedules WHERE staff_id = ? AND tenant_id = ? AND day_of_week = ?").run(staffId, tenantId, dayOfWeek);
}

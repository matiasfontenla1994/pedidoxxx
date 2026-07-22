import { db, newId, nowIso } from "@/lib/db";
import { slugify, randomSuffix } from "@/lib/slugify";
import type { Staff, StaffSchedule } from "./types";

export async function listStaff(tenantId: string): Promise<Staff[]> {
  const rows = (await db
    .prepare("SELECT * FROM staff WHERE tenant_id = ? AND active = 1 ORDER BY created_at ASC")
    .all(tenantId)) as unknown as Staff[];

  // Backfill link_slug for staff created before this field existed.
  for (const member of rows) {
    if (!member.link_slug) {
      member.link_slug = await generateUniqueLinkSlug(tenantId, member.name);
      await db.prepare("UPDATE staff SET link_slug = ? WHERE id = ?").run(member.link_slug, member.id);
    }
  }
  return rows;
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
  return (await db.prepare("SELECT * FROM staff WHERE id = ?").get(id)) as unknown as Staff | undefined;
}

export async function getStaffByLinkSlug(tenantId: string, linkSlug: string): Promise<Staff | undefined> {
  return (await db
    .prepare("SELECT * FROM staff WHERE tenant_id = ? AND link_slug = ?")
    .get(tenantId, linkSlug)) as unknown as Staff | undefined;
}

async function generateUniqueLinkSlug(tenantId: string, base: string): Promise<string> {
  const cleanBase = slugify(base) || "profesional";
  let candidate = cleanBase;
  while (await getStaffByLinkSlug(tenantId, candidate)) {
    candidate = `${cleanBase}-${randomSuffix()}`;
  }
  return candidate;
}

export async function createStaff(tenantId: string, name: string): Promise<Staff> {
  const id = newId();
  const linkSlug = await generateUniqueLinkSlug(tenantId, name);
  await db.prepare(
    "INSERT INTO staff (id, tenant_id, name, active, link_slug, created_at) VALUES (?, ?, ?, 1, ?, ?)"
  ).run(id, tenantId, name, linkSlug, nowIso());
  return (await getStaffById(id))!;
}

export async function setStaffLinkSlug(
  tenantId: string,
  id: string,
  linkSlug: string
): Promise<{ error?: string }> {
  const clean = slugify(linkSlug);
  if (!clean) return { error: "El link no puede estar vacío." };
  const existing = await getStaffByLinkSlug(tenantId, clean);
  if (existing && existing.id !== id) return { error: "Ese link ya lo usa otro profesional." };
  await db.prepare("UPDATE staff SET link_slug = ? WHERE id = ? AND tenant_id = ?").run(clean, id, tenantId);
  return {};
}

export async function regenerateStaffLinkSlug(tenantId: string, id: string): Promise<string> {
  const member = await getStaffById(id);
  const base = member?.name ?? "profesional";
  const linkSlug = await generateUniqueLinkSlug(tenantId, `${base}-${randomSuffix()}`);
  await db.prepare("UPDATE staff SET link_slug = ? WHERE id = ? AND tenant_id = ?").run(linkSlug, id, tenantId);
  return linkSlug;
}

export async function deleteStaff(tenantId: string, id: string) {
  await db.prepare("DELETE FROM staff WHERE id = ? AND tenant_id = ?").run(id, tenantId);
  await db.prepare("DELETE FROM staff_schedules WHERE staff_id = ? AND tenant_id = ?").run(id, tenantId);
}

export async function getStaffSchedules(staffId: string): Promise<StaffSchedule[]> {
  return (await db.prepare("SELECT * FROM staff_schedules WHERE staff_id = ? ORDER BY day_of_week ASC").all(staffId)) as unknown as StaffSchedule[];
}

export async function upsertStaffSchedule(
  staffId: string,
  tenantId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  slotMinutes: number
) {
  const existing = (await db.prepare("SELECT id FROM staff_schedules WHERE staff_id = ? AND day_of_week = ?").get(staffId, dayOfWeek)) as { id: string } | undefined;
  if (existing) {
    await db.prepare("UPDATE staff_schedules SET start_time = ?, end_time = ?, slot_minutes = ? WHERE id = ?").run(startTime, endTime, slotMinutes, existing.id);
  } else {
    await db.prepare(
      "INSERT INTO staff_schedules (id, staff_id, tenant_id, day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(newId(), staffId, tenantId, dayOfWeek, startTime, endTime, slotMinutes);
  }
}

export async function removeStaffScheduleDay(tenantId: string, staffId: string, dayOfWeek: number) {
  await db.prepare("DELETE FROM staff_schedules WHERE staff_id = ? AND tenant_id = ? AND day_of_week = ?").run(staffId, tenantId, dayOfWeek);
}

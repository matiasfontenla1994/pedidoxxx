import { db, newId, nowIso } from "@/lib/db";
import type { Appointment } from "./types";
import { getStaffSchedules } from "./staff";
import { getBlockedSlotTimes } from "./blocked-slots";

export async function getAvailableSlots(staffId: string, date: string): Promise<string[]> {
  // date: YYYY-MM-DD
  const jsDay = new Date(date + "T12:00:00").getDay(); // 0=Sun, 1=Mon...
  // Convert to our convention: 0=Mon ... 6=Sun
  const ourDay = jsDay === 0 ? 6 : jsDay - 1;

  const schedules = await getStaffSchedules(staffId);
  const daySchedule = schedules.find((s) => s.day_of_week === ourDay);
  if (!daySchedule) return [];

  const [startH, startM] = daySchedule.start_time.split(":").map(Number);
  const [endH, endM] = daySchedule.end_time.split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const allSlots: string[] = [];
  for (let m = startTotal; m < endTotal; m += daySchedule.slot_minutes) {
    const h = Math.floor(m / 60).toString().padStart(2, "0");
    const min = (m % 60).toString().padStart(2, "0");
    allSlots.push(`${h}:${min}`);
  }

  const booked = (await db
    .prepare("SELECT time FROM appointments WHERE staff_id = ? AND date = ? AND status = 'CONFIRMED'")
    .all(staffId, date)) as { time: string }[];
  const blocked = await getBlockedSlotTimes(staffId, date);
  const unavailable = new Set([...booked.map((b) => b.time), ...blocked]);

  return allSlots.filter((s) => !unavailable.has(s));
}

export async function createAppointment(input: {
  tenantId: string;
  staffId: string;
  orderId: string;
  serviceName: string;
  date: string;
  time: string;
  durationMinutes?: number;
}): Promise<Appointment> {
  const id = newId();
  await db.prepare(
    `INSERT INTO appointments (id, tenant_id, staff_id, order_id, service_name, date, time, duration_minutes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)`
  ).run(id, input.tenantId, input.staffId, input.orderId, input.serviceName, input.date, input.time, input.durationMinutes ?? 30, nowIso());
  return (await db.prepare("SELECT * FROM appointments WHERE id = ?").get(id)) as unknown as Appointment;
}

export async function listAppointments(tenantId: string): Promise<Appointment[]> {
  return (await db
    .prepare("SELECT * FROM appointments WHERE tenant_id = ? ORDER BY date ASC, time ASC")
    .all(tenantId)) as unknown as Appointment[];
}

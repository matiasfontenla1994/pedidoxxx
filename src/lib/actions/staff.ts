"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createStaff, deleteStaff, upsertStaffSchedule, removeStaffScheduleDay, getStaffSchedules } from "@/lib/data/staff";
import { addBlockedSlot, removeBlockedSlot, getBlockedSlotTimes, isSlotBlocked } from "@/lib/data/blocked-slots";
import { db } from "@/lib/db";

export async function createStaffAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  createStaff(tenant.id, name);
  revalidatePath("/admin/staff");
}

export async function deleteStaffAction(id: string) {
  const { tenant } = await requireAdmin();
  deleteStaff(tenant.id, id);
  revalidatePath("/admin/staff");
}

export async function upsertStaffScheduleAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const staffId = String(formData.get("staffId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "18:00");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);
  if (!staffId || Number.isNaN(dayOfWeek)) return;
  upsertStaffSchedule(staffId, tenant.id, dayOfWeek, startTime, endTime, slotMinutes);
  revalidatePath("/admin/staff");
}

export async function removeStaffScheduleDayAction(staffId: string, dayOfWeek: number) {
  const { tenant } = await requireAdmin();
  removeStaffScheduleDay(tenant.id, staffId, dayOfWeek);
  revalidatePath("/admin/staff");
}

export type SlotStatus = "available" | "blocked_manual" | "booked_online";

export async function getStaffSlotsStatusAction(
  staffId: string,
  date: string
): Promise<{ time: string; status: SlotStatus }[]> {
  const { tenant } = await requireAdmin();

  // Verify staff belongs to this tenant
  const member = db.prepare("SELECT id FROM staff WHERE id = ? AND tenant_id = ?").get(staffId, tenant.id);
  if (!member) return [];

  const jsDay = new Date(date + "T12:00:00").getDay();
  const ourDay = jsDay === 0 ? 6 : jsDay - 1;
  const schedules = getStaffSchedules(staffId);
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

  const booked = db
    .prepare("SELECT time FROM appointments WHERE staff_id = ? AND date = ? AND status = 'CONFIRMED'")
    .all(staffId, date) as { time: string }[];
  const bookedSet = new Set(booked.map((b) => b.time));
  const blockedTimes = new Set(getBlockedSlotTimes(staffId, date));

  return allSlots.map((time) => ({
    time,
    status: bookedSet.has(time)
      ? "booked_online"
      : blockedTimes.has(time)
      ? "blocked_manual"
      : "available",
  }));
}

export async function toggleBlockedSlotAction(staffId: string, date: string, time: string) {
  const { tenant } = await requireAdmin();
  const member = db.prepare("SELECT id FROM staff WHERE id = ? AND tenant_id = ?").get(staffId, tenant.id);
  if (!member) return;

  if (isSlotBlocked(staffId, date, time)) {
    removeBlockedSlot(tenant.id, staffId, date, time);
  } else {
    addBlockedSlot(tenant.id, staffId, date, time);
  }
}

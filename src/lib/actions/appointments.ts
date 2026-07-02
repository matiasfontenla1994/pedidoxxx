"use server";

import { getAvailableSlots } from "@/lib/data/appointments";

export async function getAvailableSlotsAction(staffId: string, date: string): Promise<string[]> {
  if (!staffId || !date) return [];
  return getAvailableSlots(staffId, date);
}

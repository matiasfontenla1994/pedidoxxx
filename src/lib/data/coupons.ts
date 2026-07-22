import { db, newId, nowIso } from "@/lib/db";
import type { Coupon } from "./types";

export async function listCoupons(tenantId: string): Promise<Coupon[]> {
  return (await db.prepare("SELECT * FROM coupons WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId)) as unknown as Coupon[];
}

export async function getCouponByCode(tenantId: string, code: string): Promise<Coupon | undefined> {
  return (await db
    .prepare("SELECT * FROM coupons WHERE tenant_id = ? AND UPPER(code) = UPPER(?)")
    .get(tenantId, code)) as unknown as Coupon | undefined;
}

export async function createCoupon(tenantId: string, input: { code: string; type: "PERCENT" | "FIXED"; value: number }): Promise<Coupon> {
  const id = newId();
  await db.prepare(
    `INSERT INTO coupons (id, tenant_id, code, type, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, input.code.toUpperCase(), input.type, input.value, nowIso());
  return (await db.prepare("SELECT * FROM coupons WHERE id = ?").get(id)) as unknown as Coupon;
}

export async function updateCoupon(
  tenantId: string,
  id: string,
  input: { code: string; type: "PERCENT" | "FIXED"; value: number }
) {
  await db.prepare(
    "UPDATE coupons SET code = ?, type = ?, value = ? WHERE id = ? AND tenant_id = ?"
  ).run(input.code.toUpperCase(), input.type, input.value, id, tenantId);
}

export async function deleteCoupon(tenantId: string, id: string) {
  await db.prepare("DELETE FROM coupons WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

export async function toggleCoupon(tenantId: string, id: string, active: boolean) {
  await db.prepare("UPDATE coupons SET active = ? WHERE id = ? AND tenant_id = ?").run(active ? 1 : 0, id, tenantId);
}

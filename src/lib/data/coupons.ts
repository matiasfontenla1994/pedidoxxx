import { db, newId, nowIso } from "@/lib/db";
import type { Coupon } from "./types";

export function listCoupons(tenantId: string): Coupon[] {
  return db.prepare("SELECT * FROM coupons WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId) as unknown as Coupon[];
}

export function getCouponByCode(tenantId: string, code: string): Coupon | undefined {
  return db
    .prepare("SELECT * FROM coupons WHERE tenant_id = ? AND code = ? COLLATE NOCASE")
    .get(tenantId, code) as unknown as Coupon | undefined;
}

export function createCoupon(tenantId: string, input: { code: string; type: "PERCENT" | "FIXED"; value: number }): Coupon {
  const id = newId();
  db.prepare(
    `INSERT INTO coupons (id, tenant_id, code, type, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, input.code.toUpperCase(), input.type, input.value, nowIso());
  return db.prepare("SELECT * FROM coupons WHERE id = ?").get(id) as unknown as Coupon;
}

export function deleteCoupon(tenantId: string, id: string) {
  db.prepare("DELETE FROM coupons WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

export function toggleCoupon(tenantId: string, id: string, active: boolean) {
  db.prepare("UPDATE coupons SET active = ? WHERE id = ? AND tenant_id = ?").run(active ? 1 : 0, id, tenantId);
}

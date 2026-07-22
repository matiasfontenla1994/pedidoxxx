import { db, newId, nowIso } from "@/lib/db";
import type { Promotion } from "./types";

export async function listPromotions(tenantId: string): Promise<Promotion[]> {
  return (await db
    .prepare("SELECT * FROM promotions WHERE tenant_id = ? ORDER BY created_at DESC")
    .all(tenantId)) as unknown as Promotion[];
}

export async function listActivePromotions(tenantId: string): Promise<Promotion[]> {
  return (await db
    .prepare("SELECT * FROM promotions WHERE tenant_id = ? AND active = 1 ORDER BY created_at DESC")
    .all(tenantId)) as unknown as Promotion[];
}

export interface PromotionInput {
  name: string;
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  scopeId: string | null;
  buyQty: number;
  payQty: number;
}

export async function createPromotion(tenantId: string, input: PromotionInput): Promise<Promotion> {
  const id = newId();
  await db.prepare(
    `INSERT INTO promotions (id, tenant_id, name, scope, scope_id, buy_qty, pay_qty, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, input.name, input.scope, input.scopeId, input.buyQty, input.payQty, nowIso());
  return (await db.prepare("SELECT * FROM promotions WHERE id = ?").get(id)) as unknown as Promotion;
}

export async function updatePromotion(tenantId: string, id: string, input: PromotionInput) {
  await db.prepare(
    `UPDATE promotions SET name = ?, scope = ?, scope_id = ?, buy_qty = ?, pay_qty = ?
     WHERE id = ? AND tenant_id = ?`
  ).run(input.name, input.scope, input.scopeId, input.buyQty, input.payQty, id, tenantId);
}

export async function deletePromotion(tenantId: string, id: string) {
  await db.prepare("DELETE FROM promotions WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

export async function togglePromotion(tenantId: string, id: string, active: boolean) {
  await db.prepare("UPDATE promotions SET active = ? WHERE id = ? AND tenant_id = ?").run(active ? 1 : 0, id, tenantId);
}

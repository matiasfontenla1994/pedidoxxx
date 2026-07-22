import { db, newId } from "@/lib/db";
import type { PaymentMethod } from "./types";

export async function listPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
  return (await db.prepare("SELECT * FROM payment_methods WHERE tenant_id = ?").all(tenantId)) as unknown as PaymentMethod[];
}

export async function getPaymentMethodByName(tenantId: string, name: string): Promise<PaymentMethod | undefined> {
  return (await db
    .prepare("SELECT * FROM payment_methods WHERE tenant_id = ? AND name = ?")
    .get(tenantId, name)) as unknown as PaymentMethod | undefined;
}

export async function createPaymentMethod(
  tenantId: string,
  name: string,
  adjustmentPct = 0,
  adjustmentType: "PERCENT" | "FIXED" = "PERCENT"
): Promise<PaymentMethod> {
  const id = newId();
  await db.prepare(
    `INSERT INTO payment_methods (id, tenant_id, name, adjustment_pct, adjustment_type) VALUES (?, ?, ?, ?, ?)`
  ).run(id, tenantId, name, adjustmentPct, adjustmentType);
  return (await db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(id)) as unknown as PaymentMethod;
}

export async function updatePaymentMethod(
  tenantId: string,
  id: string,
  name: string,
  adjustmentPct: number,
  adjustmentType: "PERCENT" | "FIXED"
) {
  await db.prepare(
    "UPDATE payment_methods SET name = ?, adjustment_pct = ?, adjustment_type = ? WHERE id = ? AND tenant_id = ?"
  ).run(name, adjustmentPct, adjustmentType, id, tenantId);
}

export async function deletePaymentMethod(tenantId: string, id: string) {
  await db.prepare("DELETE FROM payment_methods WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

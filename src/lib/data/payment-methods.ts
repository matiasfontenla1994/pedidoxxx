import { db, newId } from "@/lib/db";
import type { PaymentMethod } from "./types";

export function listPaymentMethods(tenantId: string): PaymentMethod[] {
  return db.prepare("SELECT * FROM payment_methods WHERE tenant_id = ?").all(tenantId) as unknown as PaymentMethod[];
}

export function createPaymentMethod(tenantId: string, name: string, adjustmentPct = 0): PaymentMethod {
  const id = newId();
  db.prepare(
    `INSERT INTO payment_methods (id, tenant_id, name, adjustment_pct) VALUES (?, ?, ?, ?)`
  ).run(id, tenantId, name, adjustmentPct);
  return db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(id) as unknown as PaymentMethod;
}

export function deletePaymentMethod(tenantId: string, id: string) {
  db.prepare("DELETE FROM payment_methods WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

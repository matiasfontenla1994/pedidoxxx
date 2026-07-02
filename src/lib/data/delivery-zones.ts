import { db, newId } from "@/lib/db";
import type { DeliveryZone } from "./types";

export function listDeliveryZones(tenantId: string): DeliveryZone[] {
  return db.prepare("SELECT * FROM delivery_zones WHERE tenant_id = ?").all(tenantId) as unknown as DeliveryZone[];
}

export function createDeliveryZone(tenantId: string, name: string, cost: number): DeliveryZone {
  const id = newId();
  db.prepare(`INSERT INTO delivery_zones (id, tenant_id, name, cost) VALUES (?, ?, ?, ?)`).run(
    id,
    tenantId,
    name,
    cost
  );
  return db.prepare("SELECT * FROM delivery_zones WHERE id = ?").get(id) as unknown as DeliveryZone;
}

export function deleteDeliveryZone(tenantId: string, id: string) {
  db.prepare("DELETE FROM delivery_zones WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

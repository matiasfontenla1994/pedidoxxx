import { db, newId } from "@/lib/db";
import type { DeliveryZone } from "./types";

export async function listDeliveryZones(tenantId: string): Promise<DeliveryZone[]> {
  return (await db.prepare("SELECT * FROM delivery_zones WHERE tenant_id = ?").all(tenantId)) as unknown as DeliveryZone[];
}

export async function createDeliveryZone(tenantId: string, name: string, cost: number): Promise<DeliveryZone> {
  const id = newId();
  await db.prepare(`INSERT INTO delivery_zones (id, tenant_id, name, cost) VALUES (?, ?, ?, ?)`).run(
    id,
    tenantId,
    name,
    cost
  );
  return (await db.prepare("SELECT * FROM delivery_zones WHERE id = ?").get(id)) as unknown as DeliveryZone;
}

export async function deleteDeliveryZone(tenantId: string, id: string) {
  await db.prepare("DELETE FROM delivery_zones WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

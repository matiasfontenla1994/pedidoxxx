import { db, newId, nowIso } from "@/lib/db";
import type { Tenant } from "./types";

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  return (await db.prepare("SELECT * FROM tenants WHERE slug = ?").get(slug)) as unknown as Tenant | undefined;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  return (await db.prepare("SELECT * FROM tenants WHERE id = ?").get(id)) as unknown as Tenant | undefined;
}

export async function listTenants(): Promise<Tenant[]> {
  return (await db.prepare("SELECT * FROM tenants ORDER BY created_at DESC").all()) as unknown as Tenant[];
}

export async function createTenant(input: {
  slug: string;
  name: string;
  whatsapp: string;
  plan?: string;
  currency?: string;
  storeType?: string;
}): Promise<Tenant> {
  const id = newId();
  const ts = nowIso();
  await db.prepare(
    `INSERT INTO tenants (id, slug, name, whatsapp, plan, currency, store_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.slug,
    input.name,
    input.whatsapp,
    input.plan ?? "PRINCIPIANTE",
    input.currency ?? "ARS",
    input.storeType ?? "PRODUCTS",
    ts,
    ts
  );
  return (await getTenantById(id))!;
}

export async function updateTenant(id: string, fields: Partial<Tenant>) {
  const allowed: (keyof Tenant)[] = [
    "name",
    "alias",
    "store_type",
    "description",
    "logo_url",
    "banner_url",
    "primary_color",
    "whatsapp",
    "plan",
    "currency",
    "delivery_fixed_cost",
    "pickup_enabled",
    "status",
    "plan_requested",
    "open_hours_json",
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  await db.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`).run(...(values as []));
}

export async function deleteTenant(id: string) {
  // Sin FKs declaradas en el esquema: hay que limpiar cada tabla a mano.
  await db.prepare("DELETE FROM blocked_slots WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM appointments WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM staff_schedules WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM staff WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM orders WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM delivery_zones WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM payment_methods WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM coupons WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM products WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM categories WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM users WHERE tenant_id = ?").run(id);
  await db.prepare("DELETE FROM tenants WHERE id = ?").run(id);
}

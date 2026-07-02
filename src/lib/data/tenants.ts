import { db, newId, nowIso } from "@/lib/db";
import type { Tenant } from "./types";

export function getTenantBySlug(slug: string): Tenant | undefined {
  return db.prepare("SELECT * FROM tenants WHERE slug = ?").get(slug) as unknown as Tenant | undefined;
}

export function getTenantById(id: string): Tenant | undefined {
  return db.prepare("SELECT * FROM tenants WHERE id = ?").get(id) as unknown as Tenant | undefined;
}

export function createTenant(input: {
  slug: string;
  name: string;
  whatsapp: string;
  plan?: string;
  currency?: string;
}): Tenant {
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO tenants (id, slug, name, whatsapp, plan, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.slug,
    input.name,
    input.whatsapp,
    input.plan ?? "PRINCIPIANTE",
    input.currency ?? "USD",
    ts,
    ts
  );
  return getTenantById(id)!;
}

export function updateTenant(id: string, fields: Partial<Tenant>) {
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
  db.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`).run(...(values as []));
}

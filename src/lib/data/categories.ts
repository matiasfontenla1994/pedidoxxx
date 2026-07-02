import { db, newId, nowIso } from "@/lib/db";
import type { Category } from "./types";

export function listCategories(tenantId: string): Category[] {
  return db
    .prepare("SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(tenantId) as unknown as Category[];
}

export function getCategory(id: string): Category | undefined {
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as unknown as Category | undefined;
}

export function createCategory(tenantId: string, name: string, sortOrder = 0): Category {
  const id = newId();
  db.prepare(
    `INSERT INTO categories (id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, tenantId, name, sortOrder, nowIso());
  return getCategory(id)!;
}

export function updateCategory(id: string, fields: { name?: string; sort_order?: number }) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) {
    sets.push("name = ?");
    values.push(fields.name);
  }
  if (fields.sort_order !== undefined) {
    sets.push("sort_order = ?");
    values.push(fields.sort_order);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`).run(...(values as []));
}

export function deleteCategory(tenantId: string, id: string) {
  db.prepare("DELETE FROM categories WHERE id = ? AND tenant_id = ?").run(id, tenantId);
  db.prepare("UPDATE products SET category_id = NULL WHERE category_id = ? AND tenant_id = ?").run(id, tenantId);
}

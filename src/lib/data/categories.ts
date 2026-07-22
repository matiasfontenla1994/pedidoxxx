import { db, newId, nowIso } from "@/lib/db";
import type { Category } from "./types";

export async function listCategories(tenantId: string): Promise<Category[]> {
  return (await db
    .prepare("SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(tenantId)) as unknown as Category[];
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return (await db.prepare("SELECT * FROM categories WHERE id = ?").get(id)) as unknown as Category | undefined;
}

export async function getCategoryByName(tenantId: string, name: string): Promise<Category | undefined> {
  return (await db
    .prepare("SELECT * FROM categories WHERE tenant_id = ? AND LOWER(name) = LOWER(?)")
    .get(tenantId, name)) as unknown as Category | undefined;
}

export async function createCategory(tenantId: string, name: string, sortOrder = 0, parentId: string | null = null): Promise<Category> {
  const id = newId();
  await db.prepare(
    `INSERT INTO categories (id, tenant_id, parent_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, parentId, name, sortOrder, nowIso());
  return (await getCategory(id))!;
}

export async function updateCategory(id: string, fields: { name?: string; sort_order?: number; parent_id?: string | null }) {
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
  if (fields.parent_id !== undefined) {
    sets.push("parent_id = ?");
    values.push(fields.parent_id);
  }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`).run(...(values as []));
}

export async function deleteCategory(tenantId: string, id: string) {
  await db.prepare("DELETE FROM categories WHERE id = ? AND tenant_id = ?").run(id, tenantId);
  await db.prepare("UPDATE categories SET parent_id = NULL WHERE parent_id = ? AND tenant_id = ?").run(id, tenantId);
  await db.prepare("UPDATE products SET category_id = NULL WHERE category_id = ? AND tenant_id = ?").run(id, tenantId);
}

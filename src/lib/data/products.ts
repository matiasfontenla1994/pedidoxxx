import { db, newId, nowIso } from "@/lib/db";
import type { Product } from "./types";

export async function listProducts(tenantId: string, opts: { onlyActive?: boolean } = {}): Promise<Product[]> {
  if (opts.onlyActive) {
    return (await db
      .prepare(
        "SELECT * FROM products WHERE tenant_id = ? AND active = 1 ORDER BY sort_order ASC, created_at ASC"
      )
      .all(tenantId)) as unknown as Product[];
  }
  return (await db
    .prepare("SELECT * FROM products WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(tenantId)) as unknown as Product[];
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return (await db.prepare("SELECT * FROM products WHERE id = ?").get(id)) as unknown as Product | undefined;
}

export interface ProductInput {
  categoryId?: string | null;
  name: string;
  description?: string;
  price: number;
  imagesJson?: string;
  sku?: string | null;
  stock?: number | null;
  active?: boolean;
  isService?: boolean;
  featured?: boolean;
  sortOrder?: number;
  optionsJson?: string;
}

export async function createProduct(tenantId: string, input: ProductInput): Promise<Product> {
  const id = newId();
  const ts = nowIso();
  await db.prepare(
    `INSERT INTO products
      (id, tenant_id, category_id, name, description, price, images_json, sku, stock, active, is_service, sort_order, options_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    input.categoryId ?? null,
    input.name,
    input.description ?? null,
    input.price,
    input.imagesJson ?? "[]",
    input.sku ?? null,
    input.stock ?? null,
    input.active === false ? 0 : 1,
    input.isService ? 1 : 0,
    input.sortOrder ?? 0,
    input.optionsJson ?? "[]",
    ts,
    ts
  );
  return (await getProduct(id))!;
}

export async function updateProduct(tenantId: string, id: string, input: Partial<ProductInput>) {
  const map: Record<string, unknown> = {};
  if (input.categoryId !== undefined) map.category_id = input.categoryId;
  if (input.name !== undefined) map.name = input.name;
  if (input.description !== undefined) map.description = input.description;
  if (input.price !== undefined) map.price = input.price;
  if (input.imagesJson !== undefined) map.images_json = input.imagesJson;
  if (input.sku !== undefined) map.sku = input.sku;
  if (input.stock !== undefined) map.stock = input.stock;
  if (input.active !== undefined) map.active = input.active ? 1 : 0;
  if (input.isService !== undefined) map.is_service = input.isService ? 1 : 0;
  if (input.featured !== undefined) map.featured = input.featured ? 1 : 0;
  if (input.sortOrder !== undefined) map.sort_order = input.sortOrder;
  if (input.optionsJson !== undefined) map.options_json = input.optionsJson;
  const keys = Object.keys(map);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`);
  sets.push("updated_at = ?");
  const values = keys.map((k) => map[k]);
  values.push(nowIso());
  values.push(id);
  values.push(tenantId);
  await db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`).run(...(values as []));
}

export async function deleteProduct(tenantId: string, id: string) {
  await db.prepare("DELETE FROM products WHERE id = ? AND tenant_id = ?").run(id, tenantId);
}

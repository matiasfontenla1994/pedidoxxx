import { db, newId, nowIso } from "@/lib/db";
import type { Order } from "./types";

export async function listOrders(tenantId: string, opts: { status?: string } = {}): Promise<Order[]> {
  if (opts.status) {
    return (await db
      .prepare("SELECT * FROM orders WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC")
      .all(tenantId, opts.status)) as unknown as Order[];
  }
  return (await db.prepare("SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId)) as unknown as Order[];
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return (await db.prepare("SELECT * FROM orders WHERE id = ?").get(id)) as unknown as Order | undefined;
}

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  itemsJson: string;
  subtotal: number;
  discount?: number;
  promoDiscount?: number;
  promoLabel?: string | null;
  paymentAdjustment?: number;
  deliveryCost?: number;
  total: number;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
  status?: Order["status"];
  source?: Order["source"];
}

export async function createOrder(tenantId: string, input: OrderInput): Promise<Order> {
  const id = newId();
  const ts = nowIso();
  await db.prepare(
    `INSERT INTO orders
      (id, tenant_id, customer_name, customer_phone, customer_email, customer_address, items_json, subtotal, discount, promo_discount, promo_label, payment_adjustment, delivery_cost, total, payment_method, coupon_code, notes, status, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tenantId,
    input.customerName,
    input.customerPhone,
    input.customerEmail ?? null,
    input.customerAddress ?? null,
    input.itemsJson,
    input.subtotal,
    input.discount ?? 0,
    input.promoDiscount ?? 0,
    input.promoLabel ?? null,
    input.paymentAdjustment ?? 0,
    input.deliveryCost ?? 0,
    input.total,
    input.paymentMethod ?? null,
    input.couponCode ?? null,
    input.notes ?? null,
    input.status ?? "NEW",
    input.source ?? "WHATSAPP",
    ts,
    ts
  );
  return (await getOrder(id))!;
}

export async function updateOrderStatus(tenantId: string, id: string, status: Order["status"]) {
  await db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?").run(status, nowIso(), id, tenantId);
}

export async function updateOrderItems(
  tenantId: string,
  id: string,
  fields: {
    itemsJson: string;
    subtotal: number;
    discount: number;
    promoDiscount: number;
    promoLabel: string | null;
    paymentAdjustment: number;
    total: number;
  }
): Promise<Order> {
  await db.prepare(
    `UPDATE orders SET items_json = ?, subtotal = ?, discount = ?, promo_discount = ?, promo_label = ?, payment_adjustment = ?, total = ?, updated_at = ?
     WHERE id = ? AND tenant_id = ?`
  ).run(
    fields.itemsJson,
    fields.subtotal,
    fields.discount,
    fields.promoDiscount,
    fields.promoLabel,
    fields.paymentAdjustment,
    fields.total,
    nowIso(),
    id,
    tenantId
  );
  return (await getOrder(id))!;
}

export async function getUnseenOrders(tenantId: string): Promise<Order[]> {
  return (await db
    .prepare("SELECT * FROM orders WHERE tenant_id = ? AND seen = 0 ORDER BY created_at DESC")
    .all(tenantId)) as unknown as Order[];
}

export async function getUnseenOrderCount(tenantId: string): Promise<number> {
  const row = (await db
    .prepare("SELECT COUNT(*)::int as count FROM orders WHERE tenant_id = ? AND seen = 0")
    .get(tenantId)) as { count: number };
  return row.count;
}

export async function markAllOrdersSeen(tenantId: string) {
  await db.prepare("UPDATE orders SET seen = 1 WHERE tenant_id = ? AND seen = 0").run(tenantId);
}

export async function orderStats(tenantId: string) {
  const orders = (await listOrders(tenantId)).filter((o) => o.status !== "CANCELLED");
  const totalOrders = orders.length;
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgTicket = totalOrders > 0 ? revenue / totalOrders : 0;
  const paymentCounts: Record<string, number> = {};
  for (const o of orders) {
    const key = o.payment_method ?? "Sin especificar";
    paymentCounts[key] = (paymentCounts[key] ?? 0) + 1;
  }
  return { totalOrders, revenue, avgTicket, paymentCounts };
}

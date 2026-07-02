import { db, newId, nowIso } from "@/lib/db";
import type { Order } from "./types";

export function listOrders(tenantId: string, opts: { status?: string } = {}): Order[] {
  if (opts.status) {
    return db
      .prepare("SELECT * FROM orders WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC")
      .all(tenantId, opts.status) as unknown as Order[];
  }
  return db.prepare("SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId) as unknown as Order[];
}

export function getOrder(id: string): Order | undefined {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as unknown as Order | undefined;
}

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  itemsJson: string;
  subtotal: number;
  discount?: number;
  deliveryCost?: number;
  total: number;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
}

export function createOrder(tenantId: string, input: OrderInput): Order {
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO orders
      (id, tenant_id, customer_name, customer_phone, customer_address, items_json, subtotal, discount, delivery_cost, total, payment_method, coupon_code, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)`
  ).run(
    id,
    tenantId,
    input.customerName,
    input.customerPhone,
    input.customerAddress ?? null,
    input.itemsJson,
    input.subtotal,
    input.discount ?? 0,
    input.deliveryCost ?? 0,
    input.total,
    input.paymentMethod ?? null,
    input.couponCode ?? null,
    input.notes ?? null,
    ts,
    ts
  );
  return getOrder(id)!;
}

export function updateOrderStatus(tenantId: string, id: string, status: Order["status"]) {
  db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?").run(status, nowIso(), id, tenantId);
}

export function getUnseenOrders(tenantId: string): Order[] {
  return db
    .prepare("SELECT * FROM orders WHERE tenant_id = ? AND seen = 0 ORDER BY created_at DESC")
    .all(tenantId) as unknown as Order[];
}

export function getUnseenOrderCount(tenantId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND seen = 0")
    .get(tenantId) as { count: number };
  return row.count;
}

export function markAllOrdersSeen(tenantId: string) {
  db.prepare("UPDATE orders SET seen = 1 WHERE tenant_id = ? AND seen = 0").run(tenantId);
}

export function orderStats(tenantId: string) {
  const orders = listOrders(tenantId).filter((o) => o.status !== "CANCELLED");
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

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { getTenantById } from "@/lib/data/tenants";
import { getProduct, updateProduct } from "@/lib/data/products";
import { getCouponByCode } from "@/lib/data/coupons";
import { createOrder, updateOrderStatus, getUnseenOrders, markAllOrdersSeen } from "@/lib/data/orders";
import { createAppointment } from "@/lib/data/appointments";
import { buildOrderMessage, buildWhatsappLink, type OrderItemForMessage } from "@/lib/whatsapp";
import type { Order } from "@/lib/data/types";

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  optionsLabel: z.string().optional(),
  optionsPriceDelta: z.number().default(0),
});

const appointmentSchema = z.object({
  staffId: z.string(),
  staffName: z.string(),
  serviceName: z.string(),
  date: z.string(),
  time: z.string(),
  durationMinutes: z.number().default(30),
});

const checkoutSchema = z.object({
  tenantId: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerAddress: z.string().optional(),
  paymentMethod: z.string().optional(),
  deliveryZoneCost: z.number().default(0),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
  appointment: appointmentSchema.optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function createOrderAction(input: CheckoutInput) {
  const parsed = checkoutSchema.parse(input);
  const tenant = getTenantById(parsed.tenantId);
  if (!tenant) throw new Error("Tienda no encontrada");

  let subtotal = 0;
  const messageItems: OrderItemForMessage[] = [];
  const snapshotItems: Array<Record<string, unknown>> = [];
  // Keep resolved products for stock decrement after order creation
  const resolvedProducts: Array<{ id: string; tenantId: string; stock: number | null; qty: number }> = [];

  for (const item of parsed.items) {
    const product = getProduct(item.productId);
    if (!product || product.tenant_id !== tenant.id) {
      throw new Error("Producto inválido en el carrito");
    }
    // Validate stock before accepting the order
    if (product.stock !== null && product.stock < item.quantity) {
      throw new Error(`Sin stock suficiente para "${product.name}" (disponible: ${product.stock})`);
    }
    resolvedProducts.push({ id: product.id, tenantId: product.tenant_id, stock: product.stock, qty: item.quantity });
    const unitPrice = product.price + (item.optionsPriceDelta ?? 0);
    subtotal += unitPrice * item.quantity;
    messageItems.push({
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      optionsLabel: item.optionsLabel,
    });
    snapshotItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      optionsLabel: item.optionsLabel ?? null,
    });
  }

  let discount = 0;
  let appliedCoupon: string | undefined;
  if (parsed.couponCode) {
    const coupon = getCouponByCode(tenant.id, parsed.couponCode.trim());
    if (coupon && coupon.active) {
      discount = coupon.type === "PERCENT" ? subtotal * (coupon.value / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
      appliedCoupon = coupon.code;
    }
  }

  const deliveryCost = parsed.deliveryZoneCost ?? 0;
  const total = Math.max(0, subtotal - discount) + deliveryCost;

  const order = createOrder(tenant.id, {
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    customerAddress: parsed.customerAddress,
    itemsJson: JSON.stringify(snapshotItems),
    subtotal,
    discount,
    deliveryCost,
    total,
    paymentMethod: parsed.paymentMethod,
    couponCode: appliedCoupon,
    notes: parsed.notes,
  });

  // Decrement stock for products that track it
  for (const { id, tenantId, stock, qty } of resolvedProducts) {
    if (stock !== null) {
      updateProduct(tenantId, id, { stock: Math.max(0, stock - qty) });
    }
  }

  const message = buildOrderMessage({
    storeName: tenant.name,
    storeAlias: tenant.alias,
    items: messageItems,
    subtotal,
    discount,
    deliveryCost,
    total,
    currency: tenant.currency,
    customerName: parsed.customerName,
    customerAddress: parsed.customerAddress,
    paymentMethod: parsed.paymentMethod,
    couponCode: appliedCoupon,
    notes: parsed.notes,
    appointment: parsed.appointment
      ? {
          serviceName: parsed.appointment.serviceName,
          staffName: parsed.appointment.staffName,
          date: parsed.appointment.date,
          time: parsed.appointment.time,
        }
      : undefined,
  });

  if (parsed.appointment) {
    const appt = parsed.appointment;
    createAppointment({
      tenantId: tenant.id,
      staffId: appt.staffId,
      orderId: order.id,
      serviceName: appt.serviceName,
      date: appt.date,
      time: appt.time,
      durationMinutes: appt.durationMinutes,
    });
  }

  const whatsappLink = buildWhatsappLink(tenant.whatsapp, message);

  return { orderId: order.id, whatsappLink, total };
}

export async function updateOrderStatusAction(orderId: string, status: "NEW" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED") {
  const { tenant } = await requireAdmin();
  updateOrderStatus(tenant.id, orderId, status);
}

export async function getUnseenOrdersAction(): Promise<Pick<Order, "id" | "customer_name" | "total" | "created_at">[]> {
  const { tenant } = await requireAdmin();
  const orders = getUnseenOrders(tenant.id);
  return orders.map((o) => ({
    id: o.id,
    customer_name: o.customer_name,
    total: o.total,
    created_at: o.created_at,
  }));
}

export async function markAllSeenAction() {
  const { tenant } = await requireAdmin();
  markAllOrdersSeen(tenant.id);
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/pedidos");
}

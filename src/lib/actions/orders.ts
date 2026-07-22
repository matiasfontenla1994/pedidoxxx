"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { getTenantById } from "@/lib/data/tenants";
import { getProduct, updateProduct } from "@/lib/data/products";
import { getCouponByCode } from "@/lib/data/coupons";
import { getPaymentMethodByName } from "@/lib/data/payment-methods";
import { createOrder, updateOrderStatus, updateOrderItems, getOrder, getUnseenOrders, markAllOrdersSeen } from "@/lib/data/orders";
import { listActivePromotions } from "@/lib/data/promotions";
import { getPlan } from "@/lib/plans";
import { calculatePromotionDiscount, type PromotionRule, type PromoLine } from "@/lib/promotions";
import { createAppointment } from "@/lib/data/appointments";
import { buildOrderMessage, buildWhatsappLink, type OrderItemForMessage } from "@/lib/whatsapp";
import type { Order } from "@/lib/data/types";

async function getPromotionRules(tenantId: string, enabled: boolean): Promise<PromotionRule[]> {
  if (!enabled) return [];
  const promos = await listActivePromotions(tenantId);
  return promos.map((p) => ({
    id: p.id,
    name: p.name,
    scope: p.scope,
    scopeId: p.scope_id,
    buyQty: p.buy_qty,
    payQty: p.pay_qty,
  }));
}

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
  customerEmail: z.string().optional(),
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
  const tenant = await getTenantById(parsed.tenantId);
  if (!tenant) throw new Error("Tienda no encontrada");
  const plan = getPlan(tenant.plan);

  let subtotal = 0;
  const messageItems: OrderItemForMessage[] = [];
  const snapshotItems: Array<Record<string, unknown>> = [];
  // Keep resolved products for stock decrement after order creation
  const resolvedProducts: Array<{ id: string; tenantId: string; stock: number | null; qty: number }> = [];
  const promoLines: PromoLine[] = [];

  for (const item of parsed.items) {
    const product = await getProduct(item.productId);
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
    promoLines.push({ productId: product.id, categoryId: product.category_id, unitPrice, quantity: item.quantity });
  }

  const promoRules = await getPromotionRules(tenant.id, plan.promotions);
  const { discount: promoDiscount, appliedNames } = calculatePromotionDiscount(promoLines, promoRules);
  const promoLabel = appliedNames.length > 0 ? appliedNames.join(", ") : null;

  let discount = 0;
  let appliedCoupon: string | undefined;
  if (parsed.couponCode) {
    const coupon = await getCouponByCode(tenant.id, parsed.couponCode.trim());
    if (coupon && coupon.active) {
      discount = coupon.type === "PERCENT" ? subtotal * (coupon.value / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
      appliedCoupon = coupon.code;
    }
  }

  let paymentAdjustment = 0;
  if (parsed.paymentMethod) {
    const method = await getPaymentMethodByName(tenant.id, parsed.paymentMethod);
    if (method) {
      paymentAdjustment = method.adjustment_type === "FIXED"
        ? method.adjustment_pct
        : Math.max(0, subtotal - promoDiscount - discount) * (method.adjustment_pct / 100);
    }
  }

  const deliveryCost = parsed.deliveryZoneCost ?? 0;
  const total = Math.max(0, subtotal - promoDiscount - discount) + paymentAdjustment + deliveryCost;

  const order = await createOrder(tenant.id, {
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    customerEmail: parsed.customerEmail,
    customerAddress: parsed.customerAddress,
    itemsJson: JSON.stringify(snapshotItems),
    subtotal,
    discount,
    promoDiscount,
    promoLabel,
    paymentAdjustment,
    deliveryCost,
    total,
    paymentMethod: parsed.paymentMethod,
    couponCode: appliedCoupon,
    notes: parsed.notes,
  });

  // Decrement stock for products that track it
  for (const { id, tenantId, stock, qty } of resolvedProducts) {
    if (stock !== null) {
      await updateProduct(tenantId, id, { stock: Math.max(0, stock - qty) });
    }
  }

  const message = buildOrderMessage({
    storeName: tenant.name,
    storeAlias: tenant.alias,
    items: messageItems,
    subtotal,
    discount,
    promoDiscount,
    promoLabel,
    paymentAdjustment,
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
    await createAppointment({
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

const posItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const posSaleSchema = z.object({
  customerName: z.string().optional(),
  paymentMethod: z.string().optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(posItemSchema).min(1),
});

export type PosSaleInput = z.infer<typeof posSaleSchema>;

export async function createPosSaleAction(input: PosSaleInput): Promise<{ orderId: string; total: number }> {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.pointOfSale) {
    throw new Error(`El punto de venta está disponible desde el plan Pro. Tu plan actual es ${plan.label}.`);
  }

  const parsed = posSaleSchema.parse(input);

  let subtotal = 0;
  const snapshotItems: Array<Record<string, unknown>> = [];
  const resolvedProducts: Array<{ id: string; stock: number | null; qty: number }> = [];
  const promoLines: PromoLine[] = [];

  for (const item of parsed.items) {
    const product = await getProduct(item.productId);
    if (!product || product.tenant_id !== tenant.id) {
      throw new Error("Producto inválido en la venta");
    }
    if (product.stock !== null && product.stock < item.quantity) {
      throw new Error(`Sin stock suficiente para "${product.name}" (disponible: ${product.stock})`);
    }
    resolvedProducts.push({ id: product.id, stock: product.stock, qty: item.quantity });
    subtotal += product.price * item.quantity;
    snapshotItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
    });
    promoLines.push({ productId: product.id, categoryId: product.category_id, unitPrice: product.price, quantity: item.quantity });
  }

  const promoRules = await getPromotionRules(tenant.id, plan.promotions);
  const { discount: promoDiscount, appliedNames } = calculatePromotionDiscount(promoLines, promoRules);
  const promoLabel = appliedNames.length > 0 ? appliedNames.join(", ") : null;

  let discount = 0;
  let appliedCoupon: string | undefined;
  if (plan.coupons && parsed.couponCode) {
    const coupon = await getCouponByCode(tenant.id, parsed.couponCode.trim());
    if (coupon && coupon.active) {
      discount = coupon.type === "PERCENT" ? subtotal * (coupon.value / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
      appliedCoupon = coupon.code;
    }
  }

  let paymentAdjustment = 0;
  if (parsed.paymentMethod) {
    const method = await getPaymentMethodByName(tenant.id, parsed.paymentMethod);
    if (method) {
      paymentAdjustment = method.adjustment_type === "FIXED"
        ? method.adjustment_pct
        : Math.max(0, subtotal - promoDiscount - discount) * (method.adjustment_pct / 100);
    }
  }

  const total = Math.max(0, subtotal - promoDiscount - discount) + paymentAdjustment;

  const order = await createOrder(tenant.id, {
    customerName: parsed.customerName?.trim() || "Venta mostrador",
    customerPhone: "-",
    itemsJson: JSON.stringify(snapshotItems),
    subtotal,
    discount,
    promoDiscount,
    promoLabel,
    paymentAdjustment,
    total,
    paymentMethod: parsed.paymentMethod,
    couponCode: appliedCoupon,
    notes: parsed.notes,
    status: "DELIVERED",
    source: "POS",
  });

  for (const { id, stock, qty } of resolvedProducts) {
    if (stock !== null) {
      await updateProduct(tenant.id, id, { stock: Math.max(0, stock - qty) });
    }
  }

  revalidatePath("/admin/pos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");

  return { orderId: order.id, total };
}

export async function updateOrderStatusAction(orderId: string, status: "NEW" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED") {
  const { tenant } = await requireAdmin();
  await updateOrderStatus(tenant.id, orderId, status);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}

const orderItemEditSchema = z.object({
  productId: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int().min(0),
  optionsLabel: z.string().nullable().optional(),
});

export async function updateOrderItemsAction(orderId: string, items: z.infer<typeof orderItemEditSchema>[]) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  const order = await getOrder(orderId);
  if (!order || order.tenant_id !== tenant.id) throw new Error("Pedido no encontrado");

  const parsedItems = z.array(orderItemEditSchema).parse(items).filter((i) => i.quantity > 0);

  // Reconcile stock: give back quantity removed/reduced, take quantity added/increased
  const oldItems = JSON.parse(order.items_json || "[]") as Array<{ productId: string; quantity: number }>;
  const oldQtyByProduct = new Map<string, number>();
  for (const it of oldItems) oldQtyByProduct.set(it.productId, (oldQtyByProduct.get(it.productId) ?? 0) + it.quantity);
  const newQtyByProduct = new Map<string, number>();
  for (const it of parsedItems) newQtyByProduct.set(it.productId, (newQtyByProduct.get(it.productId) ?? 0) + it.quantity);

  const productIds = new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()]);
  const categoryByProduct = new Map<string, string | null>();
  for (const productId of productIds) {
    const product = await getProduct(productId);
    if (!product) continue;
    categoryByProduct.set(productId, product.category_id);
    if (product.stock === null) continue;
    const delta = (oldQtyByProduct.get(productId) ?? 0) - (newQtyByProduct.get(productId) ?? 0);
    if (delta !== 0) {
      await updateProduct(tenant.id, productId, { stock: Math.max(0, product.stock + delta) });
    }
  }

  const subtotal = parsedItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

  const promoLines: PromoLine[] = parsedItems.map((it) => ({
    productId: it.productId,
    categoryId: categoryByProduct.get(it.productId) ?? null,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
  }));
  const promoRules = await getPromotionRules(tenant.id, plan.promotions);
  const { discount: promoDiscount, appliedNames } = calculatePromotionDiscount(promoLines, promoRules);
  const promoLabel = appliedNames.length > 0 ? appliedNames.join(", ") : null;

  let discount = 0;
  if (order.coupon_code) {
    const coupon = await getCouponByCode(tenant.id, order.coupon_code);
    if (coupon && coupon.active) {
      discount = coupon.type === "PERCENT" ? subtotal * (coupon.value / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
    }
  }

  let paymentAdjustment = 0;
  if (order.payment_method) {
    const method = await getPaymentMethodByName(tenant.id, order.payment_method);
    if (method) {
      paymentAdjustment = method.adjustment_type === "FIXED"
        ? method.adjustment_pct
        : Math.max(0, subtotal - promoDiscount - discount) * (method.adjustment_pct / 100);
    }
  }

  const total = Math.max(0, subtotal - promoDiscount - discount) + paymentAdjustment + order.delivery_cost;

  const updated = await updateOrderItems(tenant.id, orderId, {
    itemsJson: JSON.stringify(parsedItems.map((it) => ({
      productId: it.productId,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      optionsLabel: it.optionsLabel ?? null,
    }))),
    subtotal,
    discount,
    promoDiscount,
    promoLabel,
    paymentAdjustment,
    total,
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
  return { ...updated };
}

export async function getUnseenOrdersAction(): Promise<Pick<Order, "id" | "customer_name" | "total" | "created_at">[]> {
  const { tenant } = await requireAdmin();
  const orders = await getUnseenOrders(tenant.id);
  return orders.map((o) => ({
    id: o.id,
    customer_name: o.customer_name,
    total: o.total,
    created_at: o.created_at,
  }));
}

export async function markAllSeenAction() {
  const { tenant } = await requireAdmin();
  await markAllOrdersSeen(tenant.id);
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/pedidos");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { updateTenant } from "@/lib/data/tenants";
import { createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "@/lib/data/payment-methods";
import { createDeliveryZone, deleteDeliveryZone } from "@/lib/data/delivery-zones";
import { createCoupon, updateCoupon, deleteCoupon, toggleCoupon } from "@/lib/data/coupons";
import { createPromotion, updatePromotion, deletePromotion, togglePromotion } from "@/lib/data/promotions";
import { getPlan, PLANS, type PlanId } from "@/lib/plans";

export async function requestPlanChangeAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const requested = String(formData.get("plan") ?? "") as PlanId;
  if (!PLANS[requested] || requested === tenant.plan) return;
  await updateTenant(tenant.id, { plan_requested: requested });
  revalidatePath("/admin/plan");
}

export async function cancelPlanChangeRequestAction() {
  const { tenant } = await requireAdmin();
  await updateTenant(tenant.id, { plan_requested: null });
  revalidatePath("/admin/plan");
}

export async function updateTenantSettingsAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const alias = String(formData.get("alias") ?? "").trim() || null;
  const store_type = String(formData.get("store_type") ?? "PRODUCTS") as "PRODUCTS" | "SERVICES" | "BOTH";
  const currency = String(formData.get("currency") ?? tenant.currency).trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const primaryColor = String(formData.get("primaryColor") ?? tenant.primary_color);
  const banner_url = String(formData.get("banner_url") ?? "").trim() || null;
  const deliveryFixedCost = Number(formData.get("deliveryFixedCost") ?? 0);
  const pickupEnabled = formData.get("pickupEnabled") === "on";

  const openHours: Record<string, string> = {};
  for (const day of ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]) {
    const value = String(formData.get(`hours_${day}`) ?? "").trim();
    if (value) openHours[day] = value;
  }

  if (!name || !whatsapp) return;

  await updateTenant(tenant.id, {
    name,
    alias,
    store_type,
    currency,
    whatsapp,
    description,
    primary_color: primaryColor,
    banner_url,
    delivery_fixed_cost: Number.isNaN(deliveryFixedCost) ? 0 : deliveryFixedCost,
    pickup_enabled: pickupEnabled ? 1 : 0,
    open_hours_json: JSON.stringify(openHours),
  });
  revalidatePath("/admin/configuracion");
  revalidatePath(`/${tenant.slug}`);
}

export async function createPaymentMethodAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const adj = Number(formData.get("adjustmentPct") ?? 0);
  const adjustmentType = String(formData.get("adjustmentType") ?? "PERCENT") as "PERCENT" | "FIXED";
  if (!name) return;
  await createPaymentMethod(tenant.id, name, Number.isNaN(adj) ? 0 : adj, adjustmentType);
  revalidatePath("/admin/configuracion");
}

export async function updatePaymentMethodAction(id: string, formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const adj = Number(formData.get("adjustmentPct") ?? 0);
  const adjustmentType = String(formData.get("adjustmentType") ?? "PERCENT") as "PERCENT" | "FIXED";
  if (!name) return;
  await updatePaymentMethod(tenant.id, id, name, Number.isNaN(adj) ? 0 : adj, adjustmentType);
  revalidatePath("/admin/configuracion");
}

export async function deletePaymentMethodAction(id: string) {
  const { tenant } = await requireAdmin();
  await deletePaymentMethod(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function createDeliveryZoneAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.deliveryZonesByDistance) return;
  const name = String(formData.get("name") ?? "").trim();
  const cost = Number(formData.get("cost") ?? 0);
  if (!name || Number.isNaN(cost)) return;
  await createDeliveryZone(tenant.id, name, cost);
  revalidatePath("/admin/configuracion");
}

export async function deleteDeliveryZoneAction(id: string) {
  const { tenant } = await requireAdmin();
  await deleteDeliveryZone(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function createCouponAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.coupons) return;
  const code = String(formData.get("code") ?? "").trim();
  const type = String(formData.get("type") ?? "PERCENT") as "PERCENT" | "FIXED";
  const value = Number(formData.get("value") ?? 0);
  if (!code || Number.isNaN(value)) return;
  await createCoupon(tenant.id, { code, type, value });
  revalidatePath("/admin/configuracion");
}

export async function updateCouponAction(id: string, formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.coupons) return;
  const code = String(formData.get("code") ?? "").trim();
  const type = String(formData.get("type") ?? "PERCENT") as "PERCENT" | "FIXED";
  const value = Number(formData.get("value") ?? 0);
  if (!code || Number.isNaN(value)) return;
  await updateCoupon(tenant.id, id, { code, type, value });
  revalidatePath("/admin/configuracion");
}

export async function deleteCouponAction(id: string) {
  const { tenant } = await requireAdmin();
  await deleteCoupon(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function toggleCouponAction(id: string, active: boolean) {
  const { tenant } = await requireAdmin();
  await toggleCoupon(tenant.id, id, active);
  revalidatePath("/admin/configuracion");
}

function parsePromotionForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "ALL") as "ALL" | "CATEGORY" | "PRODUCT";
  const scopeId = String(formData.get("scopeId") ?? "") || null;
  const buyQty = Number(formData.get("buyQty") ?? 0);
  const payQty = Number(formData.get("payQty") ?? 0);
  if (!name || !Number.isInteger(buyQty) || !Number.isInteger(payQty) || buyQty < 2 || payQty < 1 || payQty >= buyQty) {
    return null;
  }
  if (scope !== "ALL" && !scopeId) return null;
  return { name, scope, scopeId: scope === "ALL" ? null : scopeId, buyQty, payQty };
}

export async function createPromotionAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.promotions) return;
  const input = parsePromotionForm(formData);
  if (!input) return;
  await createPromotion(tenant.id, input);
  revalidatePath("/admin/configuracion");
}

export async function updatePromotionAction(id: string, formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.promotions) return;
  const input = parsePromotionForm(formData);
  if (!input) return;
  await updatePromotion(tenant.id, id, input);
  revalidatePath("/admin/configuracion");
}

export async function deletePromotionAction(id: string) {
  const { tenant } = await requireAdmin();
  await deletePromotion(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function togglePromotionAction(id: string, active: boolean) {
  const { tenant } = await requireAdmin();
  await togglePromotion(tenant.id, id, active);
  revalidatePath("/admin/configuracion");
}

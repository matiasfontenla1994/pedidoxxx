"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { updateTenant } from "@/lib/data/tenants";
import { createPaymentMethod, deletePaymentMethod } from "@/lib/data/payment-methods";
import { createDeliveryZone, deleteDeliveryZone } from "@/lib/data/delivery-zones";
import { createCoupon, deleteCoupon, toggleCoupon } from "@/lib/data/coupons";
import { getPlan } from "@/lib/plans";

export async function updateTenantSettingsAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const alias = String(formData.get("alias") ?? "").trim() || null;
  const store_type = String(formData.get("store_type") ?? "PRODUCTS") as "PRODUCTS" | "SERVICES" | "BOTH";
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const primaryColor = String(formData.get("primaryColor") ?? tenant.primary_color);
  const banner_url = String(formData.get("banner_url") ?? "").trim() || null;
  const deliveryFixedCost = Number(formData.get("deliveryFixedCost") ?? 0);

  const openHours: Record<string, string> = {};
  for (const day of ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]) {
    const value = String(formData.get(`hours_${day}`) ?? "").trim();
    if (value) openHours[day] = value;
  }

  if (!name || !whatsapp) return;

  updateTenant(tenant.id, {
    name,
    alias,
    store_type,
    whatsapp,
    description,
    primary_color: primaryColor,
    banner_url,
    delivery_fixed_cost: Number.isNaN(deliveryFixedCost) ? 0 : deliveryFixedCost,
    open_hours_json: JSON.stringify(openHours),
  });
  revalidatePath("/admin/configuracion");
  revalidatePath(`/${tenant.slug}`);
}

export async function createPaymentMethodAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const adj = Number(formData.get("adjustmentPct") ?? 0);
  if (!name) return;
  createPaymentMethod(tenant.id, name, Number.isNaN(adj) ? 0 : adj);
  revalidatePath("/admin/configuracion");
}

export async function deletePaymentMethodAction(id: string) {
  const { tenant } = await requireAdmin();
  deletePaymentMethod(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function createDeliveryZoneAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  if (!plan.deliveryZonesByDistance) return;
  const name = String(formData.get("name") ?? "").trim();
  const cost = Number(formData.get("cost") ?? 0);
  if (!name || Number.isNaN(cost)) return;
  createDeliveryZone(tenant.id, name, cost);
  revalidatePath("/admin/configuracion");
}

export async function deleteDeliveryZoneAction(id: string) {
  const { tenant } = await requireAdmin();
  deleteDeliveryZone(tenant.id, id);
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
  createCoupon(tenant.id, { code, type, value });
  revalidatePath("/admin/configuracion");
}

export async function deleteCouponAction(id: string) {
  const { tenant } = await requireAdmin();
  deleteCoupon(tenant.id, id);
  revalidatePath("/admin/configuracion");
}

export async function toggleCouponAction(id: string, active: boolean) {
  const { tenant } = await requireAdmin();
  toggleCoupon(tenant.id, id, active);
  revalidatePath("/admin/configuracion");
}

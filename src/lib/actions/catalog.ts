"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createCategory, deleteCategory } from "@/lib/data/categories";
import { createProduct, updateProduct, deleteProduct } from "@/lib/data/products";
import { getPlan } from "@/lib/plans";

export async function createCategoryAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  createCategory(tenant.id, name);
  revalidatePath("/admin/categorias");
}

export async function deleteCategoryAction(id: string) {
  const { tenant } = await requireAdmin();
  deleteCategory(tenant.id, id);
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
}

export async function createProductAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (!name || Number.isNaN(price)) return;

  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const description = String(formData.get("description") ?? "") || undefined;
  const stockRaw = formData.get("stock");
  const stock = stockRaw ? Number(stockRaw) : null;
  const sku = plan.sku ? (String(formData.get("sku") ?? "") || null) : null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const images = imageUrl ? [imageUrl] : [];
  const isService = formData.get("isService") === "on";

  createProduct(tenant.id, {
    categoryId,
    name,
    description,
    price,
    stock,
    sku,
    isService,
    imagesJson: JSON.stringify(images.slice(0, plan.maxImagesPerProduct)),
  });
  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function updateProductAction(id: string, formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stockRaw = formData.get("stock");
  const stock = stockRaw !== null && String(stockRaw).trim() !== "" ? Number(stockRaw) : null;
  if (!name || Number.isNaN(price)) return;
  updateProduct(tenant.id, id, { name, price, stock });
  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  const { tenant } = await requireAdmin();
  updateProduct(tenant.id, id, { active });
  revalidatePath("/admin/productos");
}

export async function deleteProductAction(id: string) {
  const { tenant } = await requireAdmin();
  deleteProduct(tenant.id, id);
  revalidatePath("/admin/productos");
}

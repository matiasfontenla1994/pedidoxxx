"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createCategory, updateCategory, deleteCategory, getCategoryByName } from "@/lib/data/categories";
import { createProduct, updateProduct, deleteProduct, listProducts, getProduct } from "@/lib/data/products";
import { getPlan } from "@/lib/plans";
import { parseCsv } from "@/lib/csv";

const optionsSchema = z.array(
  z.object({
    name: z.string().min(1),
    choices: z.array(z.object({ label: z.string().min(1), priceDelta: z.number() })).min(1),
  })
);

function parseOptionsJson(formData: FormData): string {
  const raw = String(formData.get("optionsJson") ?? "[]");
  try {
    return JSON.stringify(optionsSchema.parse(JSON.parse(raw)));
  } catch {
    return "[]";
  }
}

export async function createCategoryAction(formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const parentId = String(formData.get("parentId") ?? "") || null;
  await createCategory(tenant.id, name, 0, parentId);
  revalidatePath("/admin/categorias");
  revalidatePath(`/${tenant.slug}`);
}

export async function updateCategoryParentAction(id: string, parentId: string | null) {
  const { tenant } = await requireAdmin();
  await updateCategory(id, { parent_id: parentId });
  revalidatePath("/admin/categorias");
  revalidatePath(`/${tenant.slug}`);
}

export async function deleteCategoryAction(id: string) {
  const { tenant } = await requireAdmin();
  await deleteCategory(tenant.id, id);
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
}

export async function createProductAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (!name || Number.isNaN(price)) return { error: "Faltan datos obligatorios." };

  const currentCount = (await listProducts(tenant.id)).length;
  if (currentCount >= plan.maxProducts) {
    return {
      error: `Llegaste al límite de ${plan.maxProducts} productos del plan ${plan.label}. Solicitá un cambio de plan desde "Plan" para subir el límite.`,
    };
  }

  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const description = String(formData.get("description") ?? "") || undefined;
  const stockRaw = formData.get("stock");
  const stock = stockRaw ? Number(stockRaw) : null;
  const sku = plan.sku ? (String(formData.get("sku") ?? "") || null) : null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const images = imageUrl ? [imageUrl] : [];
  const isService = formData.get("isService") === "on";

  await createProduct(tenant.id, {
    categoryId,
    name,
    description,
    price,
    stock,
    sku,
    isService,
    imagesJson: JSON.stringify(images.slice(0, plan.maxImagesPerProduct)),
    optionsJson: parseOptionsJson(formData),
  });
  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
  return undefined;
}

export async function updateProductAction(id: string, formData: FormData) {
  const { tenant } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stockRaw = formData.get("stock");
  const stock = stockRaw !== null && String(stockRaw).trim() !== "" ? Number(stockRaw) : null;
  if (!name || Number.isNaN(price)) return;
  await updateProduct(tenant.id, id, { name, price, stock, optionsJson: parseOptionsJson(formData) });
  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  const { tenant } = await requireAdmin();
  await updateProduct(tenant.id, id, { active });
  revalidatePath("/admin/productos");
}

export async function toggleProductFeaturedAction(id: string, featured: boolean) {
  const { tenant } = await requireAdmin();
  await updateProduct(tenant.id, id, { featured });
  revalidatePath("/admin/productos");
  revalidatePath(`/${tenant.slug}`);
}

export async function deleteProductAction(id: string) {
  const { tenant } = await requireAdmin();
  await deleteProduct(tenant.id, id);
  revalidatePath("/admin/productos");
}

function truthy(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return v === "si" || v === "sí" || v === "true" || v === "1" || v === "yes";
}

export async function importProductsCsvAction(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí un archivo CSV para importar." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "El archivo está vacío o no tiene filas de datos." };

  const [header, ...dataRows] = rows;
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const idIdx = col("id");
  const nameIdx = col("nombre");
  const priceIdx = col("precio");
  const stockIdx = col("stock");
  const skuIdx = col("sku");
  const categoryIdx = col("categoria");
  const descIdx = col("descripcion");
  const activeIdx = col("activo");
  const featuredIdx = col("destacado");
  const serviceIdx = col("servicio");

  if (nameIdx === -1 || priceIdx === -1) {
    return {
      error: "Encabezado inválido. Usá las columnas: nombre, precio (y opcionalmente id, stock, sku, categoria, descripcion, activo, destacado, servicio).",
    };
  }

  const categoryCache = new Map<string, string>(); // nombre en minúsculas -> id
  let currentCount = (await listProducts(tenant.id)).length;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const name = row[nameIdx]?.trim();
    const price = Number(row[priceIdx]);
    if (!name || Number.isNaN(price)) {
      skipped++;
      continue;
    }

    const id = idIdx !== -1 ? row[idIdx]?.trim() : "";
    const stockRaw = stockIdx !== -1 ? row[stockIdx]?.trim() : "";
    const stock = stockRaw ? Number(stockRaw) : null;
    const sku = skuIdx !== -1 ? (row[skuIdx]?.trim() || null) : null;
    const description = descIdx !== -1 ? (row[descIdx]?.trim() || undefined) : undefined;
    const active = activeIdx !== -1 ? truthy(row[activeIdx]) : true;
    const featured = featuredIdx !== -1 ? truthy(row[featuredIdx]) : false;
    const isService = serviceIdx !== -1 ? truthy(row[serviceIdx]) : false;

    let categoryId: string | null = null;
    const categoryName = categoryIdx !== -1 ? row[categoryIdx]?.trim() : "";
    if (categoryName) {
      const key = categoryName.toLowerCase();
      if (categoryCache.has(key)) {
        categoryId = categoryCache.get(key)!;
      } else {
        const existing = await getCategoryByName(tenant.id, categoryName);
        const category = existing ?? (await createCategory(tenant.id, categoryName));
        categoryId = category.id;
        categoryCache.set(key, category.id);
      }
    }

    if (id) {
      const existingProduct = await getProduct(id);
      if (existingProduct && existingProduct.tenant_id === tenant.id) {
        await updateProduct(tenant.id, id, {
          name, price, stock, sku, description, active, featured, isService, categoryId,
        });
        updated++;
        continue;
      }
    }

    if (currentCount >= plan.maxProducts) {
      skipped++;
      continue;
    }

    await createProduct(tenant.id, {
      categoryId,
      name,
      description,
      price,
      stock,
      sku,
      active,
      featured,
      isService,
    });
    currentCount++;
    created++;
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/categorias");
  revalidatePath(`/${tenant.slug}`);

  const parts = [`${created} creado(s)`, `${updated} actualizado(s)`];
  if (skipped > 0) parts.push(`${skipped} omitido(s)`);
  return { success: parts.join(", ") + "." };
}

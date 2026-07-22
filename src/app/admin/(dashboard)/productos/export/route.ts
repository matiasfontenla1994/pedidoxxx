import { requireAdmin } from "@/lib/require-admin";
import { listProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export async function GET() {
  const { tenant } = await requireAdmin();
  const products = await listProducts(tenant.id);
  const categories = await listCategories(tenant.id);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const rows = [
    PRODUCT_CSV_HEADERS,
    ...products.map((p) => [
      p.id,
      p.name,
      p.price,
      p.stock ?? "",
      p.sku ?? "",
      p.category_id ? (categoryNameById.get(p.category_id) ?? "") : "",
      p.description ?? "",
      p.active === 1 ? "si" : "no",
      p.featured === 1 ? "si" : "no",
      p.is_service === 1 ? "si" : "no",
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-${tenant.slug}.csv"`,
    },
  });
}

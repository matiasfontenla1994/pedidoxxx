import { requireAdmin } from "@/lib/require-admin";
import { listProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { getPlan } from "@/lib/plans";
import CreateProductForm from "./create-product-form";
import ProductListItem from "./product-list-item";
import ImportProductsForm from "./import-products-form";

export default async function ProductosPage() {
  const { tenant } = await requireAdmin();
  const allProducts = await listProducts(tenant.id);
  const categories = await listCategories(tenant.id);
  const plan = getPlan(tenant.plan);

  const products = allProducts.filter((p) => p.is_service === 0);
  const services = allProducts.filter((p) => p.is_service === 1);
  const showServices = tenant.store_type === "SERVICES" || tenant.store_type === "BOTH";

  const topLevelCategories = categories.filter((c) => !c.parent_id);
  const orderedCategoryOptions = topLevelCategories.flatMap((c) => [
    c,
    ...categories.filter((child) => child.parent_id === c.id),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Productos</h1>
        <p className="text-sm mt-0.5" style={{ color: "#9C8E87" }}>
          Plan {plan.label}: hasta {plan.maxProducts} productos, {plan.maxImagesPerProduct} imagen(es) c/u
          {plan.sku ? ", con SKU" : ""}. Llevás {allProducts.length}/{plan.maxProducts}.
        </p>
      </div>

      <CreateProductForm categories={orderedCategoryOptions} showSku={plan.sku} showServiceCheckbox={showServices} />

      <ImportProductsForm />

      {/* Products */}
      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: "#211B18" }}>Productos ({products.length})</h2>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECE6E2" }}>
          {products.length === 0 && (
            <p className="p-4 text-sm" style={{ color: "#9C8E87" }}>Todavía no creaste productos.</p>
          )}
          {products.map((p, i) => (
            <ProductListItem key={p.id} product={p} currency={tenant.currency} isFirst={i === 0} />
          ))}
        </div>
      </div>

      {/* Services */}
      {showServices && (
        <div>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "#211B18" }}>Servicios ({services.length})</h2>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECE6E2" }}>
            {services.length === 0 && (
              <p className="p-4 text-sm" style={{ color: "#9C8E87" }}>Todavía no creaste servicios.</p>
            )}
            {services.map((p, i) => (
              <ProductListItem key={p.id} product={p} currency={tenant.currency} isFirst={i === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

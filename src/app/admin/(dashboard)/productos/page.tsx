import { requireAdmin } from "@/lib/require-admin";
import { listProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { getPlan } from "@/lib/plans";
import { createProductAction, updateProductAction, deleteProductAction } from "@/lib/actions/catalog";
import DeleteButton from "../delete-button";

export default async function ProductosPage() {
  const { tenant } = await requireAdmin();
  const products = listProducts(tenant.id);
  const categories = listCategories(tenant.id);
  const plan = getPlan(tenant.plan);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Productos</h1>
        <p className="text-sm mt-0.5" style={{ color: "#9C8E87" }}>
          Plan {plan.label}: hasta {plan.maxImagesPerProduct} imagen(es) por producto
          {plan.sku ? ", con SKU" : ""}.
        </p>
      </div>

      {/* Create form */}
      <form action={createProductAction} className="bg-white border rounded-2xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>Nuevo producto</h2>
        <div className="grid grid-cols-2 gap-3">
          <input name="name" required placeholder="Nombre" className="input col-span-2" />
          <input name="price" type="number" step="0.01" required placeholder="Precio" className="input" />
          <input name="stock" type="number" placeholder="Stock (opcional)" className="input" />
          <select name="categoryId" className="input col-span-2">
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea name="description" placeholder="Descripción (opcional)" className="input col-span-2" rows={2} />
          <input name="imageUrl" placeholder="URL de imagen (opcional)" className="input col-span-2" />
          {plan.sku && <input name="sku" placeholder="SKU (opcional)" className="input col-span-2" />}
          <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#6E635E" }}>
            <input name="isService" type="checkbox" className="w-4 h-4" />
            Es un servicio que requiere turno
          </label>
        </div>
        <button
          className="text-white px-4 py-2 rounded-xl font-medium text-sm"
          style={{ background: "#E85A47" }}
        >
          Crear producto
        </button>
      </form>

      {/* Product list */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECE6E2" }}>
        {products.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "#9C8E87" }}>Todavía no creaste productos.</p>
        )}
        {products.map((p, i) => (
          <details key={p.id} className="group" style={{ borderTop: i > 0 ? "1px solid #F5F0ED" : "none" }}>
            <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-[#FAF8F6] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: "#211B18" }}>
                  {p.name}
                  {p.active === 0 && <span className="ml-2 text-xs" style={{ color: "#9C8E87" }}>(oculto)</span>}
                  {p.is_service === 1 && (
                    <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">servicio</span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>
                  {tenant.currency} {p.price.toFixed(2)}
                  {p.stock !== null && ` · stock: ${p.stock}`}
                  {p.sku && ` · SKU ${p.sku}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium transition-colors" style={{ color: "#E85A47" }}>
                  Editar
                </span>
                <DeleteButton action={deleteProductAction} id={p.id} />
              </div>
            </summary>

            {/* Inline edit form */}
            <form
              action={updateProductAction.bind(null, p.id)}
              className="px-4 pb-4 pt-1 space-y-3 border-t"
              style={{ borderColor: "#F5F0ED", background: "#FEFCFB" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9C8E87" }}>Editar producto</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="name"
                  required
                  defaultValue={p.name}
                  placeholder="Nombre"
                  className="input col-span-2 text-sm"
                />
                <label className="text-xs" style={{ color: "#6E635E" }}>
                  Precio
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={p.price}
                    className="input mt-0.5 text-sm"
                  />
                </label>
                <label className="text-xs" style={{ color: "#6E635E" }}>
                  Stock (vacío = sin límite)
                  <input
                    name="stock"
                    type="number"
                    defaultValue={p.stock ?? ""}
                    placeholder="—"
                    className="input mt-0.5 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="text-white px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "#211B18" }}
              >
                Guardar cambios
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}

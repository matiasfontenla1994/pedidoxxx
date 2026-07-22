import { updateProductAction, deleteProductAction } from "@/lib/actions/catalog";
import type { Product } from "@/lib/data/types";
import DeleteButton from "../delete-button";
import SaveButton from "../save-button";
import FeaturedToggle from "../featured-toggle";
import ActiveToggle from "../active-toggle";
import ProductOptionsEditor from "../product-options-editor";

export default function ProductListItem({ product: p, currency, isFirst }: { product: Product; currency: string; isFirst: boolean }) {
  return (
    <details className="group" style={{ borderTop: isFirst ? "none" : "1px solid #F5F0ED" }}>
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-[#FAF8F6] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm" style={{ color: "#211B18" }}>
            {p.name}
            {p.active === 0 && <span className="ml-2 text-xs" style={{ color: "#9C8E87" }}>(oculto)</span>}
            {p.featured === 1 && (
              <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#FEECE9", color: "#E85A47" }}>★ destacado</span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>
            {currency} {p.price.toFixed(2)}
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
        key={p.updated_at}
        action={updateProductAction.bind(null, p.id)}
        className="px-4 pb-4 pt-1 space-y-3 border-t"
        style={{ borderColor: "#F5F0ED", background: "#FEFCFB" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9C8E87" }}>Editar</p>
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
          <ProductOptionsEditor initialOptions={JSON.parse(p.options_json || "[]")} />
        </div>
        <div className="flex items-center gap-3">
          <SaveButton
            className="text-white px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "#211B18" }}
          >
            Guardar cambios
          </SaveButton>
          <FeaturedToggle id={p.id} initialFeatured={p.featured === 1} />
          <ActiveToggle id={p.id} initialActive={p.active === 1} />
        </div>
      </form>
    </details>
  );
}

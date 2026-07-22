"use client";

import { useActionState } from "react";
import { createProductAction } from "@/lib/actions/catalog";
import ProductOptionsEditor from "../product-options-editor";
import SaveButton from "../save-button";

interface CategoryOption { id: string; name: string; parent_id: string | null }

export default function CreateProductForm({
  categories, showSku, showServiceCheckbox,
}: {
  categories: CategoryOption[];
  showSku: boolean;
  showServiceCheckbox: boolean;
}) {
  const [state, formAction] = useActionState(createProductAction, undefined);

  return (
    <form action={formAction} className="bg-white border rounded-2xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
      <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>Nuevo producto</h2>
      <div className="grid grid-cols-2 gap-3">
        <input name="name" required placeholder="Nombre" className="input col-span-2" />
        <input name="price" type="number" step="0.01" required placeholder="Precio" className="input" />
        <input name="stock" type="number" placeholder="Stock (opcional)" className="input" />
        <select name="categoryId" className="input col-span-2">
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.parent_id ? `— ${c.name}` : c.name}</option>
          ))}
        </select>
        <textarea name="description" placeholder="Descripción (opcional)" className="input col-span-2" rows={2} />
        <input name="imageUrl" placeholder="URL de imagen (opcional)" className="input col-span-2" />
        {showSku && <input name="sku" placeholder="SKU (opcional)" className="input col-span-2" />}
        {showServiceCheckbox && (
          <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#6E635E" }}>
            <input name="isService" type="checkbox" className="w-4 h-4" />
            Es un servicio que requiere turno
          </label>
        )}
        <ProductOptionsEditor />
      </div>
      {state?.error && <p className="text-sm" style={{ color: "#DC2626" }}>{state.error}</p>}
      <SaveButton
        className="text-white px-4 py-2 rounded-xl font-medium text-sm"
        style={{ background: "#E85A47" }}
      >
        Crear producto
      </SaveButton>
    </form>
  );
}

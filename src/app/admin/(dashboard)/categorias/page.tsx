import { requireAdmin } from "@/lib/require-admin";
import { listCategories } from "@/lib/data/categories";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/catalog";
import DeleteButton from "../delete-button";
import SaveButton from "../save-button";
import CategoryParentSelect from "./category-parent-select";
import type { Category } from "@/lib/data/types";

export default async function CategoriasPage() {
  const { tenant } = await requireAdmin();
  const categories = await listCategories(tenant.id);
  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  function CategoryRow({ c, isChild }: { c: Category; isChild?: boolean }) {
    return (
      <div className={`p-3 flex items-center justify-between gap-2 flex-wrap ${isChild ? "pl-8" : ""}`}>
        <span className={isChild ? "text-sm" : "font-medium"}>
          {isChild && "↳ "}
          {c.name}
        </span>
        <div className="flex items-center gap-2">
          <CategoryParentSelect
            categoryId={c.id}
            currentParentId={c.parent_id}
            options={topLevel.filter((t) => t.id !== c.id).map((t) => ({ id: t.id, name: t.name }))}
          />
          <DeleteButton action={deleteCategoryAction} id={c.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-semibold">Categorías</h1>

      <form action={createCategoryAction} className="bg-white border rounded-xl p-4 space-y-2">
        <div className="flex gap-2">
          <input name="name" required placeholder="Nombre de la categoría" className="input" />
          <SaveButton className="bg-[#ff7e7e] text-white px-4 rounded-lg font-medium whitespace-nowrap">
            Agregar
          </SaveButton>
        </div>
        <select name="parentId" defaultValue="" className="input text-sm">
          <option value="">Categoría principal (sin padre)</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>Como subcategoría de: {c.name}</option>
          ))}
        </select>
      </form>

      <div className="bg-white border rounded-xl divide-y">
        {categories.length === 0 && <p className="p-4 text-sm text-zinc-500">Todavía no creaste categorías.</p>}
        {topLevel.map((c) => (
          <div key={c.id} className="divide-y">
            <CategoryRow c={c} />
            {childrenOf(c.id).map((child) => (
              <CategoryRow key={child.id} c={child} isChild />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

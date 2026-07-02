import { requireAdmin } from "@/lib/require-admin";
import { listCategories } from "@/lib/data/categories";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/catalog";
import DeleteButton from "../delete-button";

export default async function CategoriasPage() {
  const { tenant } = await requireAdmin();
  const categories = listCategories(tenant.id);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-semibold">Categorías</h1>

      <form action={createCategoryAction} className="bg-white border rounded-xl p-4 flex gap-2">
        <input name="name" required placeholder="Nombre de la categoría" className="input" />
        <button className="bg-[#ff7e7e] text-white px-4 rounded-lg font-medium whitespace-nowrap">
          Agregar
        </button>
      </form>

      <div className="bg-white border rounded-xl divide-y">
        {categories.length === 0 && <p className="p-4 text-sm text-zinc-500">Todavía no creaste categorías.</p>}
        {categories.map((c) => (
          <div key={c.id} className="p-3 flex items-center justify-between">
            <span>{c.name}</span>
            <DeleteButton action={deleteCategoryAction} id={c.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

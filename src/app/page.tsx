import Link from "next/link";
import { db } from "@/lib/db";

export default async function Home() {
  const tenants = (await db
    .prepare("SELECT slug, name, plan FROM tenants ORDER BY created_at ASC")
    .all()) as { slug: string; name: string; plan: string }[];

  return (
    <main className="flex-1 flex flex-col">
      <section className="bg-[#ff7e7e] text-white px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Vende mejor por WhatsApp, sin comisión
          </h1>
          <p className="text-white/90 text-lg mb-8">
            Catálogo digital multi-tienda: pedidos organizados por WhatsApp, turnos
            y panel de administración.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/login"
              className="bg-white text-[#ff7e7e] font-semibold px-5 py-3 rounded-lg hover:bg-zinc-100"
            >
              Entrar al panel admin
            </Link>
            {tenants[0] && (
              <Link
                href={`/${tenants[0].slug}`}
                className="border border-white px-5 py-3 rounded-lg font-semibold hover:bg-white/10"
              >
                Ver tienda demo
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12 w-full">
        <h2 className="text-xl font-semibold mb-4">Tiendas en este servidor</h2>
        {tenants.length === 0 ? (
          <p className="text-zinc-500">
            Todavía no hay tiendas. Corré <code className="bg-zinc-200 px-1 rounded">npm run db:seed</code> para
            crear la tienda de demostración.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 border rounded-lg bg-white">
            {tenants.map((t) => (
              <li key={t.slug} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-zinc-500">/{t.slug} · plan {t.plan.toLowerCase()}</p>
                </div>
                <Link href={`/${t.slug}`} className="text-[#ff7e7e] font-medium hover:underline">
                  Ver tienda →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

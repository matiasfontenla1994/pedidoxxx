import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { logoutAction } from "@/lib/actions/auth";
import { getPlan } from "@/lib/plans";
import { getUnseenOrderCount } from "@/lib/data/orders";
import NewOrderWatcher from "./new-order-toast";

const NAV = [
  { href: "/admin/dashboard",      label: "Inicio",          icon: "⊞" },
  { href: "/admin/pedidos",         label: "Pedidos",         icon: "📋" },
  { href: "/admin/productos",       label: "Productos",       icon: "📦" },
  { href: "/admin/categorias",      label: "Categorías",      icon: "🏷" },
  { href: "/admin/staff",           label: "Personal",        icon: "👥" },
  { href: "/admin/notificaciones",  label: "Notificaciones",  icon: "🔔" },
  { href: "/admin/configuracion",   label: "Configuración",   icon: "⚙" },
  { href: "/admin/plan",            label: "Plan",            icon: "⭐" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  const unseenCount = getUnseenOrderCount(tenant.id);

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "#FAF8F6" }}>
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-40 h-12 flex items-center px-4 gap-3 shadow-sm"
        style={{ background: "linear-gradient(135deg, #C2402E 0%, #E85A47 100%)" }}
      >
        {/* Brand */}
        <span className="font-bold text-white text-sm truncate flex-1">{tenant.name}</span>

        {/* Ver tienda */}
        <Link
          href={`/${tenant.slug}`}
          target="_blank"
          className="hidden sm:block text-white/80 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors shrink-0"
        >
          Ver tienda
        </Link>

        {/* Notification bell */}
        <Link
          href="/admin/notificaciones"
          className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
          aria-label="Notificaciones"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-emerald-400 text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center font-bold px-1">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 bg-white border-r flex flex-col" style={{ borderColor: "#ECE6E2", minHeight: "calc(100vh - 48px)" }}>
          {/* Store info */}
          <div className="px-4 py-4 border-b" style={{ borderColor: "#ECE6E2" }}>
            <p className="font-semibold text-sm" style={{ color: "#211B18" }}>{tenant.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>
              {plan.label} · {user.name}
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group"
                style={{ color: "#6E635E" }}
              >
                <span className="group-hover:text-[#C2402E] transition-colors">{item.label}</span>
                {item.href === "/admin/notificaciones" && unseenCount > 0 && (
                  <span className="bg-emerald-400 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: "#ECE6E2" }}>
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              className="block text-xs transition-colors"
              style={{ color: "#E85A47" }}
            >
              Ver tienda pública →
            </Link>
            <form action={logoutAction}>
              <button className="text-xs transition-colors" style={{ color: "#9C8E87" }}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 p-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Real-time toast */}
      <NewOrderWatcher />
    </div>
  );
}

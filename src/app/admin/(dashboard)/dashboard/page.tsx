import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { listOrders } from "@/lib/data/orders";
import { updateOrderStatusAction } from "@/lib/actions/orders";

const STATUS_CONFIG = {
  NEW:         { label: "Nuevo",          bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  IN_PROGRESS: { label: "En preparación", bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  READY:       { label: "Listo",          bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  DELIVERED:   { label: "Entregado",      bg: "#F4F4F5", color: "#71717A", border: "#E4E4E7" },
  CANCELLED:   { label: "Cancelado",      bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
} as const;

type OrderStatus = keyof typeof STATUS_CONFIG;

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as OrderStatus] ?? STATUS_CONFIG.NEW;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const { tenant } = await requireAdmin();
  const allOrders = listOrders(tenant.id).filter((o) => o.status !== "CANCELLED");
  const today = todayStr();
  const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today));
  const recent = listOrders(tenant.id).slice(0, 10);

  const totalOrders = allOrders.length;
  const revenue = allOrders.reduce((s, o) => s + o.total, 0);
  const avgTicket = totalOrders > 0 ? revenue / totalOrders : 0;
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const newCount = recent.filter((o) => o.status === "NEW").length;

  const dateLabel = new Date().toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#211B18" }}>Resumen</h1>
          <p className="text-sm capitalize" style={{ color: "#9C8E87" }}>{dateLabel}</p>
        </div>
        {newCount > 0 && (
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "#E85A47" }}
          >
            <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
            {newCount} nuevo{newCount > 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pedidos hoy"
          value={String(todayOrders.length)}
          sub={`${totalOrders} total`}
          accent="#E85A47"
        />
        <StatCard
          label="Facturación"
          value={fmt(todayRevenue, tenant.currency)}
          sub={`Total: ${fmt(revenue, tenant.currency)}`}
          accent="#10B981"
        />
        <StatCard
          label="Ticket promedio"
          value={fmt(avgTicket, tenant.currency)}
          sub="por pedido"
          accent="#6366F1"
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECE6E2" }}>
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "#ECE6E2" }}>
          <h2 className="font-semibold" style={{ color: "#211B18" }}>Pedidos recientes</h2>
          <Link href="/admin/pedidos" className="text-sm font-medium transition-colors" style={{ color: "#E85A47" }}>
            Ver todos →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "#9C8E87" }}>Todavía no hay pedidos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #ECE6E2" }}>
                  {["PEDIDO", "CLIENTE", "TOTAL", "ESTADO", "ACCIÓN"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold tracking-wide"
                      style={{ color: "#9C8E87" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((order, i) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: i < recent.length - 1 ? "1px solid #F5F0ED" : "none" }}
                    className="hover:bg-[#FAF8F6] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "#9C8E87" }}>
                      #{order.id.slice(0, 6)}
                    </td>
                    <td className="px-5 py-3.5 font-medium" style={{ color: "#211B18" }}>
                      {order.customer_name}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: "#211B18" }}>
                      {fmt(order.total, tenant.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <form action={updateOrderStatusAction.bind(null, order.id, order.status === "NEW" ? "IN_PROGRESS" : order.status === "IN_PROGRESS" ? "READY" : "DELIVERED")}>
                        {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                          <button
                            className="text-xs font-semibold transition-colors"
                            style={{ color: "#E85A47" }}
                          >
                            Cambiar →
                          </button>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-5 flex flex-col gap-2"
      style={{ border: "1px solid #ECE6E2" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9C8E87" }}>
          {label}
        </p>
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: "#211B18" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "#9C8E87" }}>
        {sub}
      </p>
      {/* Mini accent bar */}
      <div className="h-1 rounded-full mt-1" style={{ background: `${accent}22` }}>
        <div className="h-full rounded-full w-2/3" style={{ background: accent }} />
      </div>
    </div>
  );
}

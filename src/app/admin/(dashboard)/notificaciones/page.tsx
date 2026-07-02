import { requireAdmin } from "@/lib/require-admin";
import { listOrders, markAllOrdersSeen } from "@/lib/data/orders";
import { markAllSeenAction } from "@/lib/actions/orders";

const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
  NEW:         { label: "Nuevo",      dot: "#34D399", pill: "bg-emerald-50 text-emerald-700" },
  IN_PROGRESS: { label: "En proceso", dot: "#F59E0B", pill: "bg-amber-50 text-amber-700" },
  READY:       { label: "Listo",      dot: "#3B82F6", pill: "bg-blue-50 text-blue-700" },
  DELIVERED:   { label: "Entregado",  dot: "#A1A1AA", pill: "bg-zinc-100 text-zinc-600" },
  CANCELLED:   { label: "Cancelado",  dot: "#EF4444", pill: "bg-red-50 text-red-600" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificacionesPage() {
  const { tenant } = await requireAdmin();

  // Mark all as seen on page load
  markAllOrdersSeen(tenant.id);

  const orders = listOrders(tenant.id).slice(0, 50);
  const hasUnseen = orders.some((o) => o.seen === 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>
            Notificaciones
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7A716C" }}>
            Historial de pedidos recientes
          </p>
        </div>
        {hasUnseen && (
          <form action={markAllSeenAction}>
            <button
              className="text-sm font-medium transition-colors"
              style={{ color: "#E85A47" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C2402E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#E85A47")}
            >
              Marcar todo como leído
            </button>
          </form>
        )}
      </div>

      {orders.length === 0 && (
        <div className="bg-white rounded-2xl border p-10 text-center" style={{ borderColor: "#ECE6E2" }}>
          <p className="text-sm" style={{ color: "#7A716C" }}>
            Todavía no hay pedidos registrados.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {orders.map((order) => {
          const st = STATUS[order.status] ?? STATUS.NEW;
          const isUnseen = order.seen === 0;

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl p-4 flex items-center gap-3 transition-shadow hover:shadow-sm"
              style={{
                border: isUnseen ? "1.5px solid #34D399" : "1px solid #ECE6E2",
              }}
            >
              {/* Status dot */}
              <span
                className="shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ background: st.dot, opacity: isUnseen ? 1 : 0.4 }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm" style={{ color: "#211B18" }}>
                    {order.customer_name}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.pill}`}>
                    {st.label}
                  </span>
                  {isUnseen && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Nuevo
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>
                  {tenant.currency} {order.total.toFixed(2)} · {formatDate(order.created_at)}
                  {order.payment_method && ` · ${order.payment_method}`}
                </p>
              </div>

              {/* Right side */}
              <p className="shrink-0 text-sm font-semibold" style={{ color: "#211B18" }}>
                {tenant.currency} {order.total.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

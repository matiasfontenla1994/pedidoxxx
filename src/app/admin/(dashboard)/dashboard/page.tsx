import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { listOrders } from "@/lib/data/orders";
import { listProducts } from "@/lib/data/products";
import OrdersTable from "../pedidos/orders-table";

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const { tenant } = await requireAdmin();
  const allOrders = (await listOrders(tenant.id)).filter((o) => o.status !== "CANCELLED");
  const today = todayStr();
  const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today));
  const recent = (await listOrders(tenant.id)).filter((o) => o.created_at.startsWith(today));
  const activeProducts = await listProducts(tenant.id, { onlyActive: true });

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
    <div className="space-y-6 w-full">
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
          <h2 className="font-semibold" style={{ color: "#211B18" }}>Pedidos de hoy</h2>
          <Link
            href="/admin/pedidos"
            className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "#E85A47" }}
          >
            Ver todos →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "#9C8E87" }}>No tenés pedidos hoy.</p>
          </div>
        ) : (
          <div className="p-4">
            <OrdersTable
              variant="compact"
              currency={tenant.currency}
              products={activeProducts.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
              orders={recent.map((o) => ({
                id: o.id,
                customerName: o.customer_name,
                customerPhone: o.customer_phone,
                customerEmail: o.customer_email,
                customerAddress: o.customer_address,
                subtotal: o.subtotal,
                discount: o.discount,
                promoDiscount: o.promo_discount,
                promoLabel: o.promo_label,
                paymentAdjustment: o.payment_adjustment,
                deliveryCost: o.delivery_cost,
                total: o.total,
                status: o.status,
                source: o.source,
                paymentMethod: o.payment_method,
                couponCode: o.coupon_code,
                notes: o.notes,
                createdAt: o.created_at,
                items: JSON.parse(o.items_json || "[]"),
              }))}
            />
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

import { requireAdmin } from "@/lib/require-admin";
import { listOrders } from "@/lib/data/orders";
import OrdersTable from "./orders-table";

export default async function PedidosPage() {
  const { tenant } = await requireAdmin();
  const orders = listOrders(tenant.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Centro de pedidos</h1>
      <OrdersTable
        currency={tenant.currency}
        orders={orders.map((o) => ({
          id: o.id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          total: o.total,
          status: o.status,
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
          items: JSON.parse(o.items_json || "[]"),
        }))}
      />
    </div>
  );
}

import { requireAdmin } from "@/lib/require-admin";
import { listOrders } from "@/lib/data/orders";
import { listProducts } from "@/lib/data/products";
import OrdersTable from "./orders-table";

export default async function PedidosPage() {
  const { tenant } = await requireAdmin();
  const orders = await listOrders(tenant.id);
  const products = await listProducts(tenant.id, { onlyActive: true });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Centro de pedidos</h1>
      <OrdersTable
        currency={tenant.currency}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        orders={orders.map((o) => ({
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
  );
}

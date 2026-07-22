import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { listProducts } from "@/lib/data/products";
import { listPaymentMethods } from "@/lib/data/payment-methods";
import { listCoupons } from "@/lib/data/coupons";
import { listActivePromotions } from "@/lib/data/promotions";
import { getPlan } from "@/lib/plans";
import PosClient from "./pos-client";

export default async function PosPage() {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);

  if (!plan.pointOfSale) {
    return (
      <div className="max-w-lg space-y-3">
        <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Punto de venta</h1>
        <div className="bg-white border rounded-xl p-4 text-sm" style={{ borderColor: "#ECE6E2", color: "#6E635E" }}>
          <p>
            El punto de venta para unificar ventas presenciales y por WhatsApp está disponible desde el
            plan Pro. Tu plan actual es {plan.label}.
          </p>
          <Link href="/admin/plan" className="inline-block mt-3 font-medium" style={{ color: "#E85A47" }}>
            Ver planes y solicitar cambio →
          </Link>
        </div>
      </div>
    );
  }

  const [products, paymentMethods, coupons, promotions] = await Promise.all([
    listProducts(tenant.id, { onlyActive: true }),
    listPaymentMethods(tenant.id),
    plan.coupons ? listCoupons(tenant.id) : Promise.resolve([]),
    plan.promotions ? listActivePromotions(tenant.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Punto de venta</h1>
      <PosClient
        currency={tenant.currency}
        products={products
          .filter((p) => p.is_service === 0)
          .map((p) => ({ id: p.id, categoryId: p.category_id, name: p.name, price: p.price, stock: p.stock, sku: p.sku }))}
        paymentMethods={paymentMethods.filter((m) => m.active === 1).map((m) => m.name)}
        showCoupon={plan.coupons && coupons.some((c) => c.active === 1)}
        promotions={promotions.map((p) => ({
          id: p.id,
          name: p.name,
          scope: p.scope,
          scopeId: p.scope_id,
          buyQty: p.buy_qty,
          payQty: p.pay_qty,
        }))}
      />
    </div>
  );
}

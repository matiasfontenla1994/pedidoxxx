import { requireAdmin } from "@/lib/require-admin";
import { PLANS } from "@/lib/plans";

const ROWS: { key: keyof typeof PLANS.PRINCIPIANTE; label: string }[] = [
  { key: "maxImagesPerProduct", label: "Imágenes por producto" },
  { key: "coupons", label: "Cupones de descuento" },
  { key: "promotions", label: "Promociones (2x1, 3x2)" },
  { key: "dynamicCategories", label: "Categorías dinámicas" },
  { key: "sku", label: "Códigos SKU" },
  { key: "advancedStock", label: "Control de stock avanzado" },
  { key: "bulkEdit", label: "Edición masiva" },
  { key: "userRoles", label: "Gestión de usuarios y roles" },
  { key: "pointOfSale", label: "Punto de venta" },
  { key: "autoThermalPrint", label: "Impresión térmica automática" },
  { key: "deliveryZonesByDistance", label: "Zonas de envío por distancia" },
  { key: "googleAnalytics", label: "Google Analytics" },
  { key: "facebookPixel", label: "Facebook Pixel" },
  { key: "advancedStats", label: "Estadísticas avanzadas" },
  { key: "customDomain", label: "Dominio personalizado" },
];

function renderValue(value: unknown) {
  if (typeof value === "boolean") return value ? "✅" : "❌";
  return String(value);
}

export default async function PlanPage() {
  const { tenant } = await requireAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tu plan</h1>
      <p className="text-sm text-zinc-500">
        Plan actual: <strong>{PLANS[tenant.plan].label}</strong> (USD {PLANS[tenant.plan].priceUsd}/mes).
        Esta comparativa replica la tabla real de info.pedix.app/es/#precios — ver{" "}
        <code>01_analisis_pedix.md</code>. El botón de upgrade es un stub: no hay pasarela de pago conectada.
      </p>

      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Funcionalidad</th>
              {Object.values(PLANS).map((p) => (
                <th key={p.id} className={`p-3 ${tenant.plan === p.id ? "bg-[#fff0f0]" : ""}`}>
                  {p.label}
                  <div className="text-xs font-normal text-zinc-500">USD {p.priceUsd}/mes</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="p-3 text-zinc-700">{row.label}</td>
                {Object.values(PLANS).map((p) => (
                  <td key={p.id} className={`p-3 text-center ${tenant.plan === p.id ? "bg-[#fff0f0]" : ""}`}>
                    {renderValue(p[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

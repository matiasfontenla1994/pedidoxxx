import { requireAdmin } from "@/lib/require-admin";
import { listPaymentMethods } from "@/lib/data/payment-methods";
import { listDeliveryZones } from "@/lib/data/delivery-zones";
import { listCoupons } from "@/lib/data/coupons";
import { listPromotions } from "@/lib/data/promotions";
import { listProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { getPlan } from "@/lib/plans";
import { storeQrDataUrl } from "@/lib/qr";
import {
  updateTenantSettingsAction,
  createPaymentMethodAction,
  updatePaymentMethodAction,
  deletePaymentMethodAction,
  createDeliveryZoneAction,
  deleteDeliveryZoneAction,
  createCouponAction,
  updateCouponAction,
  deleteCouponAction,
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
} from "@/lib/actions/settings";
import DeleteButton from "../delete-button";
import SaveButton from "../save-button";
import PromotionToggle from "../promotion-toggle";

const DAYS: [string, string][] = [
  ["lun", "Lunes"],
  ["mar", "Martes"],
  ["mie", "Miércoles"],
  ["jue", "Jueves"],
  ["vie", "Viernes"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
];

export default async function ConfiguracionPage() {
  const { tenant } = await requireAdmin();
  const plan = getPlan(tenant.plan);
  const paymentMethods = await listPaymentMethods(tenant.id);
  const deliveryZones = await listDeliveryZones(tenant.id);
  const coupons = await listCoupons(tenant.id);
  const promotions = plan.promotions ? await listPromotions(tenant.id) : [];
  const products = plan.promotions ? await listProducts(tenant.id) : [];
  const categories = plan.promotions ? await listCategories(tenant.id) : [];
  const openHours = JSON.parse(tenant.open_hours_json || "{}");
  const qr = await storeQrDataUrl(tenant.slug);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  function scopeLabel(promo: { scope: string; scope_id: string | null }) {
    if (promo.scope === "ALL") return "Todos los productos";
    if (promo.scope === "CATEGORY") return `Categoría: ${categoryNameById.get(promo.scope_id ?? "") ?? "—"}`;
    return `Producto: ${productNameById.get(promo.scope_id ?? "") ?? "—"}`;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración de la tienda</h1>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Datos generales</h2>
        <form key={tenant.updated_at} action={updateTenantSettingsAction} className="space-y-3">
          <input name="name" defaultValue={tenant.name} required placeholder="Nombre de la tienda" className="input" />
          <input name="alias" defaultValue={tenant.alias ?? ""} placeholder="Alias (nombre corto para notificaciones, ej: Biloba)" className="input" />
          <label className="block">
            <span className="text-sm font-medium block mb-1">Tipo de tienda</span>
            <select name="store_type" defaultValue={tenant.store_type} className="input">
              <option value="PRODUCTS">Solo productos</option>
              <option value="SERVICES">Solo servicios con turnos</option>
              <option value="BOTH">Productos y servicios</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium block mb-1">Moneda</span>
            <select name="currency" defaultValue={tenant.currency} className="input">
              <option value="ARS">Peso argentino (ARS)</option>
              <option value="USD">Dólar estadounidense (USD)</option>
              <option value="MXN">Peso mexicano (MXN)</option>
              <option value="CLP">Peso chileno (CLP)</option>
              <option value="COP">Peso colombiano (COP)</option>
              <option value="UYU">Peso uruguayo (UYU)</option>
              <option value="PEN">Sol peruano (PEN)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </label>
          <textarea name="description" defaultValue={tenant.description ?? ""} placeholder="Descripción" className="input" rows={2} />
          <input name="whatsapp" defaultValue={tenant.whatsapp} required placeholder="WhatsApp (cod. país + número, sin +)" className="input" />
          <input type="hidden" name="banner_url" value={tenant.banner_url ?? ""} />
          <div className="flex items-center gap-2">
            <span className="text-sm">Color principal</span>
            <input name="primaryColor" type="color" defaultValue={tenant.primary_color} className="h-9 w-14 border rounded" />
          </div>
          <label className="block">
            <span className="text-sm font-medium block mb-1">Costo fijo de envío</span>
            <input name="deliveryFixedCost" type="number" step="0.01" defaultValue={tenant.delivery_fixed_cost} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#211B18" }}>
            <input name="pickupEnabled" type="checkbox" defaultChecked={tenant.pickup_enabled === 1} className="w-4 h-4" />
            Ofrecer retiro en local
          </label>
          <div>
            <p className="text-sm font-medium mb-1">Horarios (texto libre, ej: 9:00-18:00 o &quot;cerrado&quot;)</p>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map(([key, label]) => (
                <label key={key} className="text-xs">
                  {label}
                  <input name={`hours_${key}`} defaultValue={openHours[key] ?? ""} className="input mt-0.5" />
                </label>
              ))}
            </div>
          </div>
          <SaveButton className="bg-[#ff7e7e] text-white px-4 py-2 rounded-lg font-medium">Guardar</SaveButton>
        </form>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <h2 className="font-medium">Banner publicitario</h2>
        <p className="text-xs" style={{ color: "#7A716C" }}>
          Pegá la URL de una imagen para mostrar un banner en la parte superior de tu tienda.
        </p>
        <form key={tenant.updated_at} action={updateTenantSettingsAction} className="space-y-3">
          {/* Hidden fields to preserve existing settings */}
          <input type="hidden" name="name" value={tenant.name} />
          <input type="hidden" name="alias" value={tenant.alias ?? ""} />
          <input type="hidden" name="store_type" value={tenant.store_type} />
          <input type="hidden" name="currency" value={tenant.currency} />
          <input type="hidden" name="whatsapp" value={tenant.whatsapp} />
          <input type="hidden" name="description" value={tenant.description ?? ""} />
          <input type="hidden" name="primaryColor" value={tenant.primary_color} />
          <input type="hidden" name="deliveryFixedCost" value={tenant.delivery_fixed_cost} />
          {tenant.pickup_enabled === 1 && <input type="hidden" name="pickupEnabled" value="on" />}
          <input
            name="banner_url"
            defaultValue={tenant.banner_url ?? ""}
            placeholder="https://ejemplo.com/imagen-banner.jpg"
            className="input"
          />
          {tenant.banner_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tenant.banner_url}
              alt="Preview del banner"
              className="w-full h-32 object-cover rounded-lg border"
              style={{ borderColor: "#ECE6E2" }}
            />
          )}
          <div className="flex gap-2">
            <SaveButton className="text-white px-4 py-2 rounded-lg font-medium text-sm" style={{ background: "#E85A47" }}>
              Guardar banner
            </SaveButton>
            {tenant.banner_url && (
              <button
                type="submit"
                name="banner_url"
                value=""
                className="px-4 py-2 rounded-lg font-medium text-sm border"
                style={{ borderColor: "#ECE6E2", color: "#7A716C" }}
              >
                Quitar banner
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Código QR de la tienda</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr.dataUrl} alt="QR de la tienda" className="border rounded-lg" />
        <p className="text-xs text-zinc-500 break-all">{qr.url}</p>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Métodos de pago</h2>
        <form action={createPaymentMethodAction} className="flex gap-2 flex-wrap">
          <input name="name" required placeholder="Nombre (ej. Efectivo)" className="input flex-1 min-w-[140px]" />
          <input name="adjustmentPct" type="number" step="0.1" placeholder="Recargo/desc. (ej. -5)" className="input w-36" />
          <select name="adjustmentType" defaultValue="PERCENT" className="input w-28">
            <option value="PERCENT">%</option>
            <option value="FIXED">Fijo</option>
          </select>
          <SaveButton className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</SaveButton>
        </form>
        <div className="divide-y">
          {paymentMethods.map((p) => (
            <form
              key={`${p.id}-${p.name}-${p.adjustment_pct}-${p.adjustment_type}`}
              action={updatePaymentMethodAction.bind(null, p.id)}
              className="py-2 flex items-center gap-2 flex-wrap"
            >
              <input name="name" required defaultValue={p.name} className="input flex-1 min-w-[140px]" />
              <input
                name="adjustmentPct"
                type="number"
                step="0.1"
                defaultValue={p.adjustment_pct}
                placeholder="Recargo/desc."
                className="input w-28"
              />
              <select name="adjustmentType" defaultValue={p.adjustment_type} className="input w-24">
                <option value="PERCENT">%</option>
                <option value="FIXED">Fijo</option>
              </select>
              <SaveButton className="bg-zinc-900 text-white px-3 rounded-lg text-sm">Guardar</SaveButton>
              <DeleteButton action={deletePaymentMethodAction} id={p.id} />
            </form>
          ))}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">
          Zonas de envío {!plan.deliveryZonesByDistance && <span className="text-xs text-zinc-400">(solo plan Pro)</span>}
        </h2>
        {plan.deliveryZonesByDistance ? (
          <>
            <form action={createDeliveryZoneAction} className="flex gap-2 flex-wrap">
              <input name="name" required placeholder="Nombre de la zona" className="input flex-1 min-w-[140px]" />
              <input name="cost" type="number" step="0.01" required placeholder="Costo" className="input w-32" />
              <SaveButton className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</SaveButton>
            </form>
            <div className="divide-y">
              {deliveryZones.map((z) => (
                <div key={z.id} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {z.name} · {tenant.currency} {z.cost.toFixed(2)}
                  </span>
                  <DeleteButton action={deleteDeliveryZoneAction} id={z.id} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Tu plan usa costo fijo de envío (configurado arriba). Las zonas por distancia son una funcionalidad
            del plan Pro.
          </p>
        )}
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">
          Cupones de descuento {!plan.coupons && <span className="text-xs text-zinc-400">(solo Especialista/Pro)</span>}
        </h2>
        {plan.coupons ? (
          <>
            <form action={createCouponAction} className="flex gap-2 flex-wrap">
              <input name="code" required placeholder="Código (ej. VERANO10)" className="input flex-1 min-w-[140px]" />
              <select name="type" className="input w-36">
                <option value="PERCENT">% Porcentaje</option>
                <option value="FIXED">Monto fijo</option>
              </select>
              <input name="value" type="number" step="0.01" required placeholder="Valor" className="input w-28" />
              <SaveButton className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</SaveButton>
            </form>
            <div className="divide-y">
              {coupons.map((c) => (
                <form
                  key={`${c.id}-${c.code}-${c.type}-${c.value}`}
                  action={updateCouponAction.bind(null, c.id)}
                  className="py-2 flex items-center gap-2 flex-wrap"
                >
                  <input name="code" required defaultValue={c.code} className="input flex-1 min-w-[140px]" />
                  <select name="type" defaultValue={c.type} className="input w-32">
                    <option value="PERCENT">% Porcentaje</option>
                    <option value="FIXED">Monto fijo</option>
                  </select>
                  <input name="value" type="number" step="0.01" required defaultValue={c.value} className="input w-24" />
                  <SaveButton className="bg-zinc-900 text-white px-3 rounded-lg text-sm">Guardar</SaveButton>
                  <DeleteButton action={deleteCouponAction} id={c.id} />
                </form>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Los cupones están disponibles desde el plan Especialista.
          </p>
        )}
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">
          Promociones automáticas {!plan.promotions && <span className="text-xs text-zinc-400">(solo plan Pro)</span>}
        </h2>
        {plan.promotions ? (
          <>
            <p className="text-xs" style={{ color: "#7A716C" }}>
              Se aplican solas en el carrito, sin necesidad de código (ej. 2x1: llevando 2 pagás 1).
            </p>
            <form action={createPromotionAction} className="flex gap-2 flex-wrap items-center">
              <input name="name" required placeholder="Nombre (ej. 2x1 en bebidas)" className="input flex-1 min-w-[140px]" />
              <select name="scope" className="input w-40">
                <option value="ALL">Todos los productos</option>
                <option value="CATEGORY">Una categoría</option>
                <option value="PRODUCT">Un producto</option>
              </select>
              <select name="scopeId" className="input w-40">
                <option value="">—</option>
                <optgroup label="Categorías">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Productos">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
              <input name="buyQty" type="number" min={2} required placeholder="Llevando" className="input w-24" />
              <input name="payQty" type="number" min={1} required placeholder="Pagás" className="input w-24" />
              <SaveButton className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</SaveButton>
            </form>
            <div className="divide-y">
              {promotions.length === 0 && (
                <p className="py-2 text-sm text-zinc-500">Todavía no creaste promociones.</p>
              )}
              {promotions.map((promo) => (
                <form
                  key={`${promo.id}-${promo.name}-${promo.scope}-${promo.scope_id}-${promo.buy_qty}-${promo.pay_qty}`}
                  action={updatePromotionAction.bind(null, promo.id)}
                  className="py-2 flex items-center gap-2 flex-wrap"
                >
                  <input name="name" required defaultValue={promo.name} className="input flex-1 min-w-[140px]" />
                  <select name="scope" defaultValue={promo.scope} className="input w-40">
                    <option value="ALL">Todos los productos</option>
                    <option value="CATEGORY">Una categoría</option>
                    <option value="PRODUCT">Un producto</option>
                  </select>
                  <select name="scopeId" defaultValue={promo.scope_id ?? ""} className="input w-40">
                    <option value="">—</option>
                    <optgroup label="Categorías">
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Productos">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <input name="buyQty" type="number" min={2} required defaultValue={promo.buy_qty} className="input w-20" />
                  <input name="payQty" type="number" min={1} required defaultValue={promo.pay_qty} className="input w-20" />
                  <p className="w-full text-xs basis-full" style={{ color: "#9C8E87" }}>{scopeLabel(promo)}</p>
                  <SaveButton className="bg-zinc-900 text-white px-3 rounded-lg text-sm">Guardar</SaveButton>
                  <PromotionToggle id={promo.id} initialActive={promo.active === 1} />
                  <DeleteButton action={deletePromotionAction} id={promo.id} />
                </form>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Las promociones automáticas (2x1, 3x2, etc.) están disponibles en el plan Pro.
          </p>
        )}
      </section>
    </div>
  );
}

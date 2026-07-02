import { requireAdmin } from "@/lib/require-admin";
import { listPaymentMethods } from "@/lib/data/payment-methods";
import { listDeliveryZones } from "@/lib/data/delivery-zones";
import { listCoupons } from "@/lib/data/coupons";
import { getPlan } from "@/lib/plans";
import { storeQrDataUrl } from "@/lib/qr";
import {
  updateTenantSettingsAction,
  createPaymentMethodAction,
  deletePaymentMethodAction,
  createDeliveryZoneAction,
  deleteDeliveryZoneAction,
  createCouponAction,
  deleteCouponAction,
} from "@/lib/actions/settings";
import DeleteButton from "../delete-button";

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
  const paymentMethods = listPaymentMethods(tenant.id);
  const deliveryZones = listDeliveryZones(tenant.id);
  const coupons = listCoupons(tenant.id);
  const openHours = JSON.parse(tenant.open_hours_json || "{}");
  const qr = await storeQrDataUrl(tenant.slug);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración de la tienda</h1>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Datos generales</h2>
        <form action={updateTenantSettingsAction} className="space-y-3">
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
          <textarea name="description" defaultValue={tenant.description ?? ""} placeholder="Descripción" className="input" rows={2} />
          <input name="whatsapp" defaultValue={tenant.whatsapp} required placeholder="WhatsApp (cod. país + número, sin +)" className="input" />
          <div className="flex items-center gap-2">
            <span className="text-sm">Color principal</span>
            <input name="primaryColor" type="color" defaultValue={tenant.primary_color} className="h-9 w-14 border rounded" />
          </div>
          <label className="block">
            <span className="text-sm font-medium block mb-1">Costo fijo de envío</span>
            <input name="deliveryFixedCost" type="number" step="0.01" defaultValue={tenant.delivery_fixed_cost} className="input" />
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
          <button className="bg-[#ff7e7e] text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
        </form>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <h2 className="font-medium">Banner publicitario</h2>
        <p className="text-xs" style={{ color: "#7A716C" }}>
          Pegá la URL de una imagen para mostrar un banner en la parte superior de tu tienda.
        </p>
        <form action={updateTenantSettingsAction} className="space-y-3">
          {/* Hidden fields to preserve existing settings */}
          <input type="hidden" name="name" value={tenant.name} />
          <input type="hidden" name="alias" value={tenant.alias ?? ""} />
          <input type="hidden" name="store_type" value={tenant.store_type} />
          <input type="hidden" name="whatsapp" value={tenant.whatsapp} />
          <input type="hidden" name="description" value={tenant.description ?? ""} />
          <input type="hidden" name="primaryColor" value={tenant.primary_color} />
          <input type="hidden" name="deliveryFixedCost" value={tenant.delivery_fixed_cost} />
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
            <button className="text-white px-4 py-2 rounded-lg font-medium text-sm" style={{ background: "#E85A47" }}>
              Guardar banner
            </button>
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
          <input name="adjustmentPct" type="number" step="0.1" placeholder="Recargo/desc. % (ej. -5)" className="input w-44" />
          <button className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</button>
        </form>
        <div className="divide-y">
          {paymentMethods.map((p) => (
            <div key={p.id} className="py-2 flex items-center justify-between text-sm">
              <span>
                {p.name} {p.adjustment_pct !== 0 && `(${p.adjustment_pct > 0 ? "+" : ""}${p.adjustment_pct}%)`}
              </span>
              <DeleteButton action={deletePaymentMethodAction} id={p.id} />
            </div>
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
              <button className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</button>
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
            del plan Pro en Pedix real.
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
              <button className="bg-zinc-900 text-white px-4 rounded-lg text-sm">Agregar</button>
            </form>
            <div className="divide-y">
              {coupons.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {c.code} · {c.type === "PERCENT" ? `${c.value}%` : `${tenant.currency} ${c.value}`}
                  </span>
                  <DeleteButton action={deleteCouponAction} id={c.id} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Los cupones están disponibles desde el plan Especialista, igual que en Pedix.
          </p>
        )}
      </section>
    </div>
  );
}

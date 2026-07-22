import {
  updateTenantAsSuperAdminAction,
  deleteTenantAction,
  impersonateTenantAction,
  approvePlanChangeAction,
  dismissPlanChangeRequestAction,
} from "@/lib/actions/superadmin";
import { PLANS } from "@/lib/plans";
import type { Tenant } from "@/lib/data/types";
import SaveButton from "../admin/(dashboard)/save-button";
import DeleteButton from "../admin/(dashboard)/delete-button";
import TenantStatusToggle from "./tenant-status-toggle";

export default function TenantRow({
  tenant, ownerEmail, stats,
}: {
  tenant: Tenant;
  ownerEmail?: string;
  stats: { totalOrders: number; revenue: number };
}) {
  return (
    <details className="group">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-[#FAF8F6] transition-colors flex-wrap">
        <div className="min-w-0">
          <p className="font-medium text-sm" style={{ color: "#211B18" }}>
            {tenant.name} <span className="font-normal" style={{ color: "#9C8E87" }}>/{tenant.slug}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#9C8E87" }}>
            {tenant.plan} · {tenant.currency} · {tenant.store_type}
            {ownerEmail && ` · ${ownerEmail}`}
            {` · ${stats.totalOrders} pedido(s) · ${tenant.currency} ${stats.revenue.toFixed(2)}`}
            {tenant.plan_requested && (
              <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                solicita {PLANS[tenant.plan_requested as keyof typeof PLANS]?.label ?? tenant.plan_requested}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TenantStatusToggle id={tenant.id} initialActive={tenant.status !== "SUSPENDED"} />
          <form action={impersonateTenantAction.bind(null, tenant.id)}>
            <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg border" style={{ borderColor: "#ECE6E2", color: "#211B18" }}>
              Entrar al panel
            </button>
          </form>
          <a href={`/${tenant.slug}`} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: "#E85A47" }}>
            Ver tienda →
          </a>
        </div>
      </summary>

      {tenant.plan_requested && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-amber-800">
            Solicita cambiar a <strong>{PLANS[tenant.plan_requested as keyof typeof PLANS]?.label ?? tenant.plan_requested}</strong>.
          </p>
          <div className="flex items-center gap-3">
            <form action={approvePlanChangeAction.bind(null, tenant.id)}>
              <button className="text-xs font-semibold" style={{ color: "#059669" }}>Aprobar</button>
            </form>
            <form action={dismissPlanChangeRequestAction.bind(null, tenant.id)}>
              <button className="text-xs" style={{ color: "#9C8E87" }}>Descartar</button>
            </form>
          </div>
        </div>
      )}

      <form
        key={`${tenant.id}-${tenant.updated_at}`}
        action={updateTenantAsSuperAdminAction.bind(null, tenant.id)}
        className="px-4 pb-4 pt-1 space-y-3 border-t"
        style={{ borderColor: "#F5F0ED", background: "#FEFCFB" }}
      >
        <div className="grid grid-cols-2 gap-3">
          <input name="name" required defaultValue={tenant.name} placeholder="Nombre" className="input col-span-2 text-sm" />
          <input name="whatsapp" required defaultValue={tenant.whatsapp} placeholder="WhatsApp" className="input col-span-2 text-sm" />
          <select name="plan" defaultValue={tenant.plan} className="input text-sm">
            <option value="PRINCIPIANTE">Principiante</option>
            <option value="ESPECIALISTA">Especialista</option>
            <option value="PRO">Pro</option>
          </select>
          <select name="storeType" defaultValue={tenant.store_type} className="input text-sm">
            <option value="PRODUCTS">Solo productos</option>
            <option value="SERVICES">Solo servicios con turnos</option>
            <option value="BOTH">Productos y servicios</option>
          </select>
          <select name="currency" defaultValue={tenant.currency} className="input col-span-2 text-sm">
            <option value="ARS">Peso argentino (ARS)</option>
            <option value="USD">Dólar estadounidense (USD)</option>
            <option value="MXN">Peso mexicano (MXN)</option>
            <option value="CLP">Peso chileno (CLP)</option>
            <option value="COP">Peso colombiano (COP)</option>
            <option value="UYU">Peso uruguayo (UYU)</option>
            <option value="PEN">Sol peruano (PEN)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <SaveButton className="text-white px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "#211B18" }}>
            Guardar cambios
          </SaveButton>
          <DeleteButton
            action={deleteTenantAction}
            id={tenant.id}
            confirmMessage={`¿Eliminar "${tenant.name}" definitivamente? Se borran también sus productos, pedidos, categorías y usuarios. No se puede deshacer.`}
          />
        </div>
      </form>
    </details>
  );
}

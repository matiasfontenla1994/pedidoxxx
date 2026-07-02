import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { listCategories } from "@/lib/data/categories";
import { listProducts } from "@/lib/data/products";
import { listPaymentMethods } from "@/lib/data/payment-methods";
import { listDeliveryZones } from "@/lib/data/delivery-zones";
import { listStaff, getStaffSchedules } from "@/lib/data/staff";
import StoreClient from "./store-client";
import BookingSection from "./booking-section";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = getTenantBySlug(slug);
  if (!tenant) notFound();

  const storeType = tenant.store_type ?? "PRODUCTS";
  const showProducts = storeType === "PRODUCTS" || storeType === "BOTH";
  const showBooking = storeType === "SERVICES" || storeType === "BOTH";

  const categories = showProducts ? listCategories(tenant.id) : [];
  const allProducts = listProducts(tenant.id, { onlyActive: true });
  const products = showProducts ? allProducts.filter((p) => p.is_service === 0) : [];
  const services = showBooking ? allProducts.filter((p) => p.is_service === 1) : [];
  const paymentMethods = showProducts ? listPaymentMethods(tenant.id).filter((p) => p.active) : [];
  const deliveryZones = showProducts ? listDeliveryZones(tenant.id).filter((z) => z.active) : [];
  const staffList = showBooking ? listStaff(tenant.id) : [];
  const staffSchedules: Record<string, { dayOfWeek: number }[]> = {};
  if (showBooking) {
    for (const s of staffList) {
      staffSchedules[s.id] = getStaffSchedules(s.id).map((sch) => ({ dayOfWeek: sch.day_of_week }));
    }
  }

  const tenantVM = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    alias: tenant.alias,
    description: tenant.description,
    primaryColor: tenant.primary_color,
    currency: tenant.currency,
    whatsapp: tenant.whatsapp,
    deliveryFixedCost: tenant.delivery_fixed_cost,
    openHours: JSON.parse(tenant.open_hours_json || "{}"),
  };

  return (
    <div className="flex-1 flex flex-col">
      {tenant.banner_url ? (
        <header className="relative">
          {/* Cover photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant.banner_url}
            alt="Banner de la tienda"
            className="w-full object-cover"
            style={{ height: "220px" }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" }}
          />
          {/* Store name overlaid at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-white drop-shadow">{tenant.alias || tenant.name}</h1>
              {tenant.description && (
                <p className="text-white/80 text-sm mt-1 drop-shadow">{tenant.description}</p>
              )}
            </div>
          </div>
        </header>
      ) : (
        <header className="text-white px-6 py-10" style={{ backgroundColor: tenant.primary_color }}>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold">{tenant.alias || tenant.name}</h1>
            {tenant.description && <p className="text-white/90 mt-1">{tenant.description}</p>}
          </div>
        </header>
      )}

      <div className="max-w-3xl mx-auto w-full px-6 py-6 flex-1 space-y-10">
        {showProducts && (
          <StoreClient
            tenant={tenantVM}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            products={products.map((p) => ({
              id: p.id,
              categoryId: p.category_id,
              name: p.name,
              description: p.description,
              price: p.price,
              images: JSON.parse(p.images_json || "[]"),
              options: JSON.parse(p.options_json || "[]"),
              stock: p.stock,
            }))}
            paymentMethods={paymentMethods.map((p) => ({ id: p.id, name: p.name, adjustmentPct: p.adjustment_pct }))}
            deliveryZones={deliveryZones.map((z) => ({ id: z.id, name: z.name, cost: z.cost }))}
          />
        )}

        {showBooking && staffList.length > 0 && services.length > 0 && (
          <section>
            {storeType === "BOTH" && (
              <h2 className="text-lg font-semibold mb-4">Reservar turno</h2>
            )}
            <BookingSection
              tenant={{ id: tenant.id, whatsapp: tenant.whatsapp, currency: tenant.currency, primaryColor: tenant.primary_color }}
              staff={staffList.map((s) => ({ id: s.id, name: s.name }))}
              services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, description: s.description }))}
              staffSchedules={staffSchedules}
            />
          </section>
        )}

        {showBooking && (staffList.length === 0 || services.length === 0) && (
          <p className="text-zinc-500 text-sm text-center py-8">
            Esta tienda aún no tiene turnos disponibles.
          </p>
        )}
      </div>
    </div>
  );
}

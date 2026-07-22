"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createOrderAction } from "@/lib/actions/orders";
import { getAvailableSlotsAction } from "@/lib/actions/appointments";
import { calculatePromotionDiscount, type PromotionRule } from "@/lib/promotions";

interface OptionChoice { label: string; priceDelta: number }
interface ProductOption { name: string; choices: OptionChoice[] }
interface ProductVM {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  options: ProductOption[];
  stock: number | null;
  featured: boolean;
}
interface ServiceVM { id: string; name: string; description: string | null; price: number }
interface StaffVM { id: string; name: string }
interface CategoryVM { id: string; name: string; parentId: string | null }
interface PaymentMethodVM { id: string; name: string; adjustmentPct: number; adjustmentType: "PERCENT" | "FIXED" }
interface DeliveryZoneVM { id: string; name: string; cost: number }
interface CouponVM { code: string; type: "PERCENT" | "FIXED"; value: number }
interface TenantVM {
  id: string;
  slug: string;
  name: string;
  alias: string | null;
  description: string | null;
  primaryColor: string;
  currency: string;
  whatsapp: string;
  deliveryFixedCost: number;
  pickupEnabled: boolean;
  openHours: Record<string, string>;
}
interface AppointmentInfo {
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  durationMinutes: number;
}
interface CartLine {
  key: string;
  productId: string;
  categoryId: string | null;
  name: string;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  optionsLabel?: string;
  optionsPriceDelta: number;
  appointment?: AppointmentInfo;
}

const APPOINTMENT_KEY = "__appointment__";

/** Returns YYYY-MM-DD of the next day this staff member works (0=Mon…6=Sun convention) */
function nextWorkingDate(schedules: { dayOfWeek: number }[]): string {
  if (schedules.length === 0) return "";
  const workDays = new Set(schedules.map((s) => s.dayOfWeek));
  const today = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const jsDay = d.getDay(); // 0=Sun…6=Sat
    const ourDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon…6=Sun
    if (workDays.has(ourDay)) {
      return d.toISOString().split("T")[0];
    }
  }
  return "";
}

const DAYS: [string, string][] = [
  ["lun","Lunes"],["mar","Martes"],["mie","Miércoles"],["jue","Jueves"],
  ["vie","Viernes"],["sab","Sábado"],["dom","Domingo"],
];

export default function StoreClient({
  tenant, categories, products, paymentMethods, deliveryZones, coupons, promotions,
  services = [], staff = [], staffSchedules = {},
}: {
  tenant: TenantVM;
  categories: CategoryVM[];
  products: ProductVM[];
  paymentMethods: PaymentMethodVM[];
  deliveryZones: DeliveryZoneVM[];
  coupons: CouponVM[];
  promotions: PromotionRule[];
  services?: ServiceVM[];
  staff?: StaffVM[];
  staffSchedules?: Record<string, { dayOfWeek: number }[]>;
}) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerProduct, setPickerProduct] = useState<ProductVM | null>(null);
  const [bookingService, setBookingService] = useState<ServiceVM | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [result, setResult] = useState<{ orderId: string; whatsappLink: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 1800);
  }

  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const subcategories = useMemo(
    () => (activeCategory === "all" ? [] : categories.filter((c) => c.parentId === activeCategory)),
    [categories, activeCategory]
  );

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    if (activeSubcategory !== "all") return products.filter((p) => p.categoryId === activeSubcategory);
    const childIds = subcategories.map((c) => c.id);
    return products.filter((p) => p.categoryId === activeCategory || (p.categoryId && childIds.includes(p.categoryId)));
  }, [products, activeCategory, activeSubcategory, subcategories]);
  const featuredProducts = useMemo(() => products.filter((p) => p.featured), [products]);

  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  function buildLine(product: ProductVM, choices: Record<string, OptionChoice>, quantity: number): CartLine {
    const delta = Object.values(choices).reduce((s, c) => s + c.priceDelta, 0);
    const label = Object.values(choices).map((c) => c.label).join(", ");
    return {
      key: product.id + "::" + label,
      productId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      basePrice: product.price,
      unitPrice: product.price + delta,
      quantity,
      optionsLabel: label || undefined,
      optionsPriceDelta: delta,
    };
  }

  function mergeIntoCart(line: CartLine) {
    setCart((prev) => {
      const existing = prev.find((l) => l.key === line.key);
      if (existing) return prev.map((l) => l.key === line.key ? { ...l, quantity: l.quantity + line.quantity } : l);
      return [...prev, line];
    });
  }

  function addToCart(product: ProductVM, choices: Record<string, OptionChoice>, quantity: number) {
    mergeIntoCart(buildLine(product, choices, quantity));
    setPickerProduct(null);
    showToast(`✓ ${product.name} agregado al carrito`);
  }

  function buyNow(product: ProductVM, choices: Record<string, OptionChoice>, quantity: number) {
    mergeIntoCart(buildLine(product, choices, quantity));
    setPickerProduct(null);
    setShowCart(false);
    setShowCheckout(true);
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + delta } : l).filter((l) => l.quantity > 0)
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const existingAppointmentLine = cart.find((l) => l.key === APPOINTMENT_KEY);

  function addAppointmentToCart(service: ServiceVM, appointment: AppointmentInfo) {
    const line: CartLine = {
      key: APPOINTMENT_KEY,
      productId: service.id,
      categoryId: null,
      name: service.name,
      basePrice: service.price,
      unitPrice: service.price,
      quantity: 1,
      optionsPriceDelta: 0,
      appointment,
    };
    setCart((prev) => [...prev.filter((l) => l.key !== APPOINTMENT_KEY), line]);
    setBookingService(null);
    showToast(`✓ Turno agregado: ${service.name}`);
  }

  return (
    <div className="flex flex-col">
      {/* Hours */}
      <details className="mb-4 text-sm" style={{ color: "#6E635E" }}>
        <summary className="cursor-pointer font-medium">Horarios de atención</summary>
        <ul className="mt-2 space-y-0.5">
          {DAYS.map(([key, label]) => (
            <li key={key}>{label}: {tenant.openHours[key] ?? "no especificado"}</li>
          ))}
        </ul>
      </details>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-2" style={{ color: "#211B18" }}>★ Ofertas especiales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} tenant={tenant} onOpenPicker={setPickerProduct} />
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: "none" }}>
        {[{ id: "all", name: "Todos" }, ...topLevelCategories].map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveCategory(c.id); setActiveSubcategory("all"); }}
            className="flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-full border transition-colors"
            style={
              activeCategory === c.id
                ? { background: tenant.primaryColor, borderColor: tenant.primaryColor, color: "#fff" }
                : { background: "#fff", borderColor: "#ECE6E2", color: "#6E635E" }
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Subcategory tabs */}
      {subcategories.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
          {[{ id: "all", name: "Todas" }, ...subcategories].map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveSubcategory(c.id)}
              className="flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full border transition-colors"
              style={
                activeSubcategory === c.id
                  ? { background: "#211B18", borderColor: "#211B18", color: "#fff" }
                  : { background: "#fff", borderColor: "#ECE6E2", color: "#9C8E87" }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleProducts.map((p) => (
          <ProductCard key={p.id} product={p} tenant={tenant} onOpenPicker={setPickerProduct} />
        ))}

        {visibleProducts.length === 0 && (
          <p className="col-span-2 text-sm" style={{ color: "#9C8E87" }}>No hay productos en esta categoría.</p>
        )}
      </div>

      {/* Services / turnos */}
      {services.length > 0 && staff.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold mb-2" style={{ color: "#211B18" }}>Turnos y servicios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} tenant={tenant} onOpenPicker={setBookingService} />
            ))}
          </div>
        </div>
      )}

      {/* Add-to-cart toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-medium z-40 animate-[toastIn_0.2s_ease-out]"
          style={{ background: "#211B18" }}
        >
          {toast}
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-xl font-semibold text-sm z-30"
          style={{ background: tenant.primaryColor }}
        >
          Ver pedido · {cartCount} {cartCount === 1 ? "item" : "items"} · {tenant.currency} {cartTotal.toFixed(2)}
        </button>
      )}

      {/* Product picker modal */}
      {pickerProduct && (
        <ProductPicker
          product={pickerProduct}
          currency={tenant.currency}
          color={tenant.primaryColor}
          onClose={() => setPickerProduct(null)}
          onAdd={addToCart}
          onBuyNow={buyNow}
        />
      )}

      {/* Service booking picker modal */}
      {bookingService && (
        <ServiceBookingPicker
          service={bookingService}
          staff={staff}
          staffSchedules={staffSchedules}
          currency={tenant.currency}
          color={tenant.primaryColor}
          initial={existingAppointmentLine?.productId === bookingService.id ? existingAppointmentLine.appointment : undefined}
          onClose={() => setBookingService(null)}
          onConfirm={(appointment) => addAppointmentToCart(bookingService, appointment)}
        />
      )}

      {/* Cart modal */}
      {showCart && !showCheckout && (
        <Modal onClose={() => setShowCart(false)} title={`Tu pedido${cartCount > 0 ? ` (${cartCount} ${cartCount === 1 ? "producto" : "productos"})` : ""}`}>
          {cart.length === 0 ? (
            <p className="text-sm" style={{ color: "#9C8E87" }}>El carrito está vacío.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={{ color: "#211B18" }}>{l.name}</p>
                    {l.optionsLabel && <p className="text-xs" style={{ color: "#9C8E87" }}>{l.optionsLabel}</p>}
                    {l.appointment && (
                      <p className="text-xs" style={{ color: "#9C8E87" }}>
                        Turno: {l.appointment.date} {l.appointment.time} · {l.appointment.staffName}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: "#9C8E87" }}>{tenant.currency} {l.unitPrice.toFixed(2)} c/u</p>
                  </div>
                  {l.appointment ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setShowCart(false);
                          setBookingService({ id: l.productId, name: l.name, description: null, price: l.basePrice });
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{ borderColor: "#ECE6E2", color: "#211B18" }}
                      >
                        Editar
                      </button>
                      <button onClick={() => removeLine(l.key)} className="text-xs" style={{ color: "#9C8E87" }}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(l.key, -1)} className="w-7 h-7 border rounded-lg text-sm" style={{ borderColor: "#ECE6E2" }}>−</button>
                      <span className="w-5 text-center text-sm font-medium">{l.quantity}</span>
                      <button onClick={() => updateQty(l.key, 1)} className="w-7 h-7 border rounded-lg text-sm" style={{ borderColor: "#ECE6E2" }}>+</button>
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-semibold" style={{ borderColor: "#ECE6E2" }}>
                <span>Total</span>
                <span>{tenant.currency} {cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => { setShowCart(false); setShowCheckout(true); }}
                className="w-full text-white py-3 rounded-xl font-semibold mt-1"
                style={{ background: tenant.primaryColor }}
              >
                Continuar con el pedido
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <Modal
          onClose={() => { setShowCheckout(false); setResult(null); setError(null); }}
          title={result ? "¡Pedido enviado!" : `Confirmar pedido (${cartCount} ${cartCount === 1 ? "producto" : "productos"})`}
        >
          {result ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "#6E635E" }}>
                Tu pedido #{result.orderId.slice(0, 8)} fue registrado. Terminá de enviarlo por WhatsApp:
              </p>
              <a
                href={result.whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-white py-3 rounded-xl font-semibold"
                style={{ background: "#25D366" }}
              >
                Abrir WhatsApp
              </a>
            </div>
          ) : (
            <CheckoutForm
              tenant={tenant}
              cart={cart}
              cartTotal={cartTotal}
              paymentMethods={paymentMethods}
              deliveryZones={deliveryZones}
              coupons={coupons}
              promotions={promotions}
              updateQty={updateQty}
              onRemoveLine={removeLine}
              onEditAppointment={(line) => {
                setShowCheckout(false);
                setBookingService({ id: line.productId, name: line.name, description: null, price: line.basePrice });
              }}
              submitting={submitting}
              error={error}
              onSubmit={async (data) => {
                setSubmitting(true);
                setError(null);
                try {
                  const appointmentLine = cart.find((l) => l.appointment);
                  const res = await createOrderAction({
                    tenantId: tenant.id,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    customerEmail: data.customerEmail,
                    customerAddress: data.customerAddress,
                    paymentMethod: data.paymentMethod,
                    deliveryZoneCost: data.deliveryZoneCost,
                    couponCode: data.couponCode,
                    notes: data.notes,
                    items: cart.map((l) => ({
                      productId: l.productId,
                      quantity: l.quantity,
                      optionsLabel: l.optionsLabel,
                      optionsPriceDelta: l.optionsPriceDelta,
                    })),
                    appointment: appointmentLine?.appointment
                      ? {
                          staffId: appointmentLine.appointment.staffId,
                          staffName: appointmentLine.appointment.staffName,
                          serviceName: appointmentLine.name,
                          date: appointmentLine.appointment.date,
                          time: appointmentLine.appointment.time,
                          durationMinutes: appointmentLine.appointment.durationMinutes,
                        }
                      : undefined,
                  });
                  setResult(res);
                  setCart([]);
                } catch {
                  setError("No se pudo registrar el pedido. Revisá los datos e intentá de nuevo.");
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

/* ── ProductCard ── */
function ProductCard({
  product: p, tenant, onOpenPicker,
}: {
  product: ProductVM;
  tenant: TenantVM;
  onOpenPicker: (product: ProductVM) => void;
}) {
  const outOfStock = p.stock !== null && p.stock <= 0;
  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ border: "1px solid #ECE6E2" }}>
      {/* Image / placeholder — clickable to open picker */}
      <button
        className="w-full shrink-0 relative"
        onClick={() => !outOfStock && onOpenPicker(p)}
        disabled={outOfStock}
        aria-label={`Ver ${p.name}`}
      >
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="w-full object-cover" style={{ height: "120px" }} />
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: "120px", background: "#F5F0ED" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: "#C9BEB8" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-200 text-zinc-500">Sin stock</span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-sm leading-tight" style={{ color: "#211B18" }}>{p.name}</p>
        {p.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#9C8E87" }}>{p.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <p className="font-bold text-sm" style={{ color: tenant.primaryColor }}>
            {tenant.currency} {p.price.toFixed(2)}
          </p>
          <button
            disabled={outOfStock}
            onClick={() => !outOfStock && onOpenPicker(p)}
            className="w-8 h-8 rounded-full text-white flex items-center justify-center text-lg font-light leading-none disabled:opacity-30 transition-opacity"
            style={{ background: tenant.primaryColor }}
            aria-label="Agregar"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ProductPicker ── */
function ProductPicker({
  product, currency, color, onClose, onAdd, onBuyNow,
}: {
  product: ProductVM;
  currency: string;
  color: string;
  onClose: () => void;
  onAdd: (product: ProductVM, choices: Record<string, OptionChoice>, qty: number) => void;
  onBuyNow: (product: ProductVM, choices: Record<string, OptionChoice>, qty: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, OptionChoice>>(() => {
    const initial: Record<string, OptionChoice> = {};
    for (const opt of product.options) {
      if (opt.choices[0]) initial[opt.name] = opt.choices[0];
    }
    return initial;
  });
  const [qty, setQty] = useState(1);
  const total = product.price + Object.values(choices).reduce((s, c) => s + c.priceDelta, 0);

  return (
    <Modal onClose={onClose} title={product.name}>
      {product.description && <p className="text-sm mb-3" style={{ color: "#6E635E" }}>{product.description}</p>}

      {product.options.map((opt) => (
        <div key={opt.name} className="mb-3">
          <p className="text-sm font-medium mb-1" style={{ color: "#211B18" }}>{opt.name}</p>
          <div className="flex flex-wrap gap-2">
            {opt.choices.map((c) => (
              <button
                key={c.label}
                onClick={() => setChoices((prev) => ({ ...prev, [opt.name]: c }))}
                className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                style={
                  choices[opt.name]?.label === c.label
                    ? { background: color, borderColor: color, color: "#fff" }
                    : { background: "#fff", borderColor: "#ECE6E2", color: "#6E635E" }
                }
              >
                {c.label}{c.priceDelta !== 0 && ` (${c.priceDelta > 0 ? "+" : ""}${c.priceDelta})`}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Quantity */}
      <div className="flex items-center gap-3 my-4">
        <span className="text-sm font-medium" style={{ color: "#211B18" }}>Cantidad</span>
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 border rounded-xl text-sm" style={{ borderColor: "#ECE6E2" }}>−</button>
        <span className="w-6 text-center font-semibold">{qty}</span>
        <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 border rounded-xl text-sm" style={{ borderColor: "#ECE6E2" }}>+</button>
        <span className="ml-auto font-bold" style={{ color: "#211B18" }}>{currency} {(total * qty).toFixed(2)}</span>
      </div>

      {/* Two action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAdd(product, choices, qty)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
          style={{ borderColor: color, color: color, background: "#fff" }}
        >
          Agregar al carrito
        </button>
        <button
          onClick={() => onBuyNow(product, choices, qty)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: color }}
        >
          Comprar ya
        </button>
      </div>
    </Modal>
  );
}

/* ── ServiceCard ── */
function ServiceCard({
  service: s, tenant, onOpenPicker,
}: {
  service: ServiceVM;
  tenant: TenantVM;
  onOpenPicker: (service: ServiceVM) => void;
}) {
  return (
    <button
      onClick={() => onOpenPicker(s)}
      className="bg-white rounded-2xl overflow-hidden flex flex-col text-left p-3"
      style={{ border: "1px solid #ECE6E2" }}
    >
      <p className="font-semibold text-sm leading-tight" style={{ color: "#211B18" }}>{s.name}</p>
      {s.description && (
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#9C8E87" }}>{s.description}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2">
        <p className="font-bold text-sm" style={{ color: tenant.primaryColor }}>
          {tenant.currency} {s.price.toFixed(2)}
        </p>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#F5F0ED", color: "#6E635E" }}>
          Reservar
        </span>
      </div>
    </button>
  );
}

/* ── ServiceBookingPicker ── */
function ServiceBookingPicker({
  service, staff, staffSchedules, currency, color, initial, onClose, onConfirm,
}: {
  service: ServiceVM;
  staff: StaffVM[];
  staffSchedules: Record<string, { dayOfWeek: number }[]>;
  currency: string;
  color: string;
  initial?: AppointmentInfo;
  onClose: () => void;
  onConfirm: (appointment: AppointmentInfo) => void;
}) {
  const [staffId, setStaffId] = useState(initial?.staffId ?? staff[0]?.id ?? "");
  const [date, setDate] = useState(() => initial?.date ?? nextWorkingDate(staffSchedules[staffId] ?? []));
  const [slots, setSlots] = useState<string[]>(initial ? [initial.time] : []);
  const [selectedTime, setSelectedTime] = useState(initial?.time ?? "");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedStaff = staff.find((s) => s.id === staffId);

  const loadSlotsForDate = useCallback(async (sid: string, d: string) => {
    if (!sid || !d) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime("");
    const available = await getAvailableSlotsAction(sid, d);
    setSlots(available);
    setLoadingSlots(false);
  }, []);

  function selectStaff(id: string) {
    setStaffId(id);
    const next = nextWorkingDate(staffSchedules[id] ?? []);
    setDate(next);
    if (next) loadSlotsForDate(id, next);
    else setSlots([]);
  }

  // Load available slots for the initial date once on mount (skip when editing an existing booking, which already has its slot)
  useEffect(() => {
    if (!initial && staffId && date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount, guarded above
      loadSlotsForDate(staffId, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal onClose={onClose} title={service.name}>
      {service.description && <p className="text-sm mb-3" style={{ color: "#6E635E" }}>{service.description}</p>}

      {staff.length > 1 ? (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1" style={{ color: "#211B18" }}>Profesional</p>
          <div className="flex flex-wrap gap-2">
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStaff(s.id)}
                className="px-3 py-2 rounded-xl border text-sm transition-colors"
                style={
                  staffId === s.id
                    ? { backgroundColor: color, borderColor: color, color: "#fff" }
                    : { borderColor: "#ECE6E2", color: "#6E635E", background: "#fff" }
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : selectedStaff && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1" style={{ color: "#211B18" }}>Profesional</p>
          <p className="text-sm rounded-xl px-3 py-2 border" style={{ borderColor: "#ECE6E2", color: "#211B18", background: "#fff" }}>
            {selectedStaff.name}
          </p>
        </div>
      )}

      <div className="mb-3">
        <p className="text-sm font-medium mb-1" style={{ color: "#211B18" }}>Fecha</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots([]);
              setSelectedTime("");
            }}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => loadSlotsForDate(staffId, date)}
            disabled={!date || !staffId || loadingSlots}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: color }}
          >
            {loadingSlots ? "..." : "Ver horarios"}
          </button>
        </div>
      </div>

      {loadingSlots && (
        <p className="text-sm mb-3" style={{ color: "#9C8E87" }}>Cargando horarios disponibles…</p>
      )}

      {!loadingSlots && slots.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-2" style={{ color: "#211B18" }}>Horario disponible</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className="px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors"
                style={
                  selectedTime === slot
                    ? { backgroundColor: color, borderColor: color, color: "#fff" }
                    : { borderColor: "#ECE6E2", color: "#6E635E", background: "#fff" }
                }
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loadingSlots && date && slots.length === 0 && (
        <p className="text-sm mb-3" style={{ color: "#9C8E87" }}>No hay horarios disponibles para ese día.</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: "#6E635E" }}>Precio del turno</span>
        <span className="font-bold" style={{ color: "#211B18" }}>{currency} {service.price.toFixed(2)}</span>
      </div>

      <button
        type="button"
        disabled={!selectedStaff || !date || !selectedTime}
        onClick={() =>
          selectedStaff &&
          onConfirm({
            staffId: selectedStaff.id,
            staffName: selectedStaff.name,
            date,
            time: selectedTime,
            durationMinutes: initial?.durationMinutes ?? 30,
          })
        }
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
        style={{ background: color }}
      >
        Agregar al carrito
      </button>
    </Modal>
  );
}

/* ── CheckoutForm ── */
function CheckoutForm({
  tenant, cart, cartTotal, paymentMethods, deliveryZones, coupons, promotions, updateQty, onRemoveLine, onEditAppointment, submitting, error, onSubmit,
}: {
  tenant: TenantVM;
  cart: CartLine[];
  cartTotal: number;
  paymentMethods: PaymentMethodVM[];
  deliveryZones: DeliveryZoneVM[];
  coupons: CouponVM[];
  promotions: PromotionRule[];
  updateQty: (key: string, delta: number) => void;
  onRemoveLine: (key: string) => void;
  onEditAppointment: (line: CartLine) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (data: { customerName: string; customerPhone: string; customerEmail?: string; customerAddress?: string; paymentMethod?: string; deliveryZoneCost: number; couponCode?: string; notes?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.name ?? "");
  const [zoneId, setZoneId] = useState(deliveryZones[0]?.id ?? "");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");

  const isPickup = tenant.pickupEnabled && deliveryMethod === "pickup";
  const zoneCost = isPickup
    ? 0
    : deliveryZones.length > 0
      ? deliveryZones.find((z) => z.id === zoneId)?.cost ?? 0
      : tenant.deliveryFixedCost;

  const { discount: promoDiscount, appliedNames: promoNames } = useMemo(
    () =>
      calculatePromotionDiscount(
        cart.map((l) => ({ productId: l.productId, categoryId: l.categoryId, unitPrice: l.unitPrice, quantity: l.quantity })),
        promotions
      ),
    [cart, promotions]
  );

  const matchedCoupon = coupon.trim()
    ? coupons.find((c) => c.code.toLowerCase() === coupon.trim().toLowerCase())
    : undefined;
  const discount = matchedCoupon
    ? Math.min(matchedCoupon.type === "PERCENT" ? cartTotal * (matchedCoupon.value / 100) : matchedCoupon.value, cartTotal)
    : 0;
  const afterDiscount = Math.max(0, cartTotal - promoDiscount - discount);
  const selectedMethod = paymentMethods.find((p) => p.name === paymentMethod);
  const paymentAdjustment = selectedMethod
    ? (selectedMethod.adjustmentType === "FIXED" ? selectedMethod.adjustmentPct : afterDiscount * (selectedMethod.adjustmentPct / 100))
    : 0;
  const total = afterDiscount + paymentAdjustment + zoneCost;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          customerAddress: isPickup ? "Retiro en local" : (address || undefined),
          paymentMethod: paymentMethod || undefined,
          deliveryZoneCost: zoneCost,
          couponCode: coupon || undefined,
          notes: notes || undefined,
        });
      }}
      className="space-y-3"
    >
      <Field label="Nombre"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
      <Field label="Teléfono"><input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></Field>
      <Field label="Email (opcional)"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>

      {tenant.pickupEnabled && (
        <Field label="¿Cómo recibís tu pedido?">
          <div className="flex gap-2">
            {(["delivery", "pickup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDeliveryMethod(m)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={
                  deliveryMethod === m
                    ? { background: tenant.primaryColor, borderColor: tenant.primaryColor, color: "#fff" }
                    : { background: "#fff", borderColor: "#ECE6E2", color: "#6E635E" }
                }
              >
                {m === "delivery" ? "Envío a domicilio" : "Retiro en local"}
              </button>
            ))}
          </div>
        </Field>
      )}

      {!isPickup && (
        <>
          <Field label="Dirección de entrega (opcional)"><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></Field>
          {deliveryZones.length > 0 && (
            <Field label="Zona de envío">
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="input">
                {deliveryZones.map((z) => <option key={z.id} value={z.id}>{z.name} (+{tenant.currency} {z.cost.toFixed(2)})</option>)}
              </select>
            </Field>
          )}
        </>
      )}
      {paymentMethods.length > 0 && (
        <Field label="Forma de pago">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}{p.adjustmentPct !== 0 ? ` (${p.adjustmentPct > 0 ? "+" : ""}${p.adjustmentPct}${p.adjustmentType === "FIXED" ? ` ${tenant.currency}` : "%"})` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div>
        <Field label="Cupón (opcional)"><input value={coupon} onChange={(e) => setCoupon(e.target.value)} className="input" /></Field>
        {coupon.trim() && (
          matchedCoupon ? (
            <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>
              Se aplicó el cupón {matchedCoupon.code}: -{tenant.currency} {discount.toFixed(2)}
            </p>
          ) : (
            <p className="text-xs mt-1" style={{ color: "#DC2626" }}>Cupón no válido</p>
          )
        )}
      </div>
      <Field label="Notas (opcional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} /></Field>

      <div className="border-t pt-3 text-sm space-y-1" style={{ borderColor: "#ECE6E2" }}>
        <div className="flex justify-between"><span style={{ color: "#6E635E" }}>Subtotal</span><span>{tenant.currency} {cartTotal.toFixed(2)}</span></div>
        {promoDiscount > 0 && (
          <div className="flex justify-between" style={{ color: "#059669" }}>
            <span>Promo{promoNames.length > 0 ? ` (${promoNames.join(", ")})` : ""}</span><span>-{tenant.currency} {promoDiscount.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between" style={{ color: "#059669" }}>
            <span>Cupón {matchedCoupon?.code}</span><span>-{tenant.currency} {discount.toFixed(2)}</span>
          </div>
        )}
        {paymentAdjustment !== 0 && (
          <div className="flex justify-between">
            <span style={{ color: "#6E635E" }}>{paymentAdjustment > 0 ? "Recargo" : "Descuento"} por {paymentMethod}</span>
            <span>{paymentAdjustment > 0 ? "+" : "-"}{tenant.currency} {Math.abs(paymentAdjustment).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between"><span style={{ color: "#6E635E" }}>Envío</span><span>{tenant.currency} {zoneCost.toFixed(2)}</span></div>
        <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{tenant.currency} {total.toFixed(2)}</span></div>
      </div>

      {error && <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>}

      <button
        type="submit"
        disabled={submitting || cart.length === 0}
        className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        style={{ background: tenant.primaryColor }}
      >
        {submitting ? "Enviando…" : "Confirmar y enviar por WhatsApp"}
      </button>

      {/* Order details — kept below the submit action so a long cart doesn't push the form down */}
      <details className="pt-2 border-t" style={{ borderColor: "#ECE6E2" }}>
        <summary className="text-sm font-semibold cursor-pointer select-none" style={{ color: "#211B18" }}>
          Detalles del pedido ({cart.reduce((s, l) => s + l.quantity, 0)} {cart.length === 1 ? "producto" : "productos"})
        </summary>
        <div className="mt-3 space-y-2">
          {cart.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0" style={{ borderColor: "#F5F0ED" }}>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: "#211B18" }}>{l.name}</p>
                {l.optionsLabel && <p className="text-xs" style={{ color: "#9C8E87" }}>{l.optionsLabel}</p>}
                {l.appointment && (
                  <p className="text-xs" style={{ color: "#9C8E87" }}>
                    Turno: {l.appointment.date} {l.appointment.time} · {l.appointment.staffName}
                  </p>
                )}
                <p className="text-xs" style={{ color: "#9C8E87" }}>{tenant.currency} {l.unitPrice.toFixed(2)} c/u</p>
              </div>
              {l.appointment ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditAppointment(l)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                    style={{ borderColor: "#ECE6E2", color: "#211B18" }}
                  >
                    Editar
                  </button>
                  <button type="button" onClick={() => onRemoveLine(l.key)} className="text-xs" style={{ color: "#9C8E87" }}>✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0 rounded-full p-1" style={{ background: "#FAF8F6" }}>
                  <button
                    type="button"
                    onClick={() => updateQty(l.key, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold hover:bg-white transition-colors"
                    style={{ color: tenant.primaryColor }}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold" style={{ color: "#211B18" }}>{l.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(l.key, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold hover:bg-white transition-colors"
                    style={{ color: tenant.primaryColor }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          ))}
          {cart.length === 0 && (
            <p className="text-sm" style={{ color: "#9C8E87" }}>El carrito está vacío.</p>
          )}
        </div>
      </details>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1" style={{ color: "#211B18" }}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: "#211B18" }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 -mr-1.5 flex items-center justify-center text-3xl leading-none rounded-full hover:bg-black/5 transition-colors"
            style={{ color: "#9C8E87" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

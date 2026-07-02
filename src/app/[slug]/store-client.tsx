"use client";

import { useMemo, useState } from "react";
import { createOrderAction } from "@/lib/actions/orders";

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
}
interface CategoryVM { id: string; name: string }
interface PaymentMethodVM { id: string; name: string; adjustmentPct: number }
interface DeliveryZoneVM { id: string; name: string; cost: number }
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
  openHours: Record<string, string>;
}
interface CartLine {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  optionsLabel?: string;
  optionsPriceDelta: number;
}

const DAYS: [string, string][] = [
  ["lun","Lunes"],["mar","Martes"],["mie","Miércoles"],["jue","Jueves"],
  ["vie","Viernes"],["sab","Sábado"],["dom","Domingo"],
];

export default function StoreClient({
  tenant, categories, products, paymentMethods, deliveryZones,
}: {
  tenant: TenantVM;
  categories: CategoryVM[];
  products: ProductVM[];
  paymentMethods: PaymentMethodVM[];
  deliveryZones: DeliveryZoneVM[];
}) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerProduct, setPickerProduct] = useState<ProductVM | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [result, setResult] = useState<{ orderId: string; whatsappLink: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () => products.filter((p) => activeCategory === "all" || p.categoryId === activeCategory),
    [products, activeCategory]
  );

  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  function buildLine(product: ProductVM, choices: Record<string, OptionChoice>, quantity: number): CartLine {
    const delta = Object.values(choices).reduce((s, c) => s + c.priceDelta, 0);
    const label = Object.values(choices).map((c) => c.label).join(", ");
    return {
      key: product.id + "::" + label,
      productId: product.id,
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
    setShowCart(true);
  }

  function buyNow(product: ProductVM, choices: Record<string, OptionChoice>, quantity: number) {
    mergeIntoCart(buildLine(product, choices, quantity));
    setPickerProduct(null);
    setShowCart(false);
    setShowCheckout(true);
  }

  /** Add 1 unit directly from card (only for products with no options) */
  function addOne(product: ProductVM) {
    mergeIntoCart(buildLine(product, {}, 1));
    setShowCart(true);
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + delta } : l).filter((l) => l.quantity > 0)
    );
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

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
        {[{ id: "all", name: "Todos" }, ...categories].map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
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

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleProducts.map((p) => {
          const outOfStock = p.stock !== null && p.stock <= 0;
          const hasOptions = p.options.length > 0;
          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl overflow-hidden flex flex-col"
              style={{ border: "1px solid #ECE6E2" }}
            >
              {/* Image / placeholder — clickable to open picker */}
              <button
                className="w-full flex-shrink-0 relative"
                onClick={() => !outOfStock && setPickerProduct(p)}
                disabled={outOfStock}
                aria-label={`Ver ${p.name}`}
              >
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="w-full object-cover" style={{ height: "120px" }} />
                ) : (
                  <div
                    className="w-full flex items-center justify-center"
                    style={{ height: "120px", background: "#F5F0ED" }}
                  >
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
                    onClick={() => {
                      if (outOfStock) return;
                      if (hasOptions) setPickerProduct(p);
                      else addOne(p);
                    }}
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
        })}

        {visibleProducts.length === 0 && (
          <p className="col-span-2 text-sm" style={{ color: "#9C8E87" }}>No hay productos en esta categoría.</p>
        )}
      </div>

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

      {/* Cart modal */}
      {showCart && !showCheckout && (
        <Modal onClose={() => setShowCart(false)} title="Tu pedido">
          {cart.length === 0 ? (
            <p className="text-sm" style={{ color: "#9C8E87" }}>El carrito está vacío.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: "#211B18" }}>{l.name}</p>
                    {l.optionsLabel && <p className="text-xs" style={{ color: "#9C8E87" }}>{l.optionsLabel}</p>}
                    <p className="text-xs" style={{ color: "#9C8E87" }}>{tenant.currency} {l.unitPrice.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(l.key, -1)} className="w-7 h-7 border rounded-lg text-sm" style={{ borderColor: "#ECE6E2" }}>−</button>
                    <span className="w-5 text-center text-sm font-medium">{l.quantity}</span>
                    <button onClick={() => updateQty(l.key, 1)} className="w-7 h-7 border rounded-lg text-sm" style={{ borderColor: "#ECE6E2" }}>+</button>
                  </div>
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
          title={result ? "¡Pedido enviado!" : "Confirmar pedido"}
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
              submitting={submitting}
              error={error}
              onSubmit={async (data) => {
                setSubmitting(true);
                setError(null);
                try {
                  const res = await createOrderAction({
                    tenantId: tenant.id,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
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

/* ── CheckoutForm ── */
function CheckoutForm({
  tenant, cart, cartTotal, paymentMethods, deliveryZones, submitting, error, onSubmit,
}: {
  tenant: TenantVM;
  cart: CartLine[];
  cartTotal: number;
  paymentMethods: PaymentMethodVM[];
  deliveryZones: DeliveryZoneVM[];
  submitting: boolean;
  error: string | null;
  onSubmit: (data: { customerName: string; customerPhone: string; customerAddress?: string; paymentMethod?: string; deliveryZoneCost: number; couponCode?: string; notes?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.name ?? "");
  const [zoneId, setZoneId] = useState(deliveryZones[0]?.id ?? "");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");

  const zoneCost = deliveryZones.length > 0
    ? deliveryZones.find((z) => z.id === zoneId)?.cost ?? 0
    : tenant.deliveryFixedCost;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ customerName: name, customerPhone: phone, customerAddress: address || undefined, paymentMethod: paymentMethod || undefined, deliveryZoneCost: zoneCost, couponCode: coupon || undefined, notes: notes || undefined });
      }}
      className="space-y-3"
    >
      <Field label="Nombre"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
      <Field label="Teléfono"><input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></Field>
      <Field label="Dirección de entrega (opcional)"><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></Field>
      {deliveryZones.length > 0 && (
        <Field label="Zona de envío">
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="input">
            {deliveryZones.map((z) => <option key={z.id} value={z.id}>{z.name} (+{tenant.currency} {z.cost.toFixed(2)})</option>)}
          </select>
        </Field>
      )}
      {paymentMethods.length > 0 && (
        <Field label="Forma de pago">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            {paymentMethods.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Cupón (opcional)"><input value={coupon} onChange={(e) => setCoupon(e.target.value)} className="input" /></Field>
      <Field label="Notas (opcional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} /></Field>

      <div className="border-t pt-3 text-sm space-y-1" style={{ borderColor: "#ECE6E2" }}>
        <div className="flex justify-between"><span style={{ color: "#6E635E" }}>Subtotal</span><span>{tenant.currency} {cartTotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span style={{ color: "#6E635E" }}>Envío</span><span>{tenant.currency} {zoneCost.toFixed(2)}</span></div>
        <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{tenant.currency} {(cartTotal + zoneCost).toFixed(2)}</span></div>
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
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "#9C8E87" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { createPosSaleAction } from "@/lib/actions/orders";
import { calculatePromotionDiscount, type PromotionRule } from "@/lib/promotions";

interface ProductOption {
  id: string;
  categoryId: string | null;
  name: string;
  price: number;
  stock: number | null;
  sku: string | null;
}

interface CartLine {
  productId: string;
  categoryId: string | null;
  name: string;
  price: number;
  stock: number | null;
  qty: number;
}

export default function PosClient({
  currency, products, paymentMethods, showCoupon, promotions,
}: {
  currency: string;
  products: ProductOption[];
  paymentMethods: string[];
  showCoupon: boolean;
  promotions: PromotionRule[];
}) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderId: string; total: number } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
    );
  }, [search, products]);

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);

  const { discount: promoDiscount, appliedNames: promoNames } = useMemo(
    () =>
      calculatePromotionDiscount(
        cart.map((l) => ({ productId: l.productId, categoryId: l.categoryId, unitPrice: l.price, quantity: l.qty })),
        promotions
      ),
    [cart, promotions]
  );

  function addToCart(p: ProductOption) {
    setSuccess(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { productId: p.id, categoryId: p.categoryId, name: p.name, price: p.price, stock: p.stock, qty: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function submitSale() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createPosSaleAction({
          customerName: customerName.trim() || undefined,
          paymentMethod: paymentMethod || undefined,
          couponCode: showCoupon && couponCode.trim() ? couponCode.trim() : undefined,
          notes: notes.trim() || undefined,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.qty })),
        });
        setSuccess(result);
        setCart([]);
        setCustomerName("");
        setCouponCode("");
        setNotes("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar la venta.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Product picker */}
      <div className="bg-white border rounded-2xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre o SKU..."
          className="input"
        />
        <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: "#F5F0ED" }}>
          {filtered.length === 0 && (
            <p className="py-4 text-sm" style={{ color: "#9C8E87" }}>No hay productos que coincidan.</p>
          )}
          {filtered.map((p) => {
            const outOfStock = p.stock !== null && p.stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(p)}
                className="w-full flex items-center justify-between gap-2 py-2.5 text-left disabled:opacity-40"
              >
                <span>
                  <span className="block text-sm font-medium" style={{ color: "#211B18" }}>{p.name}</span>
                  <span className="block text-xs" style={{ color: "#9C8E87" }}>
                    {currency} {p.price.toFixed(2)}
                    {p.stock !== null && ` · stock: ${p.stock}`}
                  </span>
                </span>
                <span className="text-xs font-semibold shrink-0" style={{ color: "#E85A47" }}>
                  {outOfStock ? "Sin stock" : "+ Agregar"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart / checkout */}
      <div className="bg-white border rounded-2xl p-4 space-y-3" style={{ borderColor: "#ECE6E2" }}>
        <h2 className="font-semibold text-sm" style={{ color: "#211B18" }}>Venta actual</h2>

        {cart.length === 0 ? (
          <p className="text-sm" style={{ color: "#9C8E87" }}>Todavía no agregaste productos.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F5F0ED" }}>
            {cart.map((l) => (
              <div key={l.productId} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#211B18" }}>{l.name}</p>
                  <p className="text-xs" style={{ color: "#9C8E87" }}>{currency} {l.price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={l.qty}
                    onChange={(e) => setQty(l.productId, Number(e.target.value))}
                    className="input !w-16 text-sm text-center"
                  />
                  <button type="button" onClick={() => removeLine(l.productId)} className="text-xs" style={{ color: "#9C8E87" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-1" style={{ color: "#211B18" }}>
          <span>Subtotal</span>
          <span>{currency} {subtotal.toFixed(2)}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex items-center justify-between text-sm" style={{ color: "#059669" }}>
            <span>Promo{promoNames.length > 0 ? ` (${promoNames.join(", ")})` : ""}</span>
            <span>-{currency} {promoDiscount.toFixed(2)}</span>
          </div>
        )}

        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Cliente (opcional, default: Venta mostrador)"
          className="input"
        />

        {paymentMethods.length > 0 && (
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            <option value="">Método de pago (opcional)</option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}

        {showCoupon && (
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Cupón (opcional)"
            className="input"
          />
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          className="input"
          rows={2}
        />

        {error && <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>}
        {success && (
          <p className="text-sm" style={{ color: "#059669" }}>
            Venta registrada · Total {currency} {success.total.toFixed(2)} · #{success.orderId.slice(0, 8)}
          </p>
        )}

        <button
          type="button"
          disabled={pending || cart.length === 0}
          onClick={submitSale}
          className="w-full text-white px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
          style={{ background: "#211B18" }}
        >
          {pending ? "Registrando..." : "Cobrar / Registrar venta"}
        </button>
      </div>
    </div>
  );
}

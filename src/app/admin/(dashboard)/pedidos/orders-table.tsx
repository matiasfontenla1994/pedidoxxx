"use client";

import { useState, useTransition } from "react";
import { updateOrderStatusAction, updateOrderItemsAction } from "@/lib/actions/orders";
import { buildWhatsappLink, buildStatusChangeMessage } from "@/lib/whatsapp";
import type { Order } from "@/lib/data/types";

const STATUSES = ["NEW", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"] as const;
const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  IN_PROGRESS: "En preparación",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

type SortKey = "date_desc" | "date_asc" | "total_desc" | "total_asc";

interface OrderItemVM {
  productId: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  optionsLabel?: string | null;
}

interface OrderVM {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  subtotal: number;
  discount: number;
  promoDiscount: number;
  promoLabel: string | null;
  paymentAdjustment: number;
  deliveryCost: number;
  total: number;
  status: string;
  source: string;
  paymentMethod: string | null;
  couponCode: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItemVM[];
}

interface ProductOption { id: string; name: string; price: number }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function toOrderVM(o: Order): OrderVM {
  return {
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
  };
}

export default function OrdersTable({
  orders, currency, products, variant = "full",
}: {
  orders: OrderVM[];
  currency: string;
  products: ProductOption[];
  variant?: "full" | "compact";
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const [pending, startTransition] = useTransition();
  const [localOrders, setLocalOrders] = useState(orders);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(startOfMonthStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [notifyPrompt, setNotifyPrompt] = useState<{
    customerName: string; customerPhone: string; status: string; orderId: string;
  } | null>(null);

  let visible = localOrders;
  if (variant === "full") {
    visible = filter === "ALL" ? visible : visible.filter((o) => o.status === filter);

    const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
    const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
    visible = visible.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });

    visible = [...visible].sort((a, b) => {
      switch (sortKey) {
        case "date_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "total_desc": return b.total - a.total;
        case "total_asc": return a.total - b.total;
        case "date_desc":
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }

  const openOrder = localOrders.find((o) => o.id === openOrderId) ?? null;

  function changeStatus(id: string, status: string) {
    const order = localOrders.find((o) => o.id === id);
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    startTransition(() => {
      updateOrderStatusAction(id, status as never);
    });
    if (order) {
      setNotifyPrompt({ customerName: order.customerName, customerPhone: order.customerPhone, status, orderId: id });
    }
  }

  function handleItemsSaved(updated: Order) {
    const vm = toOrderVM(updated);
    setLocalOrders((prev) => prev.map((o) => (o.id === vm.id ? vm : o)));
  }

  return (
    <div className="space-y-3">
      {variant === "full" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs" style={{ color: "#6E635E" }}>
              Desde
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input mt-0.5 text-sm !w-auto"
              />
            </label>
            <label className="text-xs" style={{ color: "#6E635E" }}>
              Hasta
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input mt-0.5 text-sm !w-auto"
              />
            </label>
            <button
              onClick={() => { setDateFrom(startOfMonthStr()); setDateTo(todayStr()); }}
              className="text-xs underline text-zinc-500 pb-2"
            >
              Mes actual
            </button>
            <label className="text-xs ml-auto" style={{ color: "#6E635E" }}>
              Ordenar por
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="input mt-0.5 text-sm !w-auto"
              >
                <option value="date_desc">Fecha: más reciente</option>
                <option value="date_asc">Fecha: más antigua</option>
                <option value="total_desc">Monto: mayor a menor</option>
                <option value="total_asc">Monto: menor a mayor</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-full text-sm border ${filter === "ALL" ? "bg-zinc-900 text-white" : "bg-white"}`}
            >
              Todos
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-sm border ${filter === s ? "bg-zinc-900 text-white" : "bg-white"}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="bg-white border rounded-xl divide-y">
        {visible.length === 0 && <p className="p-4 text-sm text-zinc-500">No hay pedidos en este rango.</p>}
        {visible.map((o) => (
          <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-medium text-sm">
                {o.customerName} · #{o.id.slice(0, 8)}
                {o.source === "POS" && (
                  <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-900 text-white align-middle">
                    Mostrador
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
              </p>
              <p className="text-xs text-zinc-400">
                {formatDate(o.createdAt)} · {o.paymentMethod ?? "sin especificar"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {currency} {o.total.toFixed(2)}
              </span>
              <select
                value={o.status}
                disabled={pending}
                onChange={(e) => changeStatus(o.id, e.target.value)}
                className="input !w-auto text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setOpenOrderId(o.id)}
                className="px-3 py-1.5 rounded-lg text-sm border font-medium whitespace-nowrap"
                style={{ borderColor: "#ECE6E2", color: "#211B18" }}
              >
                Ver pedido
              </button>
            </div>
          </div>
        ))}
      </div>

      {openOrder && (
        <OrderDetailModal
          order={openOrder}
          currency={currency}
          products={products}
          pending={pending}
          onChangeStatus={(status) => changeStatus(openOrder.id, status)}
          onItemsSaved={handleItemsSaved}
          onClose={() => setOpenOrderId(null)}
        />
      )}

      {notifyPrompt && (
        <NotifyStatusModal
          prompt={notifyPrompt}
          onClose={() => setNotifyPrompt(null)}
        />
      )}
    </div>
  );
}

function NotifyStatusModal({
  prompt, onClose,
}: {
  prompt: { customerName: string; customerPhone: string; status: string; orderId: string };
  onClose: () => void;
}) {
  const message = buildStatusChangeMessage(prompt.customerName, prompt.orderId, prompt.status);
  const whatsappLink = buildWhatsappLink(prompt.customerPhone, message);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-3">
        <h3 className="font-bold text-base" style={{ color: "#211B18" }}>
          El pedido pasó a &quot;{STATUS_LABEL[prompt.status]}&quot;
        </h3>
        <p className="text-sm" style={{ color: "#6E635E" }}>
          ¿Querés avisarle a {prompt.customerName} por WhatsApp sobre este cambio de estado?
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#ECE6E2", color: "#6E635E" }}
          >
            No notificar
          </button>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white text-center"
            style={{ background: "#25D366" }}
          >
            Sí, enviar WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order, currency, products, pending, onChangeStatus, onItemsSaved, onClose,
}: {
  order: OrderVM;
  currency: string;
  products: ProductOption[];
  pending: boolean;
  onChangeStatus: (status: string) => void;
  onItemsSaved: (updated: Order) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<OrderItemVM[]>(order.items);
  const [addProductId, setAddProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(items) !== JSON.stringify(order.items);

  const whatsappLink = buildWhatsappLink(
    order.customerPhone,
    `Hola ${order.customerName}, te contacto por tu pedido #${order.id.slice(0, 8)}.`
  );
  const mailtoLink = order.customerEmail
    ? `mailto:${order.customerEmail}?subject=${encodeURIComponent(`Tu pedido #${order.id.slice(0, 8)}`)}`
    : null;

  function updateQty(index: number, delta: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it)).filter((it) => it.quantity > 0)
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    const product = products.find((p) => p.id === addProductId);
    if (!product) return;
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id && !it.optionsLabel);
      if (existing) {
        return prev.map((it) => (it === existing ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, optionsLabel: null }];
    });
    setAddProductId("");
  }

  async function saveItems() {
    setSaving(true);
    try {
      const updated = await updateOrderItemsAction(
        order.id,
        items.map((it) => ({
          productId: it.productId,
          name: it.name,
          unitPrice: it.unitPrice ?? 0,
          quantity: it.quantity,
          optionsLabel: it.optionsLabel,
        }))
      );
      onItemsSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">Pedido #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-zinc-400">×</button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Estado</p>
            <select
              value={order.status}
              disabled={pending}
              onChange={(e) => onChangeStatus(e.target.value)}
              className="input !w-auto"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Cliente</p>
            <p className="font-medium">{order.customerName}</p>
            {order.customerAddress && <p className="text-zinc-500">{order.customerAddress}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ background: "#25D366" }}
              >
                Enviar WhatsApp ({order.customerPhone})
              </a>
              {mailtoLink && (
                <a
                  href={mailtoLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: "#ECE6E2", color: "#211B18" }}
                >
                  Enviar mail ({order.customerEmail})
                </a>
              )}
            </div>
          </div>

          {/* Items — editable */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
              Productos <span className="normal-case font-normal">(editable)</span>
            </p>
            <div className="divide-y border rounded-lg" style={{ borderColor: "#ECE6E2" }}>
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.optionsLabel && <p className="text-xs text-zinc-500">{item.optionsLabel}</p>}
                    {item.unitPrice !== undefined && (
                      <p className="text-xs text-zinc-400">{currency} {item.unitPrice.toFixed(2)} c/u</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: "#FAF8F6" }}>
                      <button onClick={() => updateQty(i, -1)} className="w-6 h-6 rounded-full text-sm font-semibold hover:bg-white">−</button>
                      <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(i, 1)} className="w-6 h-6 rounded-full text-sm font-semibold hover:bg-white">+</button>
                    </div>
                    <button onClick={() => removeItem(i)} className="text-xs font-medium" style={{ color: "#DC2626" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-3 py-3 text-zinc-500 text-sm">Sin productos.</p>
              )}
            </div>

            {products.length > 0 && (
              <div className="flex gap-2 mt-2">
                <select value={addProductId} onChange={(e) => setAddProductId(e.target.value)} className="input text-sm">
                  <option value="">Agregar producto…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {currency} {p.price.toFixed(2)}</option>
                  ))}
                </select>
                <button
                  onClick={addItem}
                  disabled={!addProductId}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border shrink-0 disabled:opacity-40"
                  style={{ borderColor: "#ECE6E2", color: "#211B18" }}
                >
                  Agregar
                </button>
              </div>
            )}

            {dirty && (
              <button
                onClick={saveItems}
                disabled={saving}
                className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#211B18" }}
              >
                {saving ? "Guardando…" : "Guardar cambios en el pedido"}
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1" style={{ borderColor: "#ECE6E2" }}>
            <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{currency} {order.subtotal.toFixed(2)}</span></div>
            {order.promoDiscount > 0 && (
              <div className="flex justify-between"><span className="text-zinc-500">Promo{order.promoLabel ? ` (${order.promoLabel})` : ""}</span><span>-{currency} {order.promoDiscount.toFixed(2)}</span></div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between"><span className="text-zinc-500">Descuento{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>-{currency} {order.discount.toFixed(2)}</span></div>
            )}
            {order.paymentAdjustment !== 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">{order.paymentAdjustment > 0 ? "Recargo" : "Descuento"} por forma de pago</span>
                <span>{order.paymentAdjustment > 0 ? "+" : "-"}{currency} {Math.abs(order.paymentAdjustment).toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCost > 0 && (
              <div className="flex justify-between"><span className="text-zinc-500">Envío</span><span>{currency} {order.deliveryCost.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{currency} {order.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-zinc-400 pt-1"><span>Forma de pago</span><span>{order.paymentMethod ?? "sin especificar"}</span></div>
            <div className="flex justify-between text-xs text-zinc-400"><span>Fecha</span><span>{formatDate(order.createdAt)}</span></div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notas</p>
              <p className="text-zinc-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

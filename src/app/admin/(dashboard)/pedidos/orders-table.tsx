"use client";

import { useState, useTransition } from "react";
import { updateOrderStatusAction } from "@/lib/actions/orders";

const STATUSES = ["NEW", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"] as const;
const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  IN_PROGRESS: "En preparación",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

interface OrderVM {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

export default function OrdersTable({ orders, currency }: { orders: OrderVM[]; currency: string }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [pending, startTransition] = useTransition();
  const [localOrders, setLocalOrders] = useState(orders);

  const visible = filter === "ALL" ? localOrders : localOrders.filter((o) => o.status === filter);

  function changeStatus(id: string, status: string) {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    startTransition(() => {
      updateOrderStatusAction(id, status as never);
    });
  }

  return (
    <div className="space-y-3">
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

      <div className="bg-white border rounded-xl divide-y">
        {visible.length === 0 && <p className="p-4 text-sm text-zinc-500">No hay pedidos en este estado.</p>}
        {visible.map((o) => (
          <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-medium text-sm">
                {o.customerName} · #{o.id.slice(0, 8)}
              </p>
              <p className="text-xs text-zinc-500">
                {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(o.createdAt).toLocaleString("es-AR")} · {o.paymentMethod ?? "sin especificar"}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

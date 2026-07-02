"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getUnseenOrdersAction, markAllSeenAction } from "@/lib/actions/orders";

interface OrderNotif {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
}

export default function NewOrderWatcher() {
  const [orders, setOrders] = useState<OrderNotif[]>([]);
  const [visible, setVisible] = useState(false);

  const poll = useCallback(async () => {
    try {
      const unseen = await getUnseenOrdersAction();
      if (unseen.length > 0) {
        setOrders(unseen);
        setVisible(true);
      }
    } catch {
      // polling silently fails if session expires
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [poll]);

  async function dismiss() {
    await markAllSeenAction();
    setVisible(false);
    setOrders([]);
  }

  if (!visible || orders.length === 0) return null;

  const count = orders.length;
  const latest = orders[0];

  return (
    <div
      className="fixed bottom-6 right-4 z-50 w-full max-w-[340px]"
      style={{ animation: "toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#1E1B1A", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Green accent bar */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, #34D399, #10B981)" }} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Pulsing icon */}
            <div
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
              style={{
                background: "rgba(52,211,153,0.15)",
                animation: "orderPulse 2s ease-in-out infinite",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                style={{ color: "#34D399" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                {count === 1 ? "¡Nuevo pedido!" : `¡${count} pedidos nuevos!`}
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: "#9C8E87" }}>
                {count === 1
                  ? `${latest.customer_name} · $${latest.total.toFixed(2)}`
                  : `${latest.customer_name} y ${count - 1} más`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Link
              href="/admin/pedidos"
              onClick={dismiss}
              className="flex-1 text-white text-xs font-semibold rounded-xl px-3 py-2.5 text-center transition-colors"
              style={{ background: "#E85A47" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#C2402E")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#E85A47")}
            >
              Ver pedidos
            </Link>
            <button
              onClick={dismiss}
              className="text-xs px-3 py-2.5 rounded-xl transition-colors"
              style={{ color: "#6E635E" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#9C8E87"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#6E635E"; e.currentTarget.style.background = ""; }}
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

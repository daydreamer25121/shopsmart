"use client";

import { useEffect, useMemo, useState } from "react";
import { io as createSocket } from "socket.io-client";

type Order = {
  _id: string;
  total: number;
  status: string;
  razorpayId: string | null;
  createdAt?: string;
  products: {
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }[];
};

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    const json = JSON.parse(decoded);
    return json.sub ? String(json.sub) : null;
  } catch {
    return null;
  }
}

export default function OrdersPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeMsg, setRealtimeMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("shopsmart_token"));
    } catch {
      setToken(null);
    }
  }, []);

  async function loadOrders() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/orders/mine`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setOrders((json.orders || []) as Order[]);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const userId = decodeJwtSub(token);
    if (!userId) return;

    const socket = createSocket(baseUrl, { transports: ["websocket"] });
    socket.emit("register", userId);
    socket.on("order:paid", (evt: any) => {
      if (evt?.orderId) {
        setRealtimeMsg(`Order paid: ${evt.orderId}`);
        loadOrders();
      }
    });

    return () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totals = useMemo(() => orders.reduce((sum, o) => sum + Number(o.total || 0), 0), [orders]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-accent">Your Orders</h1>
      <p className="mt-2 text-sm text-white/70">Order history from Razorpay payments.</p>

      {realtimeMsg ? <div className="mt-3 text-sm text-accent">{realtimeMsg}</div> : null}
      {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
      {loading ? <div className="mt-3 text-sm text-white/60">Loading...</div> : null}

      {!orders.length && !loading ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          No orders yet.{" "}
          <a className="text-accent underline" href="/shop">
            Start shopping
          </a>
          .
        </div>
      ) : null}

      {orders.length ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Total spend: ₹{totals.toFixed(2)}
          </div>

          {orders.map((o) => (
            <div key={o._id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">Order {o._id}</div>
                  <div className="text-xs text-white/50">Status: {o.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/90">₹{Number(o.total || 0).toFixed(2)}</div>
                  <div className="text-xs text-white/50">{o.razorpayId ? `Razorpay: ${o.razorpayId}` : ""}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {(o.products || []).map((p, idx) => (
                  <div key={`${o._id}-${idx}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80">
                    <div className="break-all pr-3">{p.productId}</div>
                    <div>
                      Qty {p.quantity} · ₹{Number(p.priceAtPurchase || 0).toFixed(2)} each
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}


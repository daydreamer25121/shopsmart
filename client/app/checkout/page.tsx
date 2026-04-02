"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CartItem, clearCart, loadCart } from "../../lib/cart";
import { io as createSocket } from "socket.io-client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type CreateOrderResponse = {
  orderId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
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

export default function CheckoutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createRes, setCreateRes] = useState<CreateOrderResponse | null>(null);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  const [socketStatus, setSocketStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("shopsmart_token"));
      setItems(loadCart());
    } catch {
      setToken(null);
      setItems([]);
    }
  }, []);

  const amountINR = useMemo(() => {
    if (!createRes) return null;
    return (createRes.amount / 100).toFixed(2);
  }, [createRes]);

  async function loadRazorpayScript() {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpay = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.head.appendChild(script);
    });
  }

  useEffect(() => {
    // Optional real-time update: listen for order paid and show a message.
    if (!token) return;
    const userId = decodeJwtSub(token);
    if (!userId) return;

    const socket = createSocket(baseUrl, { transports: ["websocket"] });
    socket.emit("register", userId);
    socket.on("order:paid", (evt: any) => {
      if (evt?.orderId) setSocketStatus(`Order paid (real-time): ${evt.orderId}`);
    });

    return () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
  }, [token, baseUrl]);

  async function createOrderAndPay() {
    setError(null);
    setOrderResult(null);
    setCreateRes(null);
    setCreating(true);

    try {
      if (!token) throw new Error("Login required (use chatbot login).");
      if (!items.length) throw new Error("Cart is empty.");

      const res = await fetch(`${baseUrl}/api/payments/create-order`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CreateOrderResponse;
      setCreateRes(json);

      await loadRazorpayScript();

      const options = {
        key: json.keyId,
        amount: json.amount,
        currency: json.currency,
        name: "ShopSmart",
        order_id: json.razorpayOrderId,
        handler: async function (response: any) {
          setVerifying(true);
          setError(null);
          try {
            const verifyRes = await fetch(`${baseUrl}/api/payments/verify-payment`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: json.orderId,
              }),
            });

            if (!verifyRes.ok) {
              const text = await verifyRes.text().catch(() => "");
              throw new Error(text || `HTTP ${verifyRes.status}`);
            }
            const verifyJson = await verifyRes.json();
            const paidOrderId = verifyJson?.orderId ? String(verifyJson.orderId) : null;
            setOrderResult(paidOrderId ? `Payment successful. Order: ${paidOrderId}` : "Payment successful.");

            clearCart();
            setItems([]);
            // Prefer server-verified order result page.
            router.push("/orders");
          } catch (e: any) {
            setError(e?.message || "Payment verification failed");
          } finally {
            setVerifying(false);
          }
        },
        theme: { color: "#FF7A18" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-accent">Checkout</h1>
      <p className="mt-2 text-sm text-white/70">Razorpay checkout flow (test mode). Inventory will decrement on success.</p>

      {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      {socketStatus && <div className="mt-4 text-sm text-accent">{socketStatus}</div>}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white/90">Items</h2>
        <div className="mt-3 space-y-2">
          {items.length ? (
            items.map((it) => (
              <div key={it.productId} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                <div className="break-all pr-3">{it.productId}</div>
                <div className="text-white/80">Qty: {it.quantity}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/60">Cart is empty.</div>
          )}
        </div>

        {createRes ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/80">
            Razorpay amount: INR {amountINR} (₹{createRes.amount / 100})
          </div>
        ) : null}

        <button
          onClick={createOrderAndPay}
          disabled={creating || verifying || !items.length}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {creating ? "Creating order..." : verifying ? "Verifying..." : "Pay with Razorpay"}
        </button>
      </div>
    </main>
  );
}


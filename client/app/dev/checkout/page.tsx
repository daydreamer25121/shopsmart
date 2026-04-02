"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function CheckoutDevPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const [token, setToken] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>(""); // paste Product._id
  const [qty, setQty] = useState<number>(1);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createRes, setCreateRes] = useState<CreateOrderResponse | null>(null);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("shopsmart_token"));
    } catch {
      setToken(null);
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

  async function createOrderAndPay() {
    setError(null);
    setOrderResult(null);
    setCreating(true);
    setCreateRes(null);

    try {
      if (!token) throw new Error("Login required (use chatbot login).");
      if (!productId) throw new Error("productId is required (paste Product._id).");
      if (!Number.isFinite(qty) || qty < 1) throw new Error("Quantity must be >= 1.");

      const res = await fetch(`${baseUrl}/api/payments/create-order`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [{ productId, quantity: qty }],
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
            if (verifyJson.success) {
              setOrderResult(`Payment successful. Order: ${verifyJson.orderId}`);
            } else {
              setOrderResult("Payment verification returned no success.");
            }
          } catch (e: any) {
            setError(e?.message || "Payment verification failed");
          } finally {
            setVerifying(false);
          }
        },
        theme: {
          color: "#FF7A18",
        },
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
      <h1 className="text-2xl font-bold text-accent">Razorpay Checkout (Demo)</h1>
      <p className="mt-2 text-sm text-white/70">
        Uses Razorpay test mode. Paste a `products._id` from seeded data and place an order.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="block text-xs text-white/60">productId</label>
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
          placeholder="Paste Product._id"
        />

        <label className="mt-4 block text-xs text-white/60">Quantity</label>
        <input
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          type="number"
          min={1}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
        />

        <button
          onClick={createOrderAndPay}
          disabled={creating || verifying}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {creating ? "Creating Razorpay order..." : verifying ? "Verifying payment..." : "Checkout"}
        </button>
      </div>

      {createRes ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm text-white/80">Order ready</div>
          <div className="mt-2 text-xs text-white/60">
            Amount: INR {amountINR} · Razorpay order: {createRes.razorpayOrderId}
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div> : null}
      {orderResult ? <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90">{orderResult}</div> : null}
    </main>
  );
}


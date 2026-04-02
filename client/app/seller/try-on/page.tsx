"use client";

import { useEffect, useState } from "react";

type SellerProduct = {
  _id: string;
  name: string;
  category: string;
  tryOnEligible: boolean;
  glbModel?: string | null;
};

export default function SellerTryOnPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/seller/tryon/products`, {
        headers: {
          // In a full app, attach JWT here.
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProducts(json.products || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // This will 401 until you wire in real auth + JWT to the headers.
    // Left as a scaffold to show how SELLER would manage try-on assets.
  }, []);

  async function onGenerate(productId: string) {
    try {
      const res = await fetch(`${baseUrl}/api/seller/tryon/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // TODO: attach Authorization: Bearer <token> once auth UI is wired.
        },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId ? { ...p, glbModel: json.glbModel, tryOnEligible: json.tryOnEligible } : p
        )
      );
    } catch (e: any) {
      setError(e?.message || "Failed to generate GLB");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-accent">Seller Try-On Assets (Demo)</h1>
      <p className="mt-2 text-sm text-white/70">
        This scaffold shows how a seller could generate 3D models for products. Attach JWT auth and call the backend
        endpoints to make it live.
      </p>

      {loading && <p className="mt-4 text-sm text-white/60">Loading products...</p>}
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-4 space-y-3">
        {products.map((p) => (
          <div
            key={p._id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <div>
              <div className="font-semibold text-white/90">{p.name}</div>
              <div className="text-xs text-white/50">
                {p.category} · {p.tryOnEligible ? "Try-On enabled" : "Try-On disabled"}
              </div>
              {p.glbModel && <div className="mt-1 text-xs text-white/40">GLB: {p.glbModel}</div>}
            </div>
            <button
              onClick={() => onGenerate(p._id)}
              className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-black"
            >
              Generate 3D Model
            </button>
          </div>
        ))}
        {!products.length && !loading && (
          <p className="text-sm text-white/60">
            No products loaded in this demo yet. Once auth + product APIs are wired, they’ll appear here.
          </p>
        )}
      </div>
    </main>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TryOnViewport } from "../../../components/tryOn/TryOnViewport";
import { addToCart } from "../../../lib/cart";

type Product = {
  _id: string;
  name: string;
  category: string;
  images: string[];
  tryOnEligible: boolean;
  colours: { name: string; hex: string; bestForSkinTone?: string[] }[];
  price?: number;
  inventory?: number;
};

async function fetchProduct(id: string): Promise<Product | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/products/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  const p = json.product as Product;
  return p;
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [showTryOn, setShowTryOn] = useState(false);
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct(id).then(setProduct);
  }, [id]);

  useEffect(() => {
    // Allow deep-link to open try-on directly: /product/:id?tryOn=1
    if (searchParams?.get("tryOn") === "1") setShowTryOn(true);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!product) {
    return (
      <main className="p-6">
        <p className="text-sm text-white/60">Loading product...</p>
      </main>
    );
  }

  const canBuy = (product.inventory ?? 0) > 0;
  const canTryOn = Boolean(product.tryOnEligible);
  const priceINR = typeof product.price === "number" ? product.price : null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-accent">{product.name}</h1>
      <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{product.category}</p>

      <div className="mt-3 flex items-center gap-3">
        {priceINR !== null ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/90">
            Price: ₹{priceINR}
          </div>
        ) : null}
        <div className="text-sm text-white/60">Inventory: {product.inventory ?? 0}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={() => setShowTryOn((v) => !v)}
          disabled={!canTryOn}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {showTryOn ? "Close Try-On" : "Try On"}
        </button>

        <button
          onClick={() => {
            if (!canBuy) {
              setToast("Out of stock");
              return;
            }
            addToCart(product._id, 1);
            setToast("Added to cart");
          }}
          disabled={!canBuy}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add to Cart
        </button>
      </div>

      {toast && <div className="mt-4 text-sm text-accent">{toast}</div>}

      {skinTone && (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white/90">
            Best for your skin tone: <span className="text-accent">{skinTone}</span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colours
              .filter((c) => (c.bestForSkinTone || []).includes(skinTone))
              .map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs"
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.hex }} />
                  <span className="text-white/90">
                    {c.name} <span className="ml-1 rounded bg-accent/20 px-1 text-[10px] text-accent">Best match</span>
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {showTryOn && (
        <div className="mt-6">
          {/* In a full build, TryOnViewport would lift skin tone into global/user state.
              For this demo, we simply let it detect tone and you can manually map it here later. */}
          <TryOnViewport />
        </div>
      )}
    </main>
  );
}


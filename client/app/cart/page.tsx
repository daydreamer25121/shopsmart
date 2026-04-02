"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CartItem, clearCart, loadCart, removeFromCart, setQty } from "../../lib/cart";

type CartProduct = {
  _id: string;
  name: string;
  category: string;
  images: string[];
  price?: number;
  inventory?: number;
};

type EnrichedCartItem = CartItem & { product?: CartProduct | null };

export default function CartPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Map<string, CartProduct>>(new Map());

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    async function loadProducts(ids: string[]) {
      if (!ids.length) {
        setProducts(new Map());
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const unique = Array.from(new Set(ids));
        const fetched = await Promise.all(
          unique.map(async (id) => {
            const res = await fetch(`${baseUrl}/api/products/${id}`);
            if (!res.ok) return null;
            const json = await res.json();
            return json.product as CartProduct;
          })
        );
        const nextMap = new Map<string, CartProduct>();
        for (const p of fetched) {
          if (p?._id) nextMap.set(p._id, p);
        }
        setProducts(nextMap);
      } catch (e: any) {
        setError(e?.message || "Failed to load cart products");
      } finally {
        setLoading(false);
      }
    }
    loadProducts(items.map((x) => x.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const enriched: EnrichedCartItem[] = useMemo(() => {
    return items.map((it) => ({ ...it, product: products.get(it.productId) || null }));
  }, [items, products]);

  const total = useMemo(() => {
    return enriched.reduce((sum, it) => sum + (Number(it.product?.price || 0) * Number(it.quantity || 1)), 0);
  }, [enriched]);

  const totalPaise = useMemo(() => Math.round(total * 100), [total]);

  async function onClear() {
    clearCart();
    setItems([]);
    setProducts(new Map());
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-accent">Your Cart</h1>

      {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
      {loading && <div className="mt-3 text-sm text-white/60">Loading product details...</div>}

      {!items.length && !loading ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Cart is empty.{" "}
          <Link className="text-accent underline" href="/shop">
            Browse products
          </Link>
          .
        </div>
      ) : null}

      {items.length ? (
        <div className="mt-5 space-y-3">
          {enriched.map((it) => (
            <div
              key={it.productId}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-lg bg-black/40">
                  {it.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.product.images[0]} alt={it.product.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90">{it.product?.name || it.productId}</div>
                  <div className="text-xs text-white/50">
                    {it.product?.category || "—"} · ₹{it.product?.price ?? 0}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItems(setQty(it.productId, (it.quantity || 1) - 1))}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                >
                  -
                </button>
                <div className="min-w-[2.5rem] text-center text-sm text-white/90">{it.quantity}</div>
                <button
                  onClick={() => setItems(setQty(it.productId, (it.quantity || 1) + 1))}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                >
                  +
                </button>
                <button
                  onClick={() => setItems(removeFromCart(it.productId))}
                  className="ml-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-white/70">Total</div>
              <div className="text-white/90">₹{total.toFixed(2)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button onClick={onClear} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                Clear
              </button>
              <Link
                href="/checkout"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
              >
                Checkout (₹{total.toFixed(2)})
              </Link>
            </div>
            <div className="mt-2 text-xs text-white/50">Amount in paise: {totalPaise}</div>
          </div>
        </div>
      ) : null}
    </main>
  );
}


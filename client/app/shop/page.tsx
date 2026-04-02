// client/app/shop/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addToCart } from '../../lib/cart';

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  tryOnEligible?: boolean;
  stock?: number;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/products?limit=12')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setProducts(data.products || data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Shop fetch error:", err);
        setError(err.message || "Failed to load products");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) {
    return <div className="p-10 text-center text-white/70">Loading products from backend...</div>;
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <p className="text-sm text-white/60">Make sure backend is running and products exist in MongoDB.</p>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Shop</h1>
      <p className="text-white/70 mb-8">Browse products and try-on eligible items.</p>
      {toast ? (
        <div className="mb-6 text-sm text-accent rounded-md border border-white/10 bg-white/5 p-3 text-center">
          {toast}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length > 0 ? (
          products.map((product) => (
            <div 
              key={product._id} 
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-accent transition-all"
            >
              <div className="h-52 bg-zinc-800 flex items-center justify-center">
                <img 
                  src={(product as any).images?.[0] || (product as any).image || "https://via.placeholder.com/300?text=No+Image"} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                <p className="text-accent text-xl font-bold mt-2">₹{product.price}</p>
                <p className="text-xs text-white/60 mt-1 uppercase tracking-widest">{product.category}</p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      addToCart(product._id, 1);
                      setToast("Added to cart");
                    }}
                    className="flex-1 bg-white text-black py-2.5 rounded-xl text-sm font-medium hover:bg-white/90"
                  >
                    Add to Cart
                  </button>
                  {product.tryOnEligible && (
                    <Link
                      href={`/product/${product._id}?tryOn=1`}
                      className="flex-1 border border-white/40 py-2.5 rounded-xl text-sm text-center hover:bg-white/10"
                    >
                      Try On
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 text-white/60">
            No products found.<br />Run the seed script to add sample data.
          </div>
        )}
      </div>
    </main>
  );
}
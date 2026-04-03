"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanningStudio } from "../../../components/seller/ScanningStudio";

type SellerProduct = {
  _id: string;
  name: string;
  category: string;
  tryOnEligible: boolean;
  glbModel?: string | null;
  images?: string[];
};

export default function SellerTryOnPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [status, setStatus] = useState<"LIST" | "SCANNING">("LIST");
  const [activeProduct, setActiveProduct] = useState<SellerProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  async function load() {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/api/seller/tryon/products`, {
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProducts(json.products || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onScan(product: SellerProduct) {
    setActiveProduct(product);
    setStatus("SCANNING");
  }

  function handleScanComplete(glbModel: string) {
    if (!activeProduct) return;
    setProducts((prev) =>
      prev.map((p) =>
        p._id === activeProduct._id ? { ...p, glbModel, tryOnEligible: true } : p
      )
    );
    setStatus("LIST");
    setActiveProduct(null);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-black uppercase tracking-widest text-accent">
              Seller Portal
            </span>
            <span className="text-white/20">/</span>
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">3D Inventory</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">AI Product Scanning</h1>
          <p className="mt-2 text-white/50 max-w-2xl">
            Convert your 2D product photos into high-fidelity 3D models for the ShopSmart virtual try-on experience.
          </p>
        </header>

        {status === "LIST" && products.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p._id}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:border-white/20 transition-all"
            >
              <div className="aspect-square relative overflow-hidden bg-white/5">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-80 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 text-4xl">👕</div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest">{p.category}</p>
                  </div>
                  {p.tryOnEligible ? (
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-md font-bold border border-green-500/20">3D READY</span>
                  ) : (
                    <span className="text-[10px] bg-white/5 text-white/30 px-2 py-1 rounded-md font-bold">2D ONLY</span>
                  )}
                </div>

                {p.tryOnEligible ? (
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] text-white/50 font-medium truncate">Asset: {p.glbModel?.split('/').pop()}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/30 mb-6 italic">No 3D asset found. Run AI scan to generate.</p>
                )}

                <button
                  onClick={() => onScan(p)}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition transform active:scale-[0.98] ${
                    p.tryOnEligible 
                    ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10" 
                    : "bg-accent text-black hover:bg-orange-600 shadow-xl shadow-accent/10"
                  }`}
                >
                  {p.tryOnEligible ? "Re-Scan Geometry" : "Start AI 3D Scan"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!products.length && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px]">
             <p className="text-white/30 text-sm italic font-medium">No products found. Start by adding products to your inventory.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {status === "SCANNING" && activeProduct && (
          <ScanningStudio 
            productId={activeProduct._id}
            productName={activeProduct.name}
            category={activeProduct.category}
            onClose={() => setStatus("LIST")}
            onComplete={handleScanComplete}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

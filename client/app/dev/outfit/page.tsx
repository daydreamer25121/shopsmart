"use client";

import { useState } from "react";

type SuggestedProduct = {
  _id: string;
  name: string;
  category: string;
  images?: string[];
  tryOnEligible?: boolean;
};

export default function OutfitDevPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const [occasion, setOccasion] = useState("Casual");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [products, setProducts] = useState<SuggestedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setError(null);
    setMessage("");
    setProducts([]);
    try {
      const res = await fetch(`${baseUrl}/api/outfits/suggest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMessage(json.message || "");
      setProducts(json.products || []);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-accent">Outfit Suggest (Demo)</h1>
      <p className="mt-2 text-sm text-white/70">
        Picks a complete outfit for an occasion (Claude if configured, fallback otherwise) and maps it to real products
        in MongoDB.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="block text-xs text-white/60">Occasion</label>
        <select
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          {["Casual", "Formal", "Wedding", "Party", "Sports", "Festive"].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs text-white/60">Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          placeholder="e.g., prefer dark colours, budget friendly"
        />

        <button
          onClick={suggest}
          disabled={loading}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Suggest outfit"}
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}

      {message && (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">{message}</div>
      )}

      {products.length > 0 && (
        <div className="mt-4 space-y-3">
          {products.map((p) => (
            <div key={p._id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/90">{p.name}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/40">{p.category}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}


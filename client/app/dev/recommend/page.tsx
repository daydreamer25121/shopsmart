"use client";

import { useMemo, useState } from "react";

type RecommendPayload = {
  productIds: string[];
  customersAlsoBought?: string[];
  similarToThis?: string[];
};

export default function RecommendDevPage() {
  const [productId, setProductId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mlProxyUrl = useMemo(() => {
    // Express server default
    return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
  }, []);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${mlProxyUrl}/api/recommendations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as RecommendPayload;
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-accent">Recommendations Dev Test</h1>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="block text-sm text-white/70">productId</label>
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
          placeholder="Paste a Product _id from MongoDB"
        />

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-4 rounded-lg bg-accent px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Computing..." : "Get Recommendations"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white/80">Naive Bayes top 5</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.productIds.map((id) => (
                <span key={id} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/90">
                  {id}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white/80">Customers also bought</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(data.customersAlsoBought || []).map((id) => (
                <span key={id} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/90">
                  {id}
                </span>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}


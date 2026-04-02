"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type TopSeller = { sellerId: string; sellerName?: string | null; predictedSales: number };

type ProductPrediction = {
  productId: string;
  productName?: string | null;
  predictedSales: number;
  currentInventory: number;
  lowStock: boolean;
};

type PredictPayload = {
  forecastMonth: string | null;
  trend: { labels: string[]; historic: number[]; predictedNext: number };
  topPredictedSellers: TopSeller[];
  productPredictions: ProductPrediction[];
};

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export default function SalesPredictionDevPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PredictPayload | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("shopsmart_token"));
    } catch {
      // ignore
    }
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    setPayload(null);
    try {
      if (!token) throw new Error("Login required. Use the chatbot login first to get a JWT.");

      const res = await fetch(`${baseUrl}/api/predict-sales`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ months: 6, topSellersLimit: 5 }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PredictPayload;
      setPayload(json);
    } catch (e: any) {
      setError(e?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const barData = useMemo(() => {
    if (!payload) return null;
    const labels = payload.topPredictedSellers.map((s) => s.sellerName || s.sellerId);
    const values = payload.topPredictedSellers.map((s) => safeNum(s.predictedSales));
    return {
      labels,
      datasets: [
        {
          label: `Predicted sales (${payload.forecastMonth || "next month"})`,
          data: values,
          backgroundColor: "rgba(255, 122, 24, 0.65)",
          borderColor: "rgba(255, 122, 24, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [payload]);

  const lineData = useMemo(() => {
    if (!payload) return null;
    const labels = payload.trend.labels;
    const historic = payload.trend.historic;
    const predicted = safeNum(payload.trend.predictedNext);
    return {
      labels: [...labels, payload.forecastMonth || "Next"],
      datasets: [
        {
          label: "Monthly sales (historic + forecast)",
          data: [...historic, predicted],
          borderColor: "rgba(255, 122, 24, 1)",
          backgroundColor: "rgba(255, 122, 24, 0.15)",
          pointRadius: 3,
          tension: 0.3,
        },
      ],
    };
  }, [payload]);

  const lowStock = payload ? payload.productPredictions.filter((p) => p.lowStock) : [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-accent">Monthly Sales Prediction (Dev)</h1>
      <p className="mt-2 text-sm text-white/70">
        Uses linear regression on transaction history (ML service) and shows chart + low-stock alerts.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Predicting..." : "Run prediction"}
        </button>
        {!token ? <div className="text-sm text-red-300">JWT missing. Log in via chatbot first.</div> : null}
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div> : null}

      {payload ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white/90">
              Forecast month: <span className="text-accent">{payload.forecastMonth}</span>
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <h3 className="mb-2 text-xs font-semibold text-white/70">Top predicted sellers</h3>
                {barData ? <Bar data={barData as any} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : null}
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <h3 className="mb-2 text-xs font-semibold text-white/70">Sales trend</h3>
                {lineData ? <Line data={lineData as any} options={{ responsive: true }} /> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white/90">Low stock alerts</h2>
            <p className="mt-1 text-xs text-white/60">Triggered when predicted sales exceed current inventory.</p>
            <div className="mt-3 space-y-2">
              {lowStock.length ? (
                lowStock
                  .sort((a, b) => (b.predictedSales - b.currentInventory) - (a.predictedSales - a.currentInventory))
                  .slice(0, 10)
                  .map((p) => (
                    <div key={p.productId} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      <div>
                        <div className="font-semibold text-white/90">{p.productName || p.productId}</div>
                        <div className="text-xs text-white/50">
                          Predicted: {p.predictedSales.toFixed(1)} · Inventory: {p.currentInventory}
                        </div>
                      </div>
                      <div className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-200">Low</div>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-white/60">No low stock alerts for the forecast month.</div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}


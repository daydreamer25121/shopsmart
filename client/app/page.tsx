// client/app/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => {
        setBackendStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Backend connection failed:", err);
        setBackendStatus({ status: 'error', message: 'Cannot connect to backend' });
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-accent">ShopSmart</h1>
        <p className="mt-3 text-lg text-white/70">
          Demo scaffold is ready. Next: build auth flows, dashboards, recommendations, try-on, and AI features.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold mb-3">Backend Status</h3>
          
          {loading ? (
            <p className="text-white/60">Checking backend connection...</p>
          ) : backendStatus?.status === 'ok' ? (
            <div className="flex items-center gap-3 text-green-400">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium">Backend is running successfully</p>
                <p className="text-sm text-white/70">MongoDB connected • Ready for API calls</p>
              </div>
            </div>
          ) : (
            <div className="text-red-400">
              ❌ Cannot connect to backend. Make sure server is running on port 5000.
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <a 
            href="/shop" 
            className="inline-block bg-accent hover:bg-orange-600 text-black font-semibold px-8 py-3 rounded-xl transition"
          >
            Go to Shop →
          </a>
        </div>
      </div>
    </main>
  );
}
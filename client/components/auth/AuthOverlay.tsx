"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Role = "OWNER" | "SELLER" | "ANALYST" | "CARE" | "USER";

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: Role | null;
}

export function AuthOverlay({ isOpen, onClose, selectedRole }: AuthOverlayProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleConfig: Record<Role, { title: string; color: string; defaultEmail: string }> = {
    OWNER: { title: "Admin / Owner", color: "from-red-500 to-orange-600", defaultEmail: "owner@shopsmart.com" },
    SELLER: { title: "Product Seller", color: "from-blue-500 to-indigo-600", defaultEmail: "seller@shopsmart.com" },
    ANALYST: { title: "Data Analyst", color: "from-emerald-500 to-teal-600", defaultEmail: "analyst@shopsmart.com" },
    CARE: { title: "Customer Care", color: "from-pink-500 to-purple-600", defaultEmail: "care@shopsmart.com" },
    USER: { title: "Customer / Buyer", color: "from-orange-400 to-orange-600", defaultEmail: "user@shopsmart.com" },
  };

  const DEFAULT_PASSWORD = "password123";

  const currentRole = selectedRole ? roleConfig[selectedRole] : null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const loginEmail = email || currentRole?.defaultEmail;
    const loginPassword = password || DEFAULT_PASSWORD;

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Store JWT and redirect
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Simple redirect for demo
      const dashboardMap: Record<Role, string> = {
        OWNER: "/owner",
        SELLER: "/seller",
        ANALYST: "/analyst",
        CARE: "/care",
        USER: "/shop",
      };
      
      window.location.href = dashboardMap[selectedRole!];
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && currentRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
          >
            <div className={`h-2 w-full bg-gradient-to-r ${currentRole.color}`} />
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white">Login as {currentRole.title}</h2>
              <p className="mt-2 text-sm text-white/50">
                Enter your credentials to access the {currentRole.title} portal.
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/40 mb-1.5 ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder={currentRole.defaultEmail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-accent/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/40 mb-1.5 ml-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent/50 transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-black bg-white hover:bg-white/90 transform active:scale-[0.98] transition-all disabled:opacity-50`}
                >
                  {loading ? "Authenticating..." : "Continue to Dashboard"}
                </button>
              </form>

              <button
                onClick={onClose}
                className="mt-6 w-full text-center text-sm text-white/30 hover:text-white/60 transition"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

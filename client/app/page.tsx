// client/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthOverlay } from '../components/auth/AuthOverlay';

type Role = "OWNER" | "SELLER" | "ANALYST" | "CARE" | "USER";

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const openAuth = (role: Role) => {
    setSelectedRole(role);
    setIsAuthOpen(true);
  };

  const roles: { id: Role; title: string; desc: string; icon: string; color: string }[] = [
    { id: 'OWNER', title: 'Admin', desc: 'System management & oversight', icon: '⚡', color: 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' },
    { id: 'SELLER', title: 'Seller', desc: 'Scan products & manage inventory', icon: '📦', color: 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10' },
    { id: 'USER', title: 'Buyer', desc: 'Create 3D avatar & shop better', icon: '🛍️', color: 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 font-bold border-2' },
    { id: 'CARE', title: 'Support', desc: 'Manage reviews & help customers', icon: '🎧', color: 'border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10' },
    { id: 'ANALYST', title: 'Analyst', desc: 'Data insights & sales prediction', icon: '📊', color: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-accent/30 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-32">
        {/* Navbar */}
        <nav className="absolute top-8 left-6 right-6 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-black font-bold">S</span>
            ShopSmart
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#" className="hover:text-white transition">Technology</a>
            <a href="#" className="hover:text-white transition">Process</a>
            <a href="#" className="hover:text-white transition">Enterprise</a>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-widest uppercase text-accent mb-6">
              Next-Gen E-Commerce Intelligence
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8">
              Revolutionizing Retail with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-orange-400 to-white">
                3D AI Virtual Try-On
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Experience the future of shopping where products find you. Scan products as a seller, build your digital twin as a buyer, and try everything instantly in 3D.
            </p>
          </motion.div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-16 text-left">
            {roles.map((role, idx) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * idx }}
                onClick={() => openAuth(role.id)}
                className={`group relative p-6 rounded-3xl border transition-all cursor-pointer ${role.color}`}
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{role.icon}</div>
                <h3 className="text-lg font-bold mb-1">{role.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed mb-4">{role.desc}</p>
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Enter Portal <span>→</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 pt-10 border-t border-white/5">
            <p className="text-xs text-white/20 font-medium uppercase tracking-[0.3em]">
              Powered by Next.js 14 • Three.js • FastAPI • MongoDB
            </p>
          </div>
        </div>
      </div>

      <AuthOverlay 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        selectedRole={selectedRole} 
      />
    </main>
  );
}
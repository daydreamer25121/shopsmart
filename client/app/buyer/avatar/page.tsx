"use client";

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { BuyerAvatar } from "../../../components/tryOn/BuyerAvatar";
import { motion } from "framer-motion";

export default function BuyerAvatarPage() {
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [skinTone, setSkinTone] = useState("Wheatish");
  const [name, setName] = useState("Alex");

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Settings Panel */}
      <div className="w-full md:w-[400px] p-8 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-accent">3D Profile</h1>
          <p className="text-white/50 text-sm mt-1">Create your digital twin for virtual try-on.</p>
        </div>

        <div className="space-y-8 flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Your Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/40 transition" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Height (cm)</label>
              <span className="text-accent font-bold">{height}cm</span>
            </div>
            <input 
              type="range" min="140" max="210" value={height} 
              onChange={(e) => setHeight(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Weight (kg)</label>
              <span className="text-accent font-bold">{weight}kg</span>
            </div>
            <input 
              type="range" min="40" max="150" value={weight} 
              onChange={(e) => setWeight(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Skin Tone</label>
            <div className="grid grid-cols-2 gap-2">
              {["Fair", "Wheatish", "Medium Brown", "Dark Brown"].map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSkinTone(tone)}
                  className={`px-4 py-2 text-xs rounded-lg border transition ${
                    skinTone === tone ? "bg-accent text-black border-accent" : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Photo Analysis (Simulated)</label>
            <div className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer group">
              <div className="text-center">
                <span className="text-2xl block mb-1">📸</span>
                <span className="text-[10px] text-white/40 group-hover:text-white/60 transition uppercase tracking-widest font-bold">Upload Photo for AI Sync</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            localStorage.setItem("buyer_profile", JSON.stringify({ name, height, weight, skinTone }));
            alert("Digital Twin Saved!");
          }}
          className="mt-10 w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-accent transition transform active:scale-[0.98]"
        >
          Save My Profile
        </button>
      </div>

      {/* Preview Viewport */}
      <div className="flex-1 relative bg-[#0a0a0a]">
        <div className="absolute top-8 left-8 z-20">
          <div className="px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em]">
            Real-Time 3D Preview
          </div>
        </div>

        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 1, 4], fov: 35 }}>
            <color attach="background" args={["#080808"]} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
            <directionalLight position={[-5, 5, 5]} intensity={0.6} />

            <Suspense fallback={null}>
              <BuyerAvatar heightCm={height} weightKg={weight} skinTone={skinTone} />
              <Environment preset="city" />
              <ContactShadows position={[0, -1, 0]} opacity={0.6} blur={2} far={4} color="#000" />
            </Suspense>

            <OrbitControls 
              enablePan={false} 
              minPolarAngle={Math.PI / 4} 
              maxPolarAngle={Math.PI / 1.6}
              target={[0, 0, 0]} 
            />
          </Canvas>
        </div>

        {/* Stats overlay */}
        <motion.div 
          key={`${height}-${weight}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-8 right-8 z-20 space-y-2 pointer-events-none"
        >
          <div className="bg-black/60 border border-white/10 backdrop-blur-md p-4 rounded-2xl text-right min-w-[180px]">
             <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Model Height</div>
             <div className="text-2xl font-black text-white">{(height/100).toFixed(2)}m</div>
          </div>
          <div className="bg-black/60 border border-white/10 backdrop-blur-md p-4 rounded-2xl text-right min-w-[180px]">
             <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Volume Index</div>
             <div className="text-2xl font-black text-accent">{((weight / height**2) * 10000).toFixed(1)}</div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

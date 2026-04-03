"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TryOnCanvas } from "../tryOn/TryOnCanvas";

type ScanningStudioProps = {
  productId: string;
  productName: string;
  category: string;
  onClose: () => void;
  onComplete: (glbModel: string) => void;
};

const STEPS = [
  { id: "front", label: "Front View", icon: "👕" },
  { id: "side", label: "Side View", icon: "🚻" },
  { id: "back", label: "Back View", icon: "🎒" },
  { id: "top", label: "Top View", icon: "🧢" },
];

export function ScanningStudio({ productId, productName, category, onClose, onComplete }: ScanningStudioProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"CAMERA" | "PROCESSING" | "PREVIEW">("CAMERA");
  const [capturedAngles, setCapturedAngles] = useState<string[]>([]);
  const [generatedGlb, setGeneratedGlb] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentStep = STEPS[stepIndex];

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (status === "CAMERA") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [status]);

  async function captureAngle() {
    setIsCapturing(true);
    // Simulate flash/capture
    await new Promise(r => setTimeout(r, 600));
    setCapturedAngles([...capturedAngles, currentStep.id]);
    
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
      setIsCapturing(false);
    } else {
      startProcessing();
    }
  }

  async function startProcessing() {
    setStatus("PROCESSING");
    setProgress(0);
    
    // Simulate AI reconstruction progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 5;
      });
    }, 200);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/api/seller/tryon/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ productId }),
      });
      
      const json = await res.json();
      setGeneratedGlb(json.glbModel);
      
      // Wait for progress bar
      await new Promise(r => setTimeout(r, 2000));
      setStatus("PREVIEW");
    } catch (err) {
      console.error("Processing error:", err);
      setStatus("CAMERA"); // Fallback
    } finally {
      clearInterval(interval);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white">{productName}</h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-accent">
            {status === 'CAMERA' ? `Angle Capture: ${currentStep.label}` : status}
          </p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition">
          ✕
        </button>
      </header>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-[#050505] overflow-hidden">
        <AnimatePresence mode="wait">
          {status === "CAMERA" && (
            <motion.div 
               key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="h-full relative"
            >
              <video ref={videoRef} className="w-full h-full object-cover grayscale mix-blend-screen opacity-60" playsInline muted />
              
              {/* Scan Overlay Guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-[80%] aspect-[3/4] border-2 border-dashed border-accent/40 rounded-[60px] relative">
                    <div className="absolute inset-x-0 -top-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-accent animate-pulse">
                      Align {currentStep.label}
                    </div>
                    <div className="absolute inset-10 flex items-center justify-center text-8xl opacity-10">
                      {currentStep.icon}
                    </div>
                 </div>
              </div>

              {/* Angle Indicators */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
                 {STEPS.map((s, i) => (
                   <div key={s.id} className={`w-3 h-3 rounded-full border-2 transition ${i <= stepIndex ? 'bg-accent border-accent shadow-lg shadow-accent/40' : 'border-white/20'}`} />
                 ))}
              </div>

              {/* Capture Button */}
              <button 
                onClick={captureAngle} disabled={isCapturing}
                className="absolute right-10 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center group"
              >
                 <div className="w-14 h-14 rounded-full bg-white group-hover:scale-110 transition active:scale-95" />
              </button>
            </motion.div>
          )}

          {status === "PROCESSING" && (
            <motion.div 
               key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="h-full flex flex-col items-center justify-center p-12 text-center"
            >
               <div className="w-24 h-24 border-4 border-accent border-t-transparent rounded-full animate-spin mb-8" />
               <h3 className="text-3xl font-black mb-4">Reconstructing Geometry...</h3>
               <p className="text-white/40 max-w-sm mb-12 uppercase text-[10px] font-bold tracking-[0.2em]">
                 Our AI is synthesizing multiple camera angles to generate high-fidelity 3D splats.
               </p>
               <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-accent" animate={{ width: `${progress}%` }} />
               </div>
            </motion.div>
          )}

          {status === "PREVIEW" && (
            <motion.div 
               key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="h-full relative"
            >
               <TryOnCanvas 
                  videoRef={{ current: null } as any} 
                  cameraReady={false} 
                  glbUrl={generatedGlb} 
                  mode="AVATAR"
               />
               <div className="absolute bottom-10 inset-x-0 flex justify-center gap-4">
                  <button 
                    onClick={() => { setStatus("CAMERA"); setStepIndex(0); setCapturedAngles([]); }}
                    className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition"
                  >
                    Rescan Mesh
                  </button>
                  <button 
                    onClick={() => generatedGlb && onComplete(generatedGlb)}
                    className="px-8 py-4 rounded-2xl bg-accent text-black text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition"
                  >
                    Approve 3D Model
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <footer className="p-8 border-t border-white/5 text-center">
         <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest leading-loose">
            AI Photogrammetry Studio • {category} Optimization Enabled • Neural Splatting v2.4
         </p>
      </footer>
    </div>
  );
}

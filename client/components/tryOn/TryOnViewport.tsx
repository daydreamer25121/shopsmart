"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TryOnCanvas } from "./TryOnCanvas";
import { PoseTracker, PoseLandmarks } from "./PoseTracker";

export type TryOnViewportProps = {
  glbUrl?: string | null;
  productImageUrl?: string | null;
};

export function TryOnViewport({ glbUrl, productImageUrl }: TryOnViewportProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"VIDEO" | "AVATAR">("AVATAR");
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [poseData, setPoseData] = useState<PoseLandmarks | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Load profile from localStorage
    const saved = localStorage.getItem("buyer_profile");
    if (saved) {
      setBuyerProfile(JSON.parse(saved));
    }
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (e: any) {
      setError("Camera access denied or NOT available. Using 3D Avatar mode.");
      setMode("AVATAR");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }

  useEffect(() => {
    if (mode === "VIDEO") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-black border border-white/10 shadow-2xl">
      <video ref={videoRef} className="hidden" playsInline muted />

      <div className="absolute inset-0 z-0">
        <PoseTracker 
          videoRef={videoRef} 
          enabled={mode === "VIDEO" && cameraReady} 
          onPoseUpdate={setPoseData} 
        />
        <TryOnCanvas 
           videoRef={videoRef} 
           cameraReady={cameraReady} 
           glbUrl={glbUrl} 
           productImageUrl={productImageUrl} 
           mode={mode}
           buyerProfile={buyerProfile}
           poseData={poseData}
        />
      </div>

      {/* UI Overlay */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1">Advanced 3D Try-On</div>
          <p className="text-xs text-white/50">{mode === 'AVATAR' ? 'Fitting on your Digital Twin' : 'AR Layer over Video Feed'}</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setMode("AVATAR")}
             className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition border ${mode === 'AVATAR' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30'}`}
           >
             3D Avatar
           </button>
           <button 
             onClick={() => setMode("VIDEO")}
             className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition border ${mode === 'VIDEO' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30'}`}
           >
             Magic Mirror (AR)
           </button>
        </div>
      </motion.div>

      {/* Tracking Status Indicator */}
      {mode === "VIDEO" && cameraReady && (
        <div className="absolute top-24 left-6 z-10 flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${poseData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
             {poseData ? 'Body Tracked' : 'Searching for Body...'}
           </span>
        </div>
      )}

      {error && mode === "VIDEO" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md">
          <div className="text-center max-w-xs">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-sm text-white font-medium mb-4">{error}</p>
            <button onClick={() => setMode("AVATAR")} className="bg-accent text-black text-[10px] font-black px-6 py-3 rounded-xl uppercase">Switch to Avatar Mode</button>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="absolute bottom-6 left-6 right-6 z-10 flex justify-between items-end">
         <div className="text-[8px] text-white/20 uppercase font-bold tracking-widest max-w-[200px]">
           3D Geometry is AI-generated and may vary based on lighting and model quality.
         </div>
         {mode === 'AVATAR' && buyerProfile && (
           <div className="text-right">
             <div className="text-[10px] text-white/60 font-bold mb-1">{buyerProfile.name}'s Avatar</div>
             <div className="text-[10px] text-accent font-black uppercase tracking-widest">{buyerProfile.height}cm • {buyerProfile.weight}kg</div>
           </div>
         )}
      </div>
    </div>
  );
}

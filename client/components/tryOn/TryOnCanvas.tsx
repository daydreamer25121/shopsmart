"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { BuyerAvatar } from "./BuyerAvatar";
import { PoseLandmarks } from "./PoseTracker";

/** Works from browser + CORS; used when product GLB is missing or a demo placeholder URL. */
const FALLBACK_GLB = "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf";

function pickGlbUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return FALLBACK_GLB;
  const t = url.trim();
  if (!t.startsWith("http")) return FALLBACK_GLB;
  if (t.includes("example.com")) return FALLBACK_GLB;
  return t;
}

function VideoBackdrop({ videoEl }: { videoEl: HTMLVideoElement | null }) {
  const [map, setMap] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!videoEl) return;
    const tex = new THREE.VideoTexture(videoEl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    setMap(tex);
    return () => {
      tex.dispose();
      setMap(null);
    };
  }, [videoEl]);

  useFrame(() => {
    if (map) map.needsUpdate = true;
  });

  if (!map) return null;

  return (
    <mesh position={[0, 0, -2.35]}>
      <planeGeometry args={[3.4, 2.55]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function GltfGarment({ url, isFitting, poseData, category }: { url: string; isFitting: boolean; poseData?: PoseLandmarks | null, category?: string }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => scene.clone(true), [scene, url]);

  const transform = useMemo(() => {
    if (!isFitting || !poseData) {
      // Default positions
      return {
        position: (isFitting ? [0, 0.25, 0.1] : [0, -0.2, 0.45]) as [number, number, number],
        scale: isFitting ? 0.35 : 0.42,
        rotation: (isFitting ? [0, 0, 0] : [0, 0.55, 0]) as [number, number, number],
      };
    }

    // AR Mode with Pose Data
    // MoveNet keypoints: 5=LShoulder, 6=RShoulder, 11=LHip, 12=RHip
    const ls = poseData.find(k => k.name === "left_shoulder");
    const rs = poseData.find(k => k.name === "right_shoulder");
    
    if (ls && rs && (ls.score ?? 0) > 0.3 && (rs.score ?? 0) > 0.3) {
      // Midpoint of shoulders in 2D (0 to 1)
      // Note: Video is 1280x720, so normalize
      const midX = (ls.x + rs.x) / 2;
      const midY = (ls.y + rs.y) / 2;

      // Map 2D (pixels) to 3D (units)
      // Our plane is 3.4 x 2.55 units at Z = -2.35
      // But for AR overlay, we want to look like we are on top
      // Coordinate mapping (approximate):
      const x3d = (midX / 1280 - 0.5) * -3.4; // inverted for user mirror
      const y3d = (0.5 - midY / 720) * 2.55;

      // Scale based on shoulder width and category
      const dx = ls.x - rs.x;
      const dy = ls.y - rs.y;
      const shoulderWidth = Math.sqrt(dx*dx + dy*dy);
      
      let scaleBase = 0.8;
      let yOffset = -0.5;

      const cat = category?.toLowerCase() || "";
      if (cat.includes("shoe")) {
        scaleBase = 0.25;
        yOffset = -1.8; // bottom of avatar
      } else if (cat.includes("hat") || cat.includes("helmet")) {
        scaleBase = 0.45;
        yOffset = 0.65; // head area
      }

      const scale = (shoulderWidth / 400) * scaleBase;

      return {
        position: [x3d, y3d + yOffset, 0.1] as [number, number, number],
        scale,
        rotation: [0, 0, 0] as [number, number, number],
      };
    }

    return {
      position: [0, 0.25, 0.1] as [number, number, number],
      scale: 0.35,
      rotation: [0, 0, 0] as [number, number, number],
    };
  }, [isFitting, poseData, url]);

  return (
    <primitive object={obj} scale={transform.scale} position={transform.position} rotation={transform.rotation} />
  );
}

export type TryOnCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  glbUrl?: string | null;
  productImageUrl?: string | null;
  mode: "VIDEO" | "AVATAR";
  buyerProfile?: { height: number; weight: number; skinTone: string } | null;
  poseData?: PoseLandmarks | null;
};

export function TryOnCanvas({ videoRef, cameraReady, glbUrl, mode, buyerProfile, poseData }: TryOnCanvasProps) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!cameraReady) {
      setVideoEl(null);
      return;
    }
    const tick = () => {
      if (videoRef.current) setVideoEl(videoRef.current);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => clearInterval(id);
  }, [cameraReady, videoRef]);

  const garmentUrl = useMemo(() => pickGlbUrl(glbUrl), [glbUrl]);

  return (
    <Canvas
      camera={{ position: [0, 0.05, 2.5], fov: 42 }}
      gl={{ alpha: false, antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={1.15} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />

      <Suspense fallback={null}>
        {mode === "VIDEO" ? (
          <VideoBackdrop videoEl={videoEl} />
        ) : (
          <>
            <BuyerAvatar 
                heightCm={buyerProfile?.height || 175} 
                weightKg={buyerProfile?.weight || 75} 
                skinTone={buyerProfile?.skinTone || "Wheatish"} 
            />
            <Environment preset="city" />
          </>
        )}
        <Environment preset="city" />
        <GltfGarment 
           key={garmentUrl} 
           url={garmentUrl} 
           category={glbUrl || ""}
           isFitting={mode === "AVATAR" || mode === "VIDEO"} 
           poseData={mode === "VIDEO" ? poseData : null}
        />
      </Suspense>

      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={4.5} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(FALLBACK_GLB);

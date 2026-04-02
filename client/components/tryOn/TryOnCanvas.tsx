"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

/** Works from browser + CORS; used when product GLB is missing or a demo placeholder URL. */
const FALLBACK_GLB =
  "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf";

function pickGlbUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return FALLBACK_GLB;
  const t = url.trim();
  if (!t.startsWith("http")) return FALLBACK_GLB;
  // Seed data uses example.com paths that never load
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

function GltfGarment({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => scene.clone(true), [scene, url]);
  return (
    <primitive object={obj} scale={0.42} position={[0, -0.2, 0.45]} rotation={[0, 0.55, 0]} />
  );
}

function ProductImageBillboard({ imageUrl }: { imageUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
  }, [texture]);

  return (
    <mesh position={[0.95, 0.05, 0.55]} rotation={[0, -0.45, 0]}>
      <planeGeometry args={[0.6, 0.6]} />
      <meshStandardMaterial map={texture} roughness={0.6} metalness={0.05} />
    </mesh>
  );
}

export type TryOnCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  glbUrl?: string | null;
  productImageUrl?: string | null;
};

export function TryOnCanvas({ videoRef, cameraReady, glbUrl, productImageUrl }: TryOnCanvasProps) {
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
        <VideoBackdrop videoEl={videoEl} />
        <Environment preset="city" />
        <GltfGarment key={garmentUrl} url={garmentUrl} />
        {productImageUrl ? <ProductImageBillboard imageUrl={productImageUrl} /> : null}
      </Suspense>

      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={4.5} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(FALLBACK_GLB);

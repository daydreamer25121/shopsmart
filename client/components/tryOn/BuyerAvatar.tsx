"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/** Standard rigged base model for demo */
const BASE_HUMAN_GLB = "https://threejs.org/examples/models/gltf/Xbot.glb";

interface BuyerAvatarProps {
  heightCm?: number; // e.g. 175
  weightKg?: number; // e.g. 75
  skinTone?: string; // e.g. "Wheatish"
}

export function BuyerAvatar({ heightCm = 170, weightKg = 70, skinTone = "Wheatish" }: BuyerAvatarProps) {
  const { scene } = useGLTF(BASE_HUMAN_GLB);

  const skinColors: Record<string, string> = {
    "Fair": "#fbe0d0",
    "Wheatish": "#e8b999",
    "Medium Brown": "#ac7e5c",
    "Dark Brown": "#4b3225",
  };

  const clonedScene = useMemo(() => {
    const s = scene.clone(true);
    
    // Simple parametric scaling logic
    // Reference height is ~1.8m in the GLB
    // Refined parametric scaling logic
    // Reference height is ~1.8m in the GLB
    const heightScale = heightCm / 180;
    
    // Weight scale affects width (X) and depth (Z)
    // We use a body-mass-index inspired scaling
    // Reference weight is ~70kg
    const bmiFactor = (weightKg / (heightCm / 100) ** 2) / 22; // 22 is "normal" BMI
    const widthScale = 0.85 * Math.sqrt(bmiFactor);
    const depthScale = 0.9 * Math.sqrt(bmiFactor);

    s.scale.set(widthScale, heightScale, depthScale);

    // Apply skin tone to meshes
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.name.toLowerCase().includes("body") || mesh.name.toLowerCase().includes("skin")) {
          const mat = new THREE.MeshStandardMaterial({
            color: skinColors[skinTone] || skinColors["Wheatish"],
            roughness: 0.8,
            metalness: 0.1,
          });
          mesh.material = mat;
        }
      }
    });

    return s;
  }, [scene, heightCm, weightKg, skinTone]);

  return <primitive object={clonedScene} position={[0, -1, 0]} />;
}

useGLTF.preload(BASE_HUMAN_GLB);

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export type RobotMode = "idle" | "thinking" | "talking";

type RobotCanvasProps = {
  mode: RobotMode;
  didWelcome: boolean;
  onWelcomeDone?: () => void;
};

function Robot({ mode, didWelcome, onWelcomeDone }: RobotCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const eyesMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#FF7A18",
        emissive: new THREE.Color("#FF7A18"),
        emissiveIntensity: 1.2,
      }),
    []
  );

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1b1b1b",
        metalness: 0.45,
        roughness: 0.35,
      }),
    []
  );

  const mouthMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2a2a",
        emissive: new THREE.Color("#FF7A18"),
        emissiveIntensity: 0.0,
      }),
    []
  );

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const idleTween = useRef<gsap.core.Tween | null>(null);
  const eyesTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Idle float (always on).
    idleTween.current?.kill();
    idleTween.current = gsap.to(groupRef.current.position, {
      y: "+=0.06",
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    return () => {
      idleTween.current?.kill();
    };
  }, []);

  useEffect(() => {
    // Mode-based animations.
    tlRef.current?.kill();
    eyesTween.current?.kill();

    const group = groupRef.current;
    const head = headRef.current;
    const arm = armRef.current;
    if (!group || !head || !arm) return;

    const tl = gsap.timeline();
    tlRef.current = tl;

    if (mode === "thinking") {
      tl.to(group.rotation, { y: 0.25, duration: 0.25, ease: "power2.out" })
        .to(group.rotation, { y: -0.25, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 5 }, "<")
        .to(group.rotation, { y: 0, duration: 0.25, ease: "power2.inOut" });

      eyesTween.current = gsap.to(eyesMat, {
        emissiveIntensity: 2.2,
        duration: 0.35,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    } else if (mode === "talking") {
      tl.to(head.rotation, { x: 0.15, duration: 0.12, yoyo: true, repeat: 14, ease: "sine.inOut" });
      gsap.to(mouthMat, {
        emissiveIntensity: 2.0,
        duration: 0.12,
        yoyo: true,
        repeat: 14,
        ease: "sine.inOut",
      });
      // settle
      tl.to(head.rotation, { x: 0, duration: 0.2, ease: "power2.out" }, ">-0.05");
      gsap.to(mouthMat, { emissiveIntensity: 0, duration: 0.25, ease: "power2.out" });
    } else {
      // idle reset
      tl.to([group.rotation, head.rotation], { x: 0, y: 0, z: 0, duration: 0.2, ease: "power2.out" });
      gsap.to(mouthMat, { emissiveIntensity: 0, duration: 0.2, ease: "power2.out" });
      gsap.to(eyesMat, { emissiveIntensity: 1.2, duration: 0.2, ease: "power2.out" });
    }

    return () => {
      tl.kill();
      eyesTween.current?.kill();
    };
  }, [mode, eyesMat, mouthMat]);

  useEffect(() => {
    // Welcome animation (wave once).
    if (didWelcome) return;
    const arm = armRef.current;
    if (!arm) return;

    const tl = gsap.timeline({
      onComplete: () => onWelcomeDone?.(),
    });
    tl.to(arm.rotation, { z: -0.6, duration: 0.25, ease: "power2.out" })
      .to(arm.rotation, { z: -0.2, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" })
      .to(arm.rotation, { z: 0, duration: 0.25, ease: "power2.inOut" });
    return () => tl.kill();
  }, [didWelcome, onWelcomeDone]);

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Body */}
      <mesh material={bodyMat} position={[0, -0.55, 0]}>
        <boxGeometry args={[1.0, 1.05, 0.55]} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.35, 0]}>
        <mesh material={bodyMat}>
          <boxGeometry args={[0.85, 0.7, 0.6]} />
        </mesh>
        {/* Eyes */}
        <mesh material={eyesMat} position={[-0.18, 0.08, 0.32]}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        <mesh material={eyesMat} position={[0.18, 0.08, 0.32]}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        {/* Mouth glow bar */}
        <mesh material={mouthMat} position={[0, -0.18, 0.31]}>
          <boxGeometry args={[0.32, 0.06, 0.02]} />
        </mesh>
      </group>

      {/* Left arm */}
      <group position={[-0.62, -0.4, 0]} rotation={[0, 0, 0.15]}>
        <mesh material={bodyMat}>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
        </mesh>
      </group>

      {/* Right arm (waving arm) */}
      <group ref={armRef} position={[0.62, -0.4, 0]} rotation={[0, 0, 0]}>
        <mesh material={bodyMat}>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
        </mesh>
      </group>

      {/* Antenna */}
      <mesh material={bodyMat} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 16]} />
      </mesh>
      <mesh material={eyesMat} position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
      </mesh>
    </group>
  );
}

export function RobotCanvas(props: RobotCanvasProps) {
  return (
    <div className="h-[300px] w-[300px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <Canvas camera={{ position: [0, 0.3, 3.2], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <Robot {...props} />
        <OrbitControls enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
}


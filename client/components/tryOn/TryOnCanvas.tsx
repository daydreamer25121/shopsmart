"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";

type PosePoint = {
  x: number;
  y: number;
};

type TryOnCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
};

function GarmentProxy({ torsoCenter }: { torsoCenter: PosePoint | null }) {
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    if (!torsoCenter) return;
    // Map 2D normalized coords into a simple 3D position.
    const x = (torsoCenter.x - 0.5) * 2;
    const y = (0.5 - torsoCenter.y) * 2;
    setPosition([x, y, 0]);
  }, [torsoCenter]);

  return (
    <mesh position={position}>
      <boxGeometry args={[0.7, 0.9, 0.3]} />
      <meshStandardMaterial color="#FF7A18" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

export function TryOnCanvas({ videoRef }: TryOnCanvasProps) {
  const [torsoCenter, setTorsoCenter] = useState<PosePoint | null>(null);

  // For demo, gently animate a fake torso center if no pose.
  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      const x = 0.5 + 0.05 * Math.sin(elapsed);
      const y = 0.4 + 0.03 * Math.cos(elapsed * 0.8);
      setTorsoCenter({ x, y });
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <GarmentProxy torsoCenter={torsoCenter} />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}


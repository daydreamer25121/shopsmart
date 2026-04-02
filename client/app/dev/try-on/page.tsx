"use client";

import { TryOnViewport } from "../../../components/tryOn/TryOnViewport";

export default function TryOnDevPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-accent">3D Virtual Try-On (Demo)</h1>
      <p className="mt-2 text-sm text-white/70">
        This demo opens your camera and overlays a 3D garment proxy using Three.js. In a full build, MediaPipe Pose
        would drive the garment position.
      </p>

      <div className="mt-6">
        <TryOnViewport />
      </div>
    </main>
  );
}


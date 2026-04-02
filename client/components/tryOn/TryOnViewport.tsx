"use client";

import { useEffect, useRef, useState } from "react";
import { TryOnCanvas } from "./TryOnCanvas";

export function TryOnViewport() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
   const [skinTone, setSkinTone] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (e: any) {
        setError(e?.message || "Could not access camera");
      }
    }
    initCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function analyzeSkinTone() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!cameraReady) return;

    const canvas = document.createElement("canvas");
    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, (video.videoWidth - w) / 2, (video.videoHeight - h) / 3, w, h, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = imgData.data[i];
      const g = imgData.data[i + 1];
      const b = imgData.data[i + 2];
      // Skip very dark / bright pixels to reduce background noise
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      if (lightness < 30 || lightness > 240) continue;
      rSum += r;
      gSum += g;
      bSum += b;
      count += 1;
    }

    if (!count) return;
    const rgb = [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)];

    try {
      const res = await fetch(`${baseUrl}/api/skin-tone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rgb }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSkinTone(json.skinTone || null);
    } catch (e) {
      // Silent fail for demo
    }
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 md:w-1/2">
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
            Allow camera access to start virtual try-on...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-300">
            {error}
          </div>
        )}
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <div className="absolute bottom-2 left-2 flex gap-2">
          <button
            onClick={analyzeSkinTone}
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-black"
          >
            Detect skin tone
          </button>
          {skinTone && (
            <span className="rounded-md bg-black/60 px-3 py-1 text-xs text-white/80">
              Skin tone: <span className="font-semibold text-accent">{skinTone}</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-white/10 bg-black/60 md:h-auto md:min-h-[320px] md:w-1/2">
        <TryOnCanvas videoRef={videoRef} />
      </div>
    </div>
  );
}


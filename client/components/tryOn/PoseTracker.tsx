"use client";

import { useEffect, useRef } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export type PoseLandmarks = poseDetection.Keypoint[];

interface PoseTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onPoseUpdate: (landmarks: PoseLandmarks) => void;
}

export function PoseTracker({ videoRef, enabled, onPoseUpdate }: PoseTrackerProps) {
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    async function initDetector() {
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        }
      );
      detectorRef.current = detector;
    }

    if (enabled && !detectorRef.current) {
      initDetector();
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled]);

  useEffect(() => {
    async function detect() {
      if (!enabled || !detectorRef.current || !videoRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const poses = await detectorRef.current.estimatePoses(video, {
          flipHorizontal: false,
        });

        if (poses && poses.length > 0) {
          onPoseUpdate(poses[0].keypoints);
        }
      } catch (err) {
        console.error("Pose detection error:", err);
      }

      requestRef.current = requestAnimationFrame(detect);
    }

    if (enabled) {
      requestRef.current = requestAnimationFrame(detect);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled, videoRef, onPoseUpdate]);

  return null;
}

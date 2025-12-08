"use client";
import { useEffect } from "react";
import { useLoadingStore } from "@/store/loadingStore";
import { useProgress } from "@react-three/drei";

export function useAssetLoader() {
  const { setProgress, setLoadingStage, setLoaded } = useLoadingStore();
  const { progress, total, loaded, errors } = useProgress();

  useEffect(() => {
    if (total === 0) {
      // Simulate initial loading
      setLoadingStage("Initializing 3D Environment...");
      setProgress(0);

      // Auto-progress when no assets to load
      const timer = setTimeout(() => {
        setProgress(20);
        setLoadingStage("Setting up gallery space...");

        setTimeout(() => {
          setProgress(50);
          setLoadingStage("Preparing interactive elements...");

          setTimeout(() => {
            setProgress(80);
            setLoadingStage("Finalizing experience...");

            setTimeout(() => {
              setProgress(100);
              setLoadingStage("Welcome to the gallery!");

              setTimeout(() => {
                setLoaded(true);
              }, 500);
            }, 500);
          }, 500);
        }, 500);
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Handle actual asset loading
    const percentage = (loaded / total) * 100;
    setProgress(percentage);

    if (percentage >= 100 && errors.length === 0) {
      setTimeout(() => setLoaded(true), 1000);
    }
  }, [
    progress,
    total,
    loaded,
    errors,
    setProgress,
    setLoadingStage,
    setLoaded,
  ]);

  return {
    progress: (loaded / total) * 100,
    isLoaded: loaded === total && total > 0,
  };
}

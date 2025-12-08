import { create } from "zustand";

interface LoadingState {
  progress: number;
  isLoaded: boolean;
  loadingStage: string;
  setProgress: (progress: number) => void;
  setLoadingStage: (stage: string) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  progress: 0,
  isLoaded: false,
  loadingStage: "Initializing 3D Environment...",
  setProgress: (progress) => set({ progress }),
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setLoaded: (loaded) => set({ isLoaded: loaded }),
}));

import { create } from 'zustand';

// Studio store for managing 3D scene state
export interface SceneObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
}

interface StudioStore {
  objects: SceneObject[];
  selectedObject: string | null;
  transformMode: 'select' | 'translate' | 'rotate' | 'scale';
  currentProjectId: string | null;
  currentProjectName: string | null;
  isModified: boolean;
  lastSavedState: string | null;
  addObject: (type: SceneObject['type']) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  clearScene: () => void;
  newScene: () => void;
  setTransformMode: (mode: 'select' | 'translate' | 'rotate' | 'scale') => void;
  saveScene: (name: string, description?: string) => Promise<{ success: boolean; projectId?: string; error?: string }>;
  loadScene: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentProject: (projectId: string | null, projectName: string | null) => void;
  checkModified: () => void;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  objects: [],
  selectedObject: null,
  transformMode: 'select',
  currentProjectId: null,
  currentProjectName: null,
  isModified: false,
  lastSavedState: null,

  addObject: (type) => {
    const newObject: SceneObject = {
      id: `${type}-${Date.now()}`,
      type,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#D4AF37',
    };
    console.log(`[Studio Debug] Adding new object:`, {
      objectId: newObject.id,
      objectType: type,
      initialPosition: newObject.position,
      initialRotation: newObject.rotation,
      initialScale: newObject.scale,
      color: newObject.color
    });
    set((state) => ({
      objects: [...state.objects, newObject],
      selectedObject: newObject.id,
      isModified: true,
    }));
  },

  updateObject: (id, updates) => {
    set((state) => {
      const obj = state.objects.find(o => o.id === id);
      if (obj) {
        console.log(`[Studio Debug] Updating object "${id}":`, {
          objectType: obj.type,
          before: {
            position: obj.position,
            rotation: obj.rotation,
            scale: obj.scale
          },
          updates: updates
        });
      }
      return {
        objects: state.objects.map((obj) =>
          obj.id === id ? { ...obj, ...updates } : obj
        ),
        isModified: true,
      };
    });
  },

  deleteObject: (id) => {
    set((state) => {
      const obj = state.objects.find(o => o.id === id);
      if (obj) {
        console.log(`[Studio Debug] Deleting object "${id}":`, {
          objectType: obj.type,
          position: obj.position,
          wasSelected: state.selectedObject === id,
          remainingObjects: state.objects.length - 1
        });
      }
      return {
        objects: state.objects.filter((obj) => obj.id !== id),
        selectedObject: state.selectedObject === id ? null : state.selectedObject,
        isModified: true,
      };
    });
  },

  clearScene: () => {
    const currentObjects = useStudioStore.getState().objects;
    console.log(`[Studio Debug] Clearing scene:`, {
      objectsCleared: currentObjects.length,
      objectIds: currentObjects.map(o => o.id)
    });
    set({ objects: [], selectedObject: null, isModified: true });
  },

  newScene: () => {
    console.log(`[Studio Debug] Creating new scene`);
    set({
      objects: [],
      selectedObject: null,
      currentProjectId: null,
      currentProjectName: null,
      isModified: false,
      lastSavedState: JSON.stringify([]),
    });
  },

  checkModified: () => {
    const state = get();
    const currentState = JSON.stringify(state.objects);
    const isModified = currentState !== state.lastSavedState;
    if (state.isModified !== isModified) {
      set({ isModified });
    }
  },

  setTransformMode: (mode) => {
    const previousMode = useStudioStore.getState().transformMode;
    console.log(`[Studio Debug] Transform mode changed:`, {
      from: previousMode,
      to: mode,
      selectedObject: useStudioStore.getState().selectedObject
    });
    set({ transformMode: mode });
  },

  saveScene: async (name: string, description?: string) => {
    const state = get();
    const sceneData = {
      objects: state.objects,
      version: '1.0.0',
      savedAt: new Date().toISOString(),
    };

    try {
      console.log(`[Studio Debug] Saving scene "${name}":`, {
        objectCount: state.objects.length,
        currentProjectId: state.currentProjectId
      });

      let response;

      if (state.currentProjectId) {
        // Update existing project
        response = await fetch(`/api/studio/projects/${state.currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            sceneData,
          }),
        });
      } else {
        // Create new project
        response = await fetch('/api/studio/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            sceneData,
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save scene');
      }

      const data = await response.json();
      const projectId = data.project.id;
      const savedState = JSON.stringify(state.objects);

      set({
        currentProjectId: projectId,
        currentProjectName: name,
        isModified: false,
        lastSavedState: savedState,
      });

      console.log(`[Studio Debug] Scene saved successfully:`, {
        projectId,
        name
      });

      return { success: true, projectId };
    } catch (error) {
      console.error('[Studio Debug] Error saving scene:', error);
      return { success: false, error: 'Failed to save scene' };
    }
  },

  loadScene: async (projectId: string) => {
    try {
      console.log(`[Studio Debug] Loading scene:`, { projectId });

      const response = await fetch(`/api/studio/projects/${projectId}`);

      if (!response.ok) {
        throw new Error('Failed to load scene');
      }

      const data = await response.json();
      const sceneData = data.project.sceneData;
      const loadedObjects = sceneData.objects || [];

      set({
        objects: loadedObjects,
        selectedObject: null,
        currentProjectId: projectId,
        currentProjectName: data.project.name,
        isModified: false,
        lastSavedState: JSON.stringify(loadedObjects),
      });

      console.log(`[Studio Debug] Scene loaded successfully:`, {
        projectId,
        name: data.project.name,
        objectCount: sceneData.objects?.length || 0
      });

      return { success: true };
    } catch (error) {
      console.error('[Studio Debug] Error loading scene:', error);
      return { success: false, error: 'Failed to load scene' };
    }
  },

  setCurrentProject: (projectId: string | null, projectName: string | null) => {
    set({
      currentProjectId: projectId,
      currentProjectName: projectName,
    });
  },
}));

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useStudioStore } from "../hooks/useStudioStore";
import "@/app/neomorphic.css";
import { Scan, PersonStanding, Plane, Flag } from "lucide-react";

// Dynamically import ExploreScene with SSR disabled
const ExploreScene = dynamic(() => import("./components/ExploreScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: '#D4AF37' }}></div>
    </div>
  ),
});

type CameraMode = 'orbit' | 'walk' | 'fly';

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [isPaused, setIsPaused] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [resetCamera, setResetCamera] = useState(0);
  const [showSpawnMenu, setShowSpawnMenu] = useState(false);
  const [addSpawnTrigger, setAddSpawnTrigger] = useState(0);
  const [spawnPoints, setSpawnPoints] = useState<Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    name: string;
  }>>([]);
  const loadScene = useStudioStore((state) => state.loadScene);
  const currentProjectName = useStudioStore((state) => state.currentProjectName);
  const objects = useStudioStore((state) => state.objects);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Handle load query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const projectId = searchParams.get("load");

      if (projectId) {
        console.log(`[Studio Explore] Loading project: ${projectId}`);
        loadScene(projectId).then(() => {
          setIsLoading(false);
          // Clean up URL
          window.history.replaceState({}, "", "/studio/explore");
        });
      } else {
        setIsLoading(false);
      }
    }
  }, [loadScene]);

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Handle ESC key to toggle pause menu and Cmd+K for spawn menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused((prev) => !prev);
        setShowSpawnMenu(false); // Close spawn menu when pausing
      }
      // Cmd+K or Ctrl+K to toggle spawn menu
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSpawnMenu((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (status === "loading" || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out"
        }}
      >
        <div className="text-center">
          <div
            className="animate-spin h-12 w-12 border-4 border-t-transparent mx-auto mb-4"
            style={{ borderColor: '#D4AF37', borderRadius: '50%' }}
          ></div>
          <p
            className="font-space-grotesk uppercase tracking-wide"
            style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
          >
            Loading Scene...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (objects.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out"
        }}
      >
        <div className="text-center">
          <h2
            className="text-2xl font-bold font-space-grotesk uppercase mb-4"
            style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
          >
            No Scene Loaded
          </h2>
          <button
            onClick={() => router.push("/select")}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? 'dark-mode' : ''}`}
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
    >
      {/* Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold font-space-grotesk uppercase"
            style={{
              color: isDark ? '#d1d5db' : '#6C7587',
              transition: 'color 300ms ease-in-out',
              textShadow: isDark
                ? '0 2px 4px rgba(0,0,0,0.5)'
                : '0 2px 4px rgba(255,255,255,0.5)'
            }}
          >
            {currentProjectName || "Exploring Scene"}
          </h1>
          <p
            className="text-sm font-space-grotesk mt-1"
            style={{
              color: isDark ? '#9ca3af' : '#8992A5',
              textShadow: isDark
                ? '0 1px 2px rgba(0,0,0,0.5)'
                : '0 1px 2px rgba(255,255,255,0.5)'
            }}
          >
            {cameraMode === 'orbit' && 'Orbit Mode'}
            {cameraMode === 'walk' && 'Walk Mode'}
            {cameraMode === 'fly' && 'Fly Mode'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Camera Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setCameraMode('orbit')}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                height: '40px',
                width: '40px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cameraMode === 'orbit'
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                  : undefined,
              }}
              title="Orbit Mode"
            >
              <Scan
                className="w-5 h-5"
                style={{ color: cameraMode === 'orbit' ? '#D4AF37' : (isDark ? '#d1d5db' : '#6C7587') }}
              />
            </button>
            <button
              onClick={() => setCameraMode('walk')}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                height: '40px',
                width: '40px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cameraMode === 'walk'
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                  : undefined,
              }}
              title="Walk Mode"
            >
              <PersonStanding
                className="w-5 h-5"
                style={{ color: cameraMode === 'walk' ? '#D4AF37' : (isDark ? '#d1d5db' : '#6C7587') }}
              />
            </button>
            <button
              onClick={() => setCameraMode('fly')}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                height: '40px',
                width: '40px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cameraMode === 'fly'
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                  : undefined,
              }}
              title="Fly Mode"
            >
              <Plane
                className="w-5 h-5"
                style={{ color: cameraMode === 'fly' ? '#D4AF37' : (isDark ? '#d1d5db' : '#6C7587') }}
              />
            </button>
          </div>

          {/* Spawn Points Button */}
          <button
            onClick={() => setShowSpawnMenu(!showSpawnMenu)}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              height: '40px',
              width: '40px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showSpawnMenu
                ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                : undefined,
            }}
            title="Spawn Points (Cmd+K)"
          >
            <Flag
              className="w-5 h-5"
              style={{ color: showSpawnMenu ? '#D4AF37' : (isDark ? '#d1d5db' : '#6C7587') }}
            />
          </button>

          {/* Theme Toggle */}
          <label className={`neomorphic-toggle ${isDark ? 'dark-mode' : ''}`}>
            <input
              type="checkbox"
              className="neomorphic-toggle__input"
              checked={isDark}
              onChange={toggleTheme}
            />
            <div className="neomorphic-toggle__indicator">
              <svg
                className="w-3.5 h-3.5"
                style={{ color: "#FFA500" }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
              <svg
                className="w-3.5 h-3.5"
                style={{ color: "#8992A5" }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
          </label>

          <button
            onClick={() => router.push("/select")}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Full-screen 3D View */}
      <div className="w-full h-screen">
        <ExploreScene
          isDark={isDark}
          cameraMode={cameraMode}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          resetCamera={resetCamera}
          addSpawnTrigger={addSpawnTrigger}
          spawnPoints={spawnPoints}
          onAddSpawnPoint={(position, rotation) => {
            const newSpawn = {
              id: `spawn-${Date.now()}`,
              position,
              rotation,
              name: `Spawn Point ${spawnPoints.length + 1}`
            };
            setSpawnPoints([...spawnPoints, newSpawn]);
          }}
        />
      </div>

      {/* Pause Menu Overlay */}
      {isPaused && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '2.5rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h2
              className="text-3xl font-bold font-space-grotesk uppercase mb-6 text-center"
              style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
            >
              Paused
            </h2>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setIsPaused(false)}
                className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%' }}
              >
                Resume
              </button>
              <button
                onClick={() => setShowControls(!showControls)}
                className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                style={{
                  width: '100%',
                  height: '54px',
                  backgroundColor: showControls
                    ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                    : undefined,
                  color: showControls ? '#D4AF37' : undefined,
                }}
              >
                {showControls ? 'Hide' : 'Show'} Controls
              </button>
              {cameraMode === 'walk' && (
                <button
                  onClick={() => {
                    setShowDebug(!showDebug);
                    setIsPaused(false);
                  }}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                  style={{
                    width: '100%',
                    height: '54px',
                    backgroundColor: showDebug
                      ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                      : undefined,
                    color: showDebug ? '#D4AF37' : undefined,
                  }}
                >
                  {showDebug ? 'Hide' : 'Show'} Physics Debug
                </button>
              )}
              <button
                onClick={() => {
                  setResetCamera(prev => prev + 1);
                }}
                className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%', height: '54px' }}
              >
                Reset Camera Position
              </button>
              <button
                onClick={() => router.push('/select')}
                className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%', height: '54px' }}
              >
                Exit to Selection
              </button>
            </div>

            {/* Collapsible Controls Section */}
            {showControls && (
              <div
                className="mt-6 p-4 space-y-6"
                style={{
                  backgroundColor: isDark ? 'rgba(60, 56, 54, 0.3)' : 'rgba(163, 177, 198, 0.2)',
                  borderRadius: '8px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {/* Orbit Mode Controls */}
                <div>
                  <h3
                    className="text-lg font-bold font-space-grotesk uppercase mb-3 flex items-center gap-2"
                    style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
                  >
                    <Scan className="w-5 h-5" style={{ color: '#D4AF37' }} />
                    Orbit Mode
                  </h3>
                  <div
                    className="space-y-2 text-sm font-space-grotesk"
                    style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                  >
                    <p>• Left Click + Drag: Rotate around scene</p>
                    <p>• Right Click + Drag: Pan camera</p>
                    <p>• Scroll: Zoom in/out</p>
                  </div>
                </div>

                {/* Walk Mode Controls */}
                <div>
                  <h3
                    className="text-lg font-bold font-space-grotesk uppercase mb-3 flex items-center gap-2"
                    style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
                  >
                    <PersonStanding className="w-5 h-5" style={{ color: '#D4AF37' }} />
                    Walk Mode
                  </h3>
                  <div
                    className="space-y-2 text-sm font-space-grotesk"
                    style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                  >
                    <p>• Click anywhere to lock pointer</p>
                    <p>• W: Move forward | S: Move backward</p>
                    <p>• A: Strafe right | D: Strafe left</p>
                    <p>• Mouse: Look around</p>
                    <p>• Q: Move up | E: Move down</p>
                    <p>• Space: Jump</p>
                    <p>• ESC: Unlock pointer / Pause</p>
                  </div>
                </div>

                {/* Fly Mode Controls */}
                <div>
                  <h3
                    className="text-lg font-bold font-space-grotesk uppercase mb-3 flex items-center gap-2"
                    style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
                  >
                    <Plane className="w-5 h-5" style={{ color: '#D4AF37' }} />
                    Fly Mode (Drone)
                  </h3>
                  <div
                    className="space-y-2 text-sm font-space-grotesk"
                    style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                  >
                    <p>• Click + Drag: Look around</p>
                    <p>• W: Move forward | S: Move backward</p>
                    <p>• A: Move left | D: Move right</p>
                    <p>• Shift: Fly up | Shift+S: Fly down</p>
                  </div>
                </div>
              </div>
            )}

            {/* ESC hint */}
            <p
              className="text-center text-xs font-space-grotesk mt-4"
              style={{ color: isDark ? '#6b7280' : '#8992A5' }}
            >
              Press ESC to resume
            </p>
          </div>
        </div>
      )}

      {/* Spawn Points Menu Overlay */}
      {showSpawnMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
          onClick={() => setShowSpawnMenu(false)}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-3xl font-bold font-space-grotesk uppercase mb-6 text-center"
              style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
            >
              Spawn Points
            </h2>

            <div className="space-y-4 mb-6">
              <p
                className="text-sm font-space-grotesk text-center"
                style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
              >
                Manage spawn points for your scene. Press Cmd+K or click the flag button to toggle this menu.
              </p>

              {/* Add Spawn Point Button */}
              <button
                onClick={() => {
                  setAddSpawnTrigger((prev) => prev + 1);
                  setShowSpawnMenu(false);
                }}
                className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%' }}
              >
                Add Spawn Point at Current Position
              </button>

              {/* List of Spawn Points */}
              {spawnPoints.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3
                    className="text-lg font-bold font-space-grotesk uppercase"
                    style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
                  >
                    Existing Spawn Points ({spawnPoints.length})
                  </h3>
                  {spawnPoints.map((spawn, index) => (
                    <div
                      key={spawn.id}
                      className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
                      style={{ padding: '1rem' }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p
                            className="font-space-grotesk font-bold"
                            style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
                          >
                            {spawn.name}
                          </p>
                          <p
                            className="text-xs font-space-grotesk"
                            style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                          >
                            Position: ({spawn.position[0].toFixed(1)}, {spawn.position[1].toFixed(1)}, {spawn.position[2].toFixed(1)})
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSpawnPoints(spawnPoints.filter(s => s.id !== spawn.id));
                          }}
                          className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                          style={{
                            height: '36px',
                            padding: '0 16px',
                            fontSize: '12px',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {spawnPoints.length === 0 && (
                <p
                  className="text-center text-sm font-space-grotesk py-8"
                  style={{ color: isDark ? '#6b7280' : '#8992A5' }}
                >
                  No spawn points yet. Add your first spawn point!
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSpawnMenu(false)}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{ width: '100%', height: '54px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

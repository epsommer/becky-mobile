"use client";
import { useEffect, useState, useRef } from "react";
import DebugPanel from "@/components/ui/DebugPanel";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { SceneManager } from "@/components/three/SceneManager";
import { MuseumLayout } from "@/components/three/MuseumLayout";
import { ArtworkManager } from "@/components/three/ArtworkManager";
import {
  CollisionDetector,
  CollisionInfo,
} from "@/components/three/CollisionDetector";
import { PlayerController } from "@/hooks/usePlayerController";
import { useRoomTracker } from "@/hooks/useRoomTracker";

export default function ThreeScene() {
  const [sceneReady, setSceneReady] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [moveSpeed, setMoveSpeed] = useState(0.1);
  const [jumpHeight, setJumpHeight] = useState(0.3);

  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 1.7, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
  });

  const [collisionInfo, setCollisionInfo] = useState<CollisionInfo>({
    isColliding: false,
    wallType: "",
    distance: 0,
  });

  // Edge rotation state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [edgeRotationActive, setEdgeRotationActive] = useState({
    left: false,
    right: false,
    top: false,
    bottom: false,
  });

  const sceneManagerRef = useRef<SceneManager | null>(null);
  const collisionDetectorRef = useRef<CollisionDetector | null>(null);
  const playerControllerRef = useRef<PlayerController | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const { currentRoom, getRoomDisplayName } = useRoomTracker({
    position: cameraInfo.position,
  });

  // Track mouse position for edge indicators
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });

      const threshold = 100;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      setEdgeRotationActive({
        left: event.clientX < threshold,
        right: event.clientX > screenWidth - threshold,
        top: event.clientY < threshold,
        bottom: event.clientY > screenHeight - threshold,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Initialize scene only once
  useEffect(() => {
    console.log("🏛️ Creating Simple Museum Layout...");

    // Create container
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.backgroundColor = "#000000";
    container.style.zIndex = "1";
    container.style.cursor = "crosshair";
    document.body.appendChild(container);

    // Initialize scene components
    const sceneManager = new SceneManager();
    sceneManagerRef.current = sceneManager;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const museumLayout = new MuseumLayout(sceneManager.scene);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const artworkManager = new ArtworkManager(sceneManager.scene);
    const collisionDetector = new CollisionDetector();
    collisionDetectorRef.current = collisionDetector;

    container.appendChild(sceneManager.renderer.domElement);

    // Set initial camera position
    sceneManager.camera.position.set(0, 1.7, 2);

    // Create player controller with initial values
    const playerController = new PlayerController({
      camera: sceneManager.camera,
      moveSpeed: 0.1, // Use initial value directly
      jumpHeight: 0.3, // Use initial value directly
      onPositionUpdate: (position, rotation) => {
        setCameraInfo({
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        });
      },
    });
    playerControllerRef.current = playerController;

    // Handle keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowDebug((prev) => !prev);
      } else if (event.key === "Tab") {
        event.preventDefault();
        setShowSettings((prev) => !prev);
      }
    };

    // Handle window resize
    const handleResize = () => {
      sceneManager.handleResize();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (
        !playerControllerRef.current ||
        !sceneManagerRef.current ||
        !collisionDetectorRef.current
      ) {
        return;
      }

      const previousPosition = sceneManager.camera.position.clone();

      // Update player controller
      playerControllerRef.current.update();

      // Check collision
      const newPosition = sceneManager.camera.position.clone();
      const collision =
        collisionDetectorRef.current.checkCollision(newPosition);

      if (collision.isColliding) {
        const clampedPosition =
          collisionDetectorRef.current.clampPosition(newPosition);
        if (
          Math.abs(clampedPosition.x - previousPosition.x) > 0.001 ||
          Math.abs(clampedPosition.z - previousPosition.z) > 0.001
        ) {
          sceneManager.camera.position.copy(clampedPosition);
        } else {
          sceneManager.camera.position.copy(previousPosition);
        }
      }

      setCollisionInfo(collision);

      sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
    };

    animate();
    setSceneReady(true);
    console.log("🏛️ Simple Museum with 360° Rotation Ready!");

    // Cleanup
    return () => {
      if (playerControllerRef.current) {
        playerControllerRef.current.dispose();
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      document.body.removeChild(container);
      sceneManager.dispose();
    };
  }, []); // Empty dependency array - only run once

  // Update player controller speeds when they change
  useEffect(() => {
    if (playerControllerRef.current && sceneReady) {
      playerControllerRef.current.setMoveSpeed(moveSpeed);
    }
  }, [moveSpeed, sceneReady]);

  useEffect(() => {
    if (playerControllerRef.current && sceneReady) {
      playerControllerRef.current.setJumpHeight(jumpHeight);
    }
  }, [jumpHeight, sceneReady]);

  // Pause player controls when settings menu is open
  useEffect(() => {
    if (playerControllerRef.current && sceneReady) {
      playerControllerRef.current.setPaused(showSettings);
    }
  }, [showSettings, sceneReady]);

  return (
    <>
      {/* Main Gallery UI */}
      <div
        className="gallery-ui fixed top-4 left-4 z-40 bg-tactical-gold text-white px-4 py-2 rounded-lg shadow-lg"
        style={{ zIndex: 100 }}
      >
        🏛️ {sceneReady ? "SIMPLE MUSEUM" : "Loading..."}
      </div>

      {/* Room Indicator */}
      <div
        className="gallery-ui fixed top-20 left-4 z-40 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm shadow-lg"
        style={{ zIndex: 100 }}
      >
        📍 {getRoomDisplayName(currentRoom)}
      </div>

      {/* Collision Warning */}
      {collisionInfo.isColliding && (
        <div
          className="gallery-ui fixed bottom-4 left-4 z-40 text-white p-3"
          style={{
            zIndex: 100,
            backgroundColor: "rgba(220, 38, 38, 0.9)",
            borderRadius: "8px",
            border: "1px solid #ef4444",
          }}
        >
          <p style={{ fontSize: "0.875rem", fontWeight: "bold" }}>
            🚧 {collisionInfo.wallType}
          </p>
        </div>
      )}

      {/* Edge Rotation Indicators */}
      {/* Left indicator */}
      <div
        className="fixed top-1/2 left-4 transform -translate-y-1/2 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: edgeRotationActive.left ? 0.6 : 0,
          zIndex: 90,
        }}
      >
        <div className="text-white text-5xl animate-pulse">◀</div>
      </div>

      {/* Right indicator */}
      <div
        className="fixed top-1/2 right-4 transform -translate-y-1/2 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: edgeRotationActive.right ? 0.6 : 0,
          zIndex: 90,
        }}
      >
        <div className="text-white text-5xl animate-pulse">▶</div>
      </div>

      {/* Top indicator */}
      <div
        className="fixed top-4 left-1/2 transform -translate-x-1/2 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: edgeRotationActive.top ? 0.6 : 0,
          zIndex: 90,
        }}
      >
        <div className="text-white text-5xl animate-pulse">▲</div>
      </div>

      {/* Bottom indicator */}
      <div
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: edgeRotationActive.bottom ? 0.6 : 0,
          zIndex: 90,
        }}
      >
        <div className="text-white text-5xl animate-pulse">▼</div>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        camera={cameraInfo}
        isVisible={showDebug}
        onToggle={() => setShowDebug(false)}
        moveSpeed={moveSpeed}
        jumpHeight={jumpHeight}
        onSpeedChange={setMoveSpeed}
        onJumpHeightChange={setJumpHeight}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isVisible={showSettings}
        onToggle={() => setShowSettings(false)}
      />
    </>
  );
}

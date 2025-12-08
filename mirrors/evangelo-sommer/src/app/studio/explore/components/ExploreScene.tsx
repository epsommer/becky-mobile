"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, PointerLockControls } from "@react-three/drei";
import { useStudioStore, SceneObject as SceneObjectType } from "../../hooks/useStudioStore";
import * as THREE from "three";

interface SpawnPoint {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  name: string;
}

interface ExploreSceneProps {
  isDark: boolean;
  cameraMode: 'orbit' | 'walk' | 'fly';
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
  resetCamera: number;
  addSpawnTrigger: number;
  spawnPoints: SpawnPoint[];
  onAddSpawnPoint: (position: [number, number, number], rotation: [number, number, number]) => void;
}

interface SceneObjectProps {
  obj: SceneObjectType;
}

interface SpawnPointMarkerProps {
  spawn: SpawnPoint;
}

function SpawnPointMarker({ spawn }: SpawnPointMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pulsing glow animation
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={spawn.position} rotation={spawn.rotation}>
      {/* Glowing sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#D4AF37"
          emissive="#D4AF37"
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      {/* Direction arrow */}
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color="#D4AF37"
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function SceneObject({ obj }: SceneObjectProps) {
  let geometry;
  switch (obj.type) {
    case 'cube':
      geometry = <boxGeometry args={[1, 1, 1]} />;
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[0.5, 32, 32]} />;
      break;
    case 'cylinder':
      geometry = <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      break;
    default:
      return null;
  }

  return (
    <mesh
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
    >
      {geometry}
      <meshStandardMaterial
        color={obj.color || '#D4AF37'}
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  );
}

interface WalkControlsProps {
  physicsSettings: {
    gravity: number;
    jumpForce: number;
    moveSpeed: number;
    collisionEnabled: boolean;
  };
  showDebug: boolean;
  addSpawnTrigger: number;
  onAddSpawnPoint: (position: [number, number, number], rotation: [number, number, number]) => void;
}

function WalkControls({ physicsSettings, showDebug, addSpawnTrigger, onAddSpawnPoint }: WalkControlsProps) {
  const { camera, gl, scene } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;

      // Jump on space bar
      if (e.key === ' ' && isGrounded.current) {
        velocity.current.y = physicsSettings.jumpForce;
        isGrounded.current = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [physicsSettings.jumpForce]);

  // Handle spawn point creation
  useEffect(() => {
    if (addSpawnTrigger > 0) {
      const position: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z
      ];
      const rotation: [number, number, number] = [
        camera.rotation.x,
        camera.rotation.y,
        camera.rotation.z
      ];
      onAddSpawnPoint(position, rotation);
    }
  }, [addSpawnTrigger, camera, onAddSpawnPoint]);

  useFrame((state, delta) => {
    const moveVector = new THREE.Vector3();

    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement horizontal
    direction.normalize();

    // Get camera right vector
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    // WASD movement
    if (keys.current['w']) moveVector.add(direction);
    if (keys.current['s']) moveVector.sub(direction);
    if (keys.current['a']) moveVector.add(right);  // Flipped: A moves right
    if (keys.current['d']) moveVector.sub(right);  // Flipped: D moves left

    // Q/E for up/down (free flight when not grounded or collision disabled)
    if (!physicsSettings.collisionEnabled) {
      if (keys.current['q']) moveVector.y += 1;
      if (keys.current['e']) moveVector.y -= 1;
    }

    // Apply horizontal movement
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(physicsSettings.moveSpeed * delta);
      const newPosition = camera.position.clone().add(moveVector);

      // Check collision if enabled
      if (physicsSettings.collisionEnabled) {
        const canMove = checkCollision(newPosition);
        if (canMove) {
          camera.position.add(moveVector);
        }
      } else {
        camera.position.add(moveVector);
      }
    }

    // Apply gravity and vertical physics
    if (physicsSettings.collisionEnabled) {
      velocity.current.y -= physicsSettings.gravity * delta;

      const newY = camera.position.y + velocity.current.y * delta;

      // Ground check with raycast
      raycaster.current.set(camera.position, new THREE.Vector3(0, -1, 0));
      const intersects = raycaster.current.intersectObjects(scene.children, true);

      const groundDistance = 1.6; // Eye level height
      const minHeight = groundDistance; // Never go below eye level above grid (y=0)

      if (intersects.length > 0 && intersects[0].distance < groundDistance + 0.1) {
        // On ground
        if (velocity.current.y < 0) {
          velocity.current.y = 0;
          isGrounded.current = true;
          camera.position.y = intersects[0].point.y + groundDistance;
        }
      } else {
        // In air - but never below minimum height
        camera.position.y = Math.max(newY, minHeight);
        isGrounded.current = false;
      }
    } else {
      // When collision is disabled, still enforce minimum height
      const minHeight = 1.6; // Eye level above grid
      camera.position.y = Math.max(camera.position.y, minHeight);
    }
  });

  const checkCollision = (newPosition: THREE.Vector3): boolean => {
    // Cast rays in multiple directions to check for collisions
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];

    for (const dir of directions) {
      raycaster.current.set(newPosition, dir);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      if (intersects.length > 0 && intersects[0].distance < 0.5) {
        return false; // Collision detected
      }
    }
    return true; // No collision
  };

  return <PointerLockControls />;
}

interface DroneControlsProps {
  addSpawnTrigger: number;
  onAddSpawnPoint: (position: [number, number, number], rotation: [number, number, number]) => void;
}

function DroneControls({ addSpawnTrigger, onAddSpawnPoint }: DroneControlsProps) {
  const { camera } = useThree();
  const moveSpeed = 5;
  const keys = useRef<{ [key: string]: boolean }>({});
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      // Rotate camera based on mouse movement
      camera.rotation.y -= deltaX * 0.002;
      camera.rotation.x -= deltaY * 0.002;

      // Clamp vertical rotation to prevent flipping
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera]);

  // Handle spawn point creation
  useEffect(() => {
    if (addSpawnTrigger > 0) {
      const position: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z
      ];
      const rotation: [number, number, number] = [
        camera.rotation.x,
        camera.rotation.y,
        camera.rotation.z
      ];
      onAddSpawnPoint(position, rotation);
    }
  }, [addSpawnTrigger, camera, onAddSpawnPoint]);

  useFrame((state, delta) => {
    const moveVector = new THREE.Vector3();

    // Get camera direction (forward)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // Keep forward movement horizontal
    direction.normalize();

    // Get camera right vector
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    // WASD movement (horizontal plane)
    if (keys.current['w']) moveVector.add(direction);
    if (keys.current['a']) moveVector.sub(right);
    if (keys.current['d']) moveVector.add(right);

    // S moves backward unless Shift is held
    if (keys.current['s'] && !keys.current['shift']) {
      moveVector.sub(direction);
    }

    // Shift+S for descending (fly down)
    if (keys.current['shift'] && keys.current['s']) {
      moveVector.y -= 1;
    }
    // Shift alone (without S) for ascending (fly up)
    else if (keys.current['shift']) {
      moveVector.y += 1;
    }

    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
      camera.position.add(moveVector);
    }
  });

  return null;
}

interface SceneProps {
  cameraMode: 'orbit' | 'walk' | 'fly';
  physicsSettings: {
    gravity: number;
    jumpForce: number;
    moveSpeed: number;
    collisionEnabled: boolean;
  };
  showDebug: boolean;
  addSpawnTrigger: number;
  spawnPoints: SpawnPoint[];
  onAddSpawnPoint: (position: [number, number, number], rotation: [number, number, number]) => void;
}

function Scene({ cameraMode, physicsSettings, showDebug, addSpawnTrigger, spawnPoints, onAddSpawnPoint }: SceneProps) {
  const objects = useStudioStore((state) => state.objects);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#444444"
        intensity={0.4}
        position={[0, 50, 0]}
      />

      {/* Grid Helper */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6C7587"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#D4AF37"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Render Objects */}
      {objects.map((obj) => (
        <SceneObject key={obj.id} obj={obj} />
      ))}

      {/* Render Spawn Points */}
      {spawnPoints.map((spawn) => (
        <SpawnPointMarker key={spawn.id} spawn={spawn} />
      ))}

      {/* Camera Controls based on mode */}
      {cameraMode === 'orbit' && <OrbitControls makeDefault />}
      {cameraMode === 'walk' && <WalkControls physicsSettings={physicsSettings} showDebug={showDebug} addSpawnTrigger={addSpawnTrigger} onAddSpawnPoint={onAddSpawnPoint} />}
      {cameraMode === 'fly' && <DroneControls addSpawnTrigger={addSpawnTrigger} onAddSpawnPoint={onAddSpawnPoint} />}
    </>
  );
}

export default function ExploreScene({ isDark, cameraMode, showDebug, setShowDebug, resetCamera, addSpawnTrigger, spawnPoints, onAddSpawnPoint }: ExploreSceneProps) {
  const objects = useStudioStore((state) => state.objects);
  const [physicsSettings, setPhysicsSettings] = useState({
    gravity: 9.8,
    jumpForce: 5,
    moveSpeed: 5,
    collisionEnabled: true,
  });
  const [key, setKey] = useState(0);

  // Set initial camera position based on mode
  const getCameraPosition = (): [number, number, number] => {
    switch (cameraMode) {
      case 'walk':
        return [0, 1.6, 5]; // Eye level height (1.6m)
      case 'fly':
        return [0, 5, 5];
      case 'orbit':
      default:
        return [5, 5, 5];
    }
  };

  // Reset camera when resetCamera changes
  useEffect(() => {
    if (resetCamera > 0) {
      setKey(prev => prev + 1);
    }
  }, [resetCamera]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        key={key}
        camera={{ position: getCameraPosition(), fov: 60 }}
        style={{
          background: isDark ? '#1c1917' : '#EBECF0',
        }}
      >
        <Scene cameraMode={cameraMode} physicsSettings={physicsSettings} showDebug={showDebug} addSpawnTrigger={addSpawnTrigger} spawnPoints={spawnPoints} onAddSpawnPoint={onAddSpawnPoint} />
      </Canvas>

      {/* Physics Debug Panel */}
      {showDebug && cameraMode === 'walk' && (
        <div
          className="absolute top-20 right-4 pointer-events-auto"
          style={{
            backgroundColor: isDark ? 'rgba(28, 25, 23, 0.95)' : 'rgba(235, 236, 240, 0.95)',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: isDark
              ? '4px 4px 8px rgba(0,0,0,0.3), -4px -4px 8px rgba(60,56,54,0.1)'
              : '4px 4px 8px rgba(163,177,198,0.6), -4px -4px 8px rgba(255,255,255,0.5)',
            minWidth: '250px',
          }}
        >
          <h3
            className="font-space-grotesk font-bold mb-3 text-sm uppercase"
            style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
          >
            Physics Debug
          </h3>

          <div className="space-y-3">
            {/* Gravity */}
            <div>
              <label
                className="block text-xs font-space-grotesk mb-1"
                style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
              >
                Gravity: {physicsSettings.gravity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={physicsSettings.gravity}
                onChange={(e) =>
                  setPhysicsSettings({ ...physicsSettings, gravity: parseFloat(e.target.value) })
                }
                className="w-full"
                style={{ accentColor: '#D4AF37' }}
              />
            </div>

            {/* Jump Force */}
            <div>
              <label
                className="block text-xs font-space-grotesk mb-1"
                style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
              >
                Jump Force: {physicsSettings.jumpForce.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={physicsSettings.jumpForce}
                onChange={(e) =>
                  setPhysicsSettings({ ...physicsSettings, jumpForce: parseFloat(e.target.value) })
                }
                className="w-full"
                style={{ accentColor: '#D4AF37' }}
              />
            </div>

            {/* Move Speed */}
            <div>
              <label
                className="block text-xs font-space-grotesk mb-1"
                style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
              >
                Move Speed: {physicsSettings.moveSpeed.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="0.1"
                value={physicsSettings.moveSpeed}
                onChange={(e) =>
                  setPhysicsSettings({ ...physicsSettings, moveSpeed: parseFloat(e.target.value) })
                }
                className="w-full"
                style={{ accentColor: '#D4AF37' }}
              />
            </div>

            {/* Collision Toggle */}
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-space-grotesk"
                style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
              >
                Collision Detection
              </label>
              <button
                onClick={() =>
                  setPhysicsSettings({
                    ...physicsSettings,
                    collisionEnabled: !physicsSettings.collisionEnabled,
                  })
                }
                className="px-3 py-1 text-xs rounded"
                style={{
                  backgroundColor: physicsSettings.collisionEnabled
                    ? '#D4AF37'
                    : isDark
                    ? '#374151'
                    : '#9ca3af',
                  color: physicsSettings.collisionEnabled ? '#1c1917' : '#ffffff',
                  fontWeight: 'bold',
                }}
              >
                {physicsSettings.collisionEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowDebug(false)}
              className="w-full mt-4 py-2 text-xs font-space-grotesk uppercase"
              style={{
                backgroundColor: isDark ? '#374151' : '#d1d9e6',
                color: isDark ? '#d1d5db' : '#6C7587',
                borderRadius: '4px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ESC Hint */}
      <div
        className="absolute bottom-4 left-4 text-xs font-space-grotesk pointer-events-none"
        style={{
          color: isDark ? '#9ca3af' : '#6C7587',
          textShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.8)'
            : '0 1px 3px rgba(255,255,255,0.8)',
        }}
      >
        <p>Press ESC for controls & menu</p>
      </div>

      {/* Object Count */}
      <div
        className="absolute bottom-4 right-4 text-xs font-space-grotesk pointer-events-none"
        style={{
          color: isDark ? '#9ca3af' : '#6C7587',
          textShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.8)'
            : '0 1px 3px rgba(255,255,255,0.8)',
        }}
      >
        <p>{objects.length} {objects.length === 1 ? 'Object' : 'Objects'}</p>
      </div>

      {/* Center Crosshair Cursor - Only show in Walk and Fly modes */}
      {(cameraMode === 'walk' || cameraMode === 'fly') && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative w-8 h-8">
            {/* Horizontal line */}
            <div
              className="absolute top-1/2 left-0 right-0 h-0.5 transform -translate-y-1/2"
              style={{
                background: isDark ? '#D4AF37' : '#D4AF37',
                opacity: 0.8,
              }}
            >
              {/* Center gap */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2"
                style={{
                  background: isDark ? '#1c1917' : '#EBECF0',
                }}
              />
            </div>
            {/* Vertical line */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-0.5 transform -translate-x-1/2"
              style={{
                background: isDark ? '#D4AF37' : '#D4AF37',
                opacity: 0.8,
              }}
            >
              {/* Center gap */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2"
                style={{
                  background: isDark ? '#1c1917' : '#EBECF0',
                }}
              />
            </div>
            {/* Center dot */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
              style={{
                background: isDark ? '#D4AF37' : '#D4AF37',
                opacity: 0.9,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

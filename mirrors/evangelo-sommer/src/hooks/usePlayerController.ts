import * as THREE from "three";

interface PlayerControllerOptions {
  camera: THREE.PerspectiveCamera;
  moveSpeed: number;
  jumpHeight: number;
  onPositionUpdate: (position: THREE.Vector3, rotation: THREE.Euler) => void;
}

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private moveSpeed: number;
  private jumpHeight: number;
  private paused: boolean = false;
  private onPositionUpdate: (
    position: THREE.Vector3,
    rotation: THREE.Euler,
  ) => void;

  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    rotateLeft: false,
    rotateRight: false,
  };

  private mouse = {
    yaw: 0,
    pitch: 0,
    previousX: 0,
    previousY: 0,
    isFirstMove: true,
  };

  private physics = {
    velocityY: 0,
    isOnGround: true,
    groundLevel: 1.7,
    gravity: -0.02,
  };

  // Edge rotation settings
  private edgeRotation = {
    enabled: true,
    threshold: 100, // Pixels from edge to start rotating
    maxSpeed: 0.02, // Maximum rotation speed
    deadZone: 50, // Pixels from edge where rotation is at max speed
    currentX: 0,
    currentY: 0,
  };

  constructor(options: PlayerControllerOptions) {
    this.camera = options.camera;
    this.moveSpeed = options.moveSpeed;
    this.jumpHeight = options.jumpHeight;
    this.onPositionUpdate = options.onPositionUpdate;

    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseleave", this.handleMouseLeave);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        this.keys.forward = true;
        event.preventDefault();
        break;
      case "KeyS":
      case "ArrowDown":
        this.keys.backward = true;
        event.preventDefault();
        break;
      case "KeyA":
      case "ArrowLeft":
        this.keys.left = true;
        event.preventDefault();
        break;
      case "KeyD":
      case "ArrowRight":
        this.keys.right = true;
        event.preventDefault();
        break;
      case "Space":
        this.keys.jump = true;
        event.preventDefault();
        break;
      case "KeyQ":
        this.keys.rotateLeft = true;
        event.preventDefault();
        break;
      case "KeyE":
        this.keys.rotateRight = true;
        event.preventDefault();
        break;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        this.keys.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        this.keys.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.keys.right = false;
        break;
      case "Space":
        this.keys.jump = false;
        break;
      case "KeyQ":
        this.keys.rotateLeft = false;
        break;
      case "KeyE":
        this.keys.rotateRight = false;
        break;
    }
  };

  private handleMouseMove = (event: MouseEvent) => {
    // Update edge rotation position
    this.edgeRotation.currentX = event.clientX;
    this.edgeRotation.currentY = event.clientY;

    // Original mouse movement code
    if (this.mouse.isFirstMove) {
      this.mouse.previousX = event.clientX;
      this.mouse.previousY = event.clientY;
      this.mouse.isFirstMove = false;
      return;
    }

    const deltaX = event.clientX - this.mouse.previousX;
    const deltaY = event.clientY - this.mouse.previousY;
    const sensitivity = 0.002;

    this.mouse.yaw -= deltaX * sensitivity;
    this.mouse.pitch -= deltaY * sensitivity;
    this.mouse.pitch = Math.max(
      -Math.PI / 2.2,
      Math.min(Math.PI / 2.2, this.mouse.pitch),
    );

    this.mouse.previousX = event.clientX;
    this.mouse.previousY = event.clientY;
  };

  private handleMouseLeave = () => {
    this.mouse.isFirstMove = true;
    // Reset edge rotation when mouse leaves
    this.edgeRotation.currentX = window.innerWidth / 2;
    this.edgeRotation.currentY = window.innerHeight / 2;
  };

  private calculateEdgeRotation() {
    if (!this.edgeRotation.enabled) return { yaw: 0, pitch: 0 };

    const { threshold, maxSpeed, deadZone, currentX, currentY } =
      this.edgeRotation;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let yawSpeed = 0;
    let pitchSpeed = 0;

    // Left edge
    if (currentX < threshold) {
      const distance = currentX;
      const intensity =
        1 - Math.max(0, distance - deadZone) / (threshold - deadZone);
      yawSpeed = intensity * maxSpeed;
    }
    // Right edge
    else if (currentX > screenWidth - threshold) {
      const distance = screenWidth - currentX;
      const intensity =
        1 - Math.max(0, distance - deadZone) / (threshold - deadZone);
      yawSpeed = -intensity * maxSpeed;
    }

    // Top edge
    if (currentY < threshold) {
      const distance = currentY;
      const intensity =
        1 - Math.max(0, distance - deadZone) / (threshold - deadZone);
      pitchSpeed = intensity * maxSpeed * 0.5; // Reduced pitch speed
    }
    // Bottom edge
    else if (currentY > screenHeight - threshold) {
      const distance = screenHeight - currentY;
      const intensity =
        1 - Math.max(0, distance - deadZone) / (threshold - deadZone);
      pitchSpeed = -intensity * maxSpeed * 0.5; // Reduced pitch speed
    }

    return { yaw: yawSpeed, pitch: pitchSpeed };
  }

  update() {
    // Skip update if paused
    if (this.paused) return;

    const rotationSpeed = 0.03;

    // Calculate edge rotation
    const edgeRot = this.calculateEdgeRotation();

    // Handle keyboard rotation
    if (this.keys.rotateLeft) this.mouse.yaw += rotationSpeed;
    if (this.keys.rotateRight) this.mouse.yaw -= rotationSpeed;

    // Apply edge rotation
    this.mouse.yaw += edgeRot.yaw;
    this.mouse.pitch += edgeRot.pitch;

    // Clamp pitch
    this.mouse.pitch = Math.max(
      -Math.PI / 2.2,
      Math.min(Math.PI / 2.2, this.mouse.pitch),
    );

    // Apply rotation to camera
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.mouse.yaw;
    this.camera.rotation.x = this.mouse.pitch;

    // Handle movement
    const direction = new THREE.Vector3();

    if (this.keys.forward) direction.z -= this.moveSpeed;
    if (this.keys.backward) direction.z += this.moveSpeed;
    if (this.keys.left) direction.x -= this.moveSpeed;
    if (this.keys.right) direction.x += this.moveSpeed;

    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.mouse.yaw,
    );
    direction.applyQuaternion(yawQuaternion);

    this.camera.position.add(direction);

    // Jump physics
    if (this.keys.jump && this.physics.isOnGround) {
      this.physics.velocityY = this.jumpHeight;
      this.physics.isOnGround = false;
    }

    if (!this.physics.isOnGround) {
      this.physics.velocityY += this.physics.gravity;
      this.camera.position.y += this.physics.velocityY;

      if (this.camera.position.y <= this.physics.groundLevel) {
        this.camera.position.y = this.physics.groundLevel;
        this.physics.velocityY = 0;
        this.physics.isOnGround = true;
      }
    } else {
      this.camera.position.y = this.physics.groundLevel;
    }

    this.onPositionUpdate(this.camera.position, this.camera.rotation);
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = speed;
  }

  setJumpHeight(height: number) {
    this.jumpHeight = height;
  }

  // New methods for edge rotation control
  setEdgeRotationEnabled(enabled: boolean) {
    this.edgeRotation.enabled = enabled;
  }

  setEdgeRotationThreshold(threshold: number) {
    this.edgeRotation.threshold = threshold;
  }

  setEdgeRotationSpeed(speed: number) {
    this.edgeRotation.maxSpeed = speed;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    // Reset all keys when pausing to prevent stuck movement
    if (paused) {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.jump = false;
      this.keys.rotateLeft = false;
      this.keys.rotateRight = false;
    }
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseleave", this.handleMouseLeave);
  }
}
